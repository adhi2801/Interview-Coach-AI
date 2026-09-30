// frontend/src/components/app/MicrophoneCheck.jsx
//
// Pick the microphone for voice answers (saved on this device) and watch a
// live input level. Used in Settings and on the mic check before an
// interview. Nothing is recorded: the level comes straight from an
// AnalyserNode, and the stream is released on stop and on unmount.

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { readMicDevice, writeMicDevice } from "../../lib/preferences";

export default function MicrophoneCheck({ autoStart = false, onHeard }) {
  const [devices, setDevices] = useState(null);
  const [deviceId, setDeviceId] = useState(readMicDevice());
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  const streamRef = useRef(null), ctxRef = useRef(null), frameRef = useRef(null);

  const listDevices = useCallback(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === "audioinput")))
      .catch(() => setDevices([]));
  }, []);
  useEffect(listDevices, [listDevices]);

  const stop = useCallback(() => {
    setTesting(false);
    setLevel(0);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (ctxRef.current && ctxRef.current.state !== "closed") ctxRef.current.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stop, [stop]);
  // The caller learns once the mic has picked up speech-level sound.
  const heardRef = useRef(false);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia(deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true });
      streamRef.current = stream;
      listDevices(); // names appear once permission is granted
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        const next = Math.min(1, peak / 90);
        setLevel(next);
        if (next > 0.25 && !heardRef.current) { heardRef.current = true; onHeard?.(); }
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
      setTesting(true);
    } catch {
      setError("Microphone access was blocked or the device isn't available. Allow it in your browser and try again.");
    }
  }

  // Started once on mount when asked (the mic check page); Settings waits
  // for a click, since opening Settings shouldn't prompt for the mic.
  const startRef = useRef(start);
  startRef.current = start;
  useEffect(() => { if (autoStart) startRef.current(); }, [autoStart]);

  function choose(id) {
    setDeviceId(id);
    writeMicDevice(id);
    if (testing) stop();
  }

  return (
    <>
      <label className="block">
        <span className="text-[13px] text-white/60">Microphone for voice answers (saved on this device)</span>
        <select value={deviceId} onChange={(e) => choose(e.target.value)}
          className="mt-1.5 block w-full max-w-md border border-white/15 bg-[#07070b] px-3 py-2.5 text-[14px] text-white focus:border-indigo-400 focus:outline-none">
          <option value="">Browser default</option>
          {(devices || []).filter((d) => d.deviceId).map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>
          ))}
        </select>
      </label>
      {devices?.some((d) => !d.label) && <p className="mt-1.5 text-[12.5px] text-white/50">Names appear after you allow microphone access, for example by testing it.</p>}
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={testing ? stop : start}
          className="flex items-center gap-2 border border-white/15 px-4 py-2 text-[13.5px] text-white hover:bg-white/[0.06]">
          {testing ? <><Square size={12} aria-hidden="true" /> Stop test</> : <><Mic size={13} aria-hidden="true" /> Test microphone</>}
        </button>
        <div className="h-[6px] w-56 bg-white/[0.07]" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
          <div className="h-full bg-emerald-400 transition-[width] duration-75" style={{ width: `${level * 100}%` }} />
        </div>
      </div>
      <p className="mt-2 text-[12.5px] text-white/50">{testing ? "Speak and the bar should move." : "Nothing is recorded during a test."}</p>
      {error && <p role="alert" className="mt-2 text-[13px] text-rose-300">{error}</p>}
    </>
  );
}
