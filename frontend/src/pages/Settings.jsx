// Settings, as one page of sections: profile, how interviews behave, the
// microphone, password and sign-in, and deleting the account. Every control
// here changes something real; nothing is decorative.

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LogOut, Mic, Pencil, Square, X } from "lucide-react";
import api from "../lib/api";
import { AppHeader, Frame, PageIntro } from "../components/app/AppChrome";
import { PREFERENCE_DEFAULTS, readMicDevice, updatePreferenceCache, writeMicDevice } from "../lib/preferences";
import SecurityPanel from "./settings/SecurityPanel";

const SECTIONS = [
  ["profile", "Profile"], ["interviews", "Interviews"], ["microphone", "Microphone"],
  ["security", "Password and sign-in"], ["delete", "Delete account"],
];

const PREFERENCES = [
  { key: "live_coaching_telemetry", label: "Live coaching", description: "Show confidence, pace and filler words while you answer. Scoring is the same either way." },
  { key: "high_contrast_editor", label: "High-contrast code editor", description: "Use a high-contrast theme in the coding room." },
];

function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-b border-white/[0.08] px-5 py-9 last:border-b-0 md:px-8">
      <h2 id={`${id}-title`} className="mb-5 text-[18px] font-semibold tracking-[-0.01em] text-white">{title}</h2>
      {children}
    </section>
  );
}

// SecurityPanel renders its parts as cards; inside this page they're plain blocks.
function Block({ children }) {
  return <div className="mb-8 last:mb-0">{children}</div>;
}

