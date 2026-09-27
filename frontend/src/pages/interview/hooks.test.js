// The interview room's two stateful hooks, with the browser APIs faked:
// a scripted WebSocket, and a fake microphone/MediaRecorder/AudioContext.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({
  coachingSocketUrl: vi.fn(async (id) => `ws://test/ws/coaching/${id}?ticket=t`),
}));

import { coachingSocketUrl } from "../../lib/api";
import { useCoachingSocket } from "./useCoachingSocket";
import { useRecorder } from "./useRecorder";

// ---------- fake WebSocket ----------

class FakeSocket {
  static OPEN = 1;
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeSocket.instances.push(this);
  }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.(); }
  receive(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
  drop(code) { this.readyState = 3; this.onclose?.({ code }); }
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe("useCoachingSocket", () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.useFakeTimers();
    coachingSocketUrl.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("connects with a ticket URL and reports coaching updates", async () => {
    const { result } = renderHook(() => useCoachingSocket(7));
    await flush();
    const ws = FakeSocket.instances[0];
    expect(ws.url).toBe("ws://test/ws/coaching/7?ticket=t");

    act(() => ws.open());
    expect(result.current.connected).toBe(true);

    act(() => ws.receive({ type: "coaching_update", filler_count: 2, confidence_score: 7 }));
    expect(result.current.coaching.filler_count).toBe(2);
  });

  it("reset clears local state and tells the server", async () => {
    const { result } = renderHook(() => useCoachingSocket(7));
    await flush();
    const ws = FakeSocket.instances[0];
    act(() => ws.open());
    act(() => ws.receive({ type: "coaching_update", filler_count: 4, intervention: "Breathe." }));

    act(() => result.current.reset());
    expect(result.current.coaching).toBeNull();
    expect(result.current.intervention).toBeNull();
    expect(JSON.parse(ws.sent.at(-1))).toEqual({ type: "reset" });
  });

  it("a newer intervention restarts the timer instead of being cut short", async () => {
    const { result } = renderHook(() => useCoachingSocket(7));
    await flush();
    const ws = FakeSocket.instances[0];
    act(() => ws.open());

    act(() => ws.receive({ type: "coaching_update", intervention: "First" }));
    act(() => vi.advanceTimersByTime(5000));
    act(() => ws.receive({ type: "coaching_update", intervention: "Second" }));
    act(() => vi.advanceTimersByTime(2000)); // 7s after the first, 2s after the second
    expect(result.current.intervention).toBe("Second");
    act(() => vi.advanceTimersByTime(4500));
    expect(result.current.intervention).toBeNull();
  });

  it("reconnects with a fresh ticket after a drop, but not after a refusal", async () => {
    renderHook(() => useCoachingSocket(7));
    await flush();
    act(() => FakeSocket.instances[0].drop(1006));
    await act(async () => { vi.advanceTimersByTime(2000); });
    await flush();
    expect(FakeSocket.instances).toHaveLength(2);
    expect(coachingSocketUrl).toHaveBeenCalledTimes(2);

    act(() => FakeSocket.instances[1].drop(1008)); // server refused this session
    await act(async () => { vi.advanceTimersByTime(60000); });
    await flush();
    expect(FakeSocket.instances).toHaveLength(2);
  });

  it("passes transcriptions to the caller", async () => {
    const onTranscription = vi.fn();
    renderHook(() => useCoachingSocket(7, { onTranscription }));
    await flush();
    const ws = FakeSocket.instances[0];
    act(() => ws.open());
    act(() => ws.receive({ type: "transcription", text: "hello there" }));
    expect(onTranscription).toHaveBeenCalledWith("hello there");
  });
});

// ---------- fake microphone ----------

function installFakeMic() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] };
  const recorders = [];
  class FakeRecorder {
    static isTypeSupported() { return true; }
    constructor() { this.state = "inactive"; recorders.push(this); }
    start() { this.state = "recording"; }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["x".repeat(3000)]) });
      this.onstop?.();
    }
  }
  class FakeAudioContext {
    constructor() { this.state = "running"; }
    createAnalyser() { return { fftSize: 0, frequencyBinCount: 32, getByteFrequencyData() {} }; }
    createMediaStreamSource() { return { connect() {} }; }
    close() { this.state = "closed"; }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true, value: { getUserMedia: vi.fn(async () => stream) },
  });
  return { track, recorders };
}

describe("useRecorder", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("delivers the recording and releases the mic on stop", async () => {
    const { track } = installFakeMic();
    const onRecording = vi.fn();
    const { result } = renderHook(() => useRecorder({ onRecording }));

    await act(async () => { await result.current.start(); });
    expect(result.current.isRecording).toBe(true);

    await act(async () => { result.current.stop(); await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.isRecording).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    expect(onRecording).toHaveBeenCalledTimes(1);
  });

  it("releases the mic if the page unmounts mid-recording", async () => {
    const { track } = installFakeMic();
    const onRecording = vi.fn();
    const { result, unmount } = renderHook(() => useRecorder({ onRecording }));
    await act(async () => { await result.current.start(); });

    unmount();
    expect(track.stop).toHaveBeenCalled();
    expect(onRecording).not.toHaveBeenCalled(); // discarded, not sent after leaving
  });

  it("explains a blocked microphone instead of failing silently", async () => {
    installFakeMic();
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useRecorder());
    await act(async () => { await result.current.start(); });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toMatch(/Microphone access was blocked/);
  });
});
