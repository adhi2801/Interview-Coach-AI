// Microphone recording plus a live waveform driven by the real mic signal.
//
// Always releases the microphone: on stop, and on unmount — previously,
// leaving the page mid-recording left the recorder and mic stream running
// (and the browser's recording indicator lit).

import { useCallback, useEffect, useRef, useState } from "react";

const BARS = 16;
const IDLE_LEVELS = Array(BARS).fill(2);

export function useRecorder({ onRecording } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [waveLevels, setWaveLevels] = useState(IDLE_LEVELS);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const frameRef = useRef(null);
  const onRecordingRef = useRef(onRecording);
  useEffect(() => { onRecordingRef.current = onRecording; });

  const releaseMic = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    setIsRecording(false);
    setWaveLevels(IDLE_LEVELS);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // onstop delivers the recording, then releases the mic
    } else {
      releaseMic();
    }
  }, [releaseMic]);

  const start = useCallback(async () => {
    setError("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone access was blocked. Allow it in your browser to answer by voice.");
      return;
    }
    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size > 2000) blob.arrayBuffer().then((buffer) => onRecordingRef.current?.(buffer));
      releaseMic();
    };
    recorder.start();
    setIsRecording(true);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.floor(data.length / BARS) || 1;
    const render = () => {
      analyser.getByteFrequencyData(data);
      setWaveLevels(Array.from({ length: BARS }, (_, i) => Math.max(2, Math.min(20, ((data[i * step] || 0) / 255) * 20))));
      frameRef.current = requestAnimationFrame(render);
    };
    render();
  }, [releaseMic]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null; // unmounting: discard, don't deliver
      recorder.stop();
    }
    releaseMic();
  }, [releaseMic]);

  return { isRecording, waveLevels, error, start, stop };
}
