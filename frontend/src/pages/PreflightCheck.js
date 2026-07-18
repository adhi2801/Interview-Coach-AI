import { useState, useRef, useEffect } from "react";

export default function PreflightCheck({ onReady, onSkip }) {
  const [micStatus, setMicStatus] = useState("checking"); // checking | granted | denied
  const [audioLevel, setAudioLevel] = useState(0);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    checkMicrophone();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicStatus("granted");

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      monitorLevel();
    } catch (err) {
      setMicStatus("denied");
    }
  }

  function monitorLevel() {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function update() {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));
      animationRef.current = requestAnimationFrame(update);
    }
    update();
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-5 font-sans">
      <div className="w-[460px] max-w-full p-10 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <p className="text-blue-500 text-[11px] font-bold uppercase tracking-widest mb-2">Before you begin</p>
        <h1 className="text-slate-100 text-2xl font-bold mb-1.5 tracking-tight">Let's check your setup</h1>
        <p className="text-zinc-400 text-sm mb-7 leading-relaxed">
          A quick check ensures your interview session runs smoothly.
        </p>

        <div className="flex justify-between items-center py-3.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full ${
                micStatus === "granted" ? "bg-emerald-400" :
                micStatus === "denied" ? "bg-red-400" : "bg-yellow-400"
              }`}
            />
            <span className="text-zinc-200 text-sm font-semibold">Microphone</span>
          </div>
          <span className="text-zinc-500 text-[13px]">
            {micStatus === "checking" && "Requesting access..."}
            {micStatus === "granted" && "Connected"}
            {micStatus === "denied" && "Access denied"}
          </span>
        </div>

        {micStatus === "granted" && (
          <div className="mt-4 mb-2">
            <p className="text-zinc-500 text-xs mb-2">Speak normally to test your input level</p>
            <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ${
                  audioLevel > 60 ? "bg-yellow-400" : "bg-blue-600"
                }`}
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        )}

        {micStatus === "denied" && (
          <div className="bg-red-400/[0.06] border border-red-400/[0.15] rounded-lg px-3.5 py-3 mt-4">
            <p className="text-red-300 text-[13px] leading-relaxed">
              Microphone access was not granted. You can still type your answers,
              or enable microphone access in your browser settings and refresh.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-7">
          <button
            onClick={onSkip}
            className="flex-1 py-3 bg-transparent text-zinc-500 border border-white/10 rounded-xl text-[13px] font-semibold transition-transform active:scale-95"
          >
            Skip and type answers
          </button>
          <button
            onClick={onReady}
            disabled={micStatus === "checking"}
            className={`flex-[1.5] py-3 rounded-xl text-sm font-bold transition-transform active:scale-95 ${
              micStatus === "granted"
                ? "bg-blue-600 text-white cursor-pointer"
                : "bg-white/[0.06] text-zinc-600 cursor-not-allowed"
            }`}
          >
            Continue to interview →
          </button>
        </div>
      </div>
    </div>
  );
}