function Switch({ checked, onChange, label, description, state }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <p className="text-[14.5px] text-white">{label}</p>
        <p className="mt-0.5 max-w-lg text-[13px] leading-relaxed text-white/60">{description}</p>
        {state === "error" && <p role="alert" className="mt-1 text-[12.5px] text-rose-300">Couldn't save that. Try again.</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
        className={`relative mt-0.5 h-6 w-11 shrink-0 border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${
          checked ? "border-indigo-300 bg-indigo-400/30" : "border-white/25 bg-white/[0.04]"}`}>
        <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 transition-[left] ${checked ? "left-[22px] bg-indigo-200" : "left-[3px] bg-white/60"}`} />
      </button>
    </div>
  );
}

function Profile({ profile, onRename, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState("idle");

  async function save(e) {
    e.preventDefault();
    const name = draft.trim();
    if (!name || name === profile.name) { setEditing(false); return; }
    setState("saving");
    try {
      await onRename(name);
      setEditing(false);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <dl className="grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="text-[12.5px] text-white/55">Name</dt>
          <dd className="mt-1">
            {editing ? (
              <form onSubmit={save} className="flex items-center gap-2">
                <label className="sr-only" htmlFor="name-input">Name</label>
                <input id="name-input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={100}
                  className="w-56 border border-white/15 bg-[#07070b] px-3 py-1.5 text-[14.5px] text-white focus:border-indigo-400 focus:outline-none" />
                <button type="submit" aria-label="Save name" disabled={state === "saving"} className="p-1.5 text-emerald-300 hover:text-emerald-200"><Check size={16} /></button>
                <button type="button" aria-label="Cancel editing name" onClick={() => setEditing(false)} className="p-1.5 text-white/60 hover:text-white"><X size={16} /></button>
              </form>
            ) : (
              <span className="flex items-center gap-2 text-[15px] text-white">
                {profile.name}
                <button type="button" aria-label="Edit name" onClick={() => { setDraft(profile.name); setEditing(true); setState("idle"); }}
                  className="p-1 text-white/55 hover:text-white"><Pencil size={13} /></button>
              </span>
            )}
            {state === "saved" && <span role="status" className="mt-1 block text-[12.5px] text-emerald-300">Saved.</span>}
            {state === "error" && <span role="alert" className="mt-1 block text-[12.5px] text-rose-300">Couldn't save your name. Try again.</span>}
          </dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-white/55">Email</dt>
          <dd className="mt-1 text-[15px] text-white">{profile.email}<span className="block text-[12.5px] text-white/50">You sign in with this.</span></dd>
        </div>
      </dl>
      <p className="mt-6 text-[14px] leading-relaxed text-white/70">
        Rating <span className="font-mono tabular-nums text-white">{Math.round(profile.elo_rating).toLocaleString("en-US")}</span>
        {" "}across {profile.total_sessions} {profile.total_sessions === 1 ? "interview" : "interviews"}
        {profile.avg_score != null && <>, averaging <span className="font-mono tabular-nums text-white">{profile.avg_score.toFixed(1)}</span> out of 10</>}.
        {profile.bracket && <> Your latest role, {profile.bracket.role}, has a {profile.bracket.label.replace(" Band", "")} band of {profile.bracket.low}–{profile.bracket.high}.</>}
      </p>
      <button type="button" onClick={onLogout} className="mt-6 flex items-center gap-2 border border-white/15 px-4 py-2 text-[13.5px] text-white hover:bg-white/[0.06]">
        <LogOut size={14} aria-hidden="true" /> Log out of this device
      </button>
    </>
  );
}

function Microphone() {
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
        setLevel(Math.min(1, peak / 90));
        frameRef.current = requestAnimationFrame(tick);
      };
      tick();
      setTesting(true);
    } catch {
      setError("Microphone access was blocked or the device isn't available. Allow it in your browser and try again.");
    }
  }

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

function DeleteAccount({ onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });

  async function remove() {
    setState({ busy: true, error: "" });
    try {
      await api.delete("/user/me");
      onDeleted();
    } catch (err) {
      setState({ busy: false, error: err.message || "Couldn't delete the account. Try again." });
    }
  }

  return (
    <>
      <p className="max-w-xl text-[14px] leading-relaxed text-white/70">
        Deletes your account, every interview and coding submission, your answers and your rating history. This can't be undone.
      </p>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="mt-5 border border-rose-400/40 px-4 py-2 text-[13.5px] text-rose-200 hover:bg-rose-500/10">
          Delete my account
        </button>
      ) : (
        <div className="mt-5 max-w-md">
          <label className="block text-[13px] text-white/70" htmlFor="confirm-delete">Type <span className="font-mono text-white">delete</span> to confirm</label>
          <input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
            className="mt-1.5 w-full border border-white/15 bg-[#07070b] px-3 py-2 text-[14px] text-white focus:border-rose-400 focus:outline-none" />
          {state.error && <p role="alert" className="mt-2 text-[13px] text-rose-300">{state.error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => { setConfirming(false); setTyped(""); }} className="border border-white/15 px-4 py-2 text-[13.5px] text-white hover:bg-white/[0.06]">Cancel</button>
            <button type="button" onClick={remove} disabled={typed.trim().toLowerCase() !== "delete" || state.busy}
              className="bg-rose-600 px-4 py-2 text-[13.5px] font-medium text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
              {state.busy ? "Deleting…" : "Delete everything"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Settings({ onLogout, onGoBack, onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [prefs, setPrefs] = useState(PREFERENCE_DEFAULTS);
  const [prefState, setPrefState] = useState({});

  const load = useCallback(() => {
    setError("");
    api.get("/user/profile-summary")
      .then((r) => { setProfile(r.data); setPrefs({ ...PREFERENCE_DEFAULTS, ...(r.data.preferences || {}) }); })
      .catch((err) => setError(err.message || "Couldn't load your settings."));
  }, []);
  useEffect(load, [load]);

  async function rename(name) {
    await api.patch("/user/profile", { name });
    setProfile((p) => ({ ...p, name }));
    onProfileUpdate?.({ name });
  }

  async function toggle(key) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    setPrefState((s) => ({ ...s, [key]: "saving" }));
    try {
      await api.patch("/user/preferences", { key, value: next });
      updatePreferenceCache(key, next);
      setPrefState((s) => ({ ...s, [key]: null }));
    } catch {
      setPrefs((p) => ({ ...p, [key]: !next }));
      setPrefState((s) => ({ ...s, [key]: "error" }));
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-transparent font-sans text-slate-200">
      <AppHeader back={{ label: "Overview", onClick: onGoBack }} />
      <PageIntro index="06" label="Settings" title="Your account." subtitle="Your profile, how interviews behave, your microphone, sign-in, and your data." />

      <Frame className="flex-1" innerClassName="border-b border-white/[0.08]">
        <div className="grid lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="hidden border-r border-white/[0.08] lg:block">
            <ul className="sticky top-16 py-8">
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className={`block px-6 py-2 text-[14px] hover:text-white ${id === "delete" ? "text-rose-200/80" : "text-white/65"}`}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            {error ? (
              <div className="px-5 py-16 md:px-8">
                <p className="text-[15px] text-white/80">{error}</p>
                <button type="button" onClick={load} className="mt-4 border border-white/15 px-4 py-2 text-[13.5px] text-white hover:bg-white/[0.06]">Try again</button>
              </div>
            ) : !profile ? (
              <div aria-busy="true" aria-label="Loading your settings" className="space-y-px p-8">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse bg-white/[0.03]" />)}</div>
            ) : (
              <>
                <Section id="profile" title="Profile"><Profile profile={profile} onRename={rename} onLogout={onLogout} /></Section>
                <Section id="interviews" title="Interviews">
                  <div className="divide-y divide-white/[0.06]">
                    {PREFERENCES.map((p) => (
                      <Switch key={p.key} label={p.label} description={p.description} checked={prefs[p.key] !== false && !!prefs[p.key]}
                        state={prefState[p.key]} onChange={() => toggle(p.key)} />
                    ))}
                  </div>
                </Section>
                <Section id="microphone" title="Microphone"><Microphone /></Section>
                <Section id="security" title="Password and sign-in"><SecurityPanel Card={Block} onLogout={onLogout} /></Section>
                <Section id="delete" title="Delete account"><DeleteAccount onDeleted={onLogout} /></Section>
              </>
            )}
          </div>
        </div>
      </Frame>
    </div>
  );
}
