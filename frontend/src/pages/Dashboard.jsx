// Interview setup: three decisions — company, level, interviewer — and a
// brief of what that company's interview is like, then start. Choices are
// remembered for next time. Any company works: known ones have a built-in
// profile, others get one generated on the server.

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Quote } from "lucide-react";
import api from "../lib/api";
import { readSetting, writeSetting } from "../lib/storage";
import { AppHeader, Frame, PageIntro } from "../components/app/AppChrome";
import { COMPANIES } from "../constants/companies";
import { humanize } from "./knowledge/graph";

// Ordered by seniority (the rating band each is scored against). The ids
// are the role names the backend stores and bands are keyed by; the two
// without a level in their name say where they sit.
const ROLES = [
  "Software Engineer — L3",
  "Senior Engineer — L4", "Backend Engineer — L4", "Frontend Engineer — L4",
  "ML Engineer", "Staff Engineer — L5", "Systems Architect",
];
const LEVEL_NOTE = { "ML Engineer": "between L4 and L5", "Systems Architect": "staff level and above" };

const PERSONAS = [
  { id: "standard", label: "Standard", blurb: "Neutral and evaluative, closest to a real interview loop." },
  { id: "hostile", label: "Hostile", blurb: "Pushes back on every assumption to test how you hold up under pressure." },
  { id: "socratic", label: "Socratic", blurb: "Answers with questions that lead you toward the approach." },
  { id: "exhausted", label: "Exhausted", blurb: "Low energy, wants it short. Tests whether you can carry the room." },
];

const KNOWN = new Set(COMPANIES.map((c) => c.id));
const OTHER = "__other__";
const titleCase = (s = "") => s.replace(/\b\w/g, (c) => c.toUpperCase());

function Fieldset({ legend, hint, children }) {
  return (
    <fieldset className="border-b border-white/[0.08] px-5 py-7 last:border-b-0 md:px-8">
      <legend className="float-left mb-1 w-full text-[15px] font-semibold text-white">{legend}</legend>
      {hint && <p className="clear-both mb-4 text-[13px] text-white/55">{hint}</p>}
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

// A native radio, visually a selectable row: keyboard arrows, focus and
// screen-reader semantics come for free.
function Choice({ name, value, checked, onChange, children, className = "" }) {
  return (
    <label className={`group relative flex cursor-pointer items-start gap-3 border px-3.5 py-3 transition-colors ${
      checked ? "border-indigo-300/70 bg-indigo-400/[0.07]" : "border-white/[0.09] hover:border-white/25"} ${className}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)}
        className="peer sr-only" />
      <span aria-hidden="true" className={`mt-[3px] grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border ${checked ? "border-indigo-300" : "border-white/35"}`}>
        {checked && <span className="h-[7px] w-[7px] rounded-full bg-indigo-300" />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden outline outline-1 outline-offset-2 outline-indigo-300 peer-focus-visible:block" />
    </label>
  );
}

function bandNote(band, elo) {
  if (!band) return null;
  if (elo < band.low) return `${band.low - elo} below this band`;
  if (elo > band.high) return `${elo - band.high} above this band`;
  return "You're in this band";
}

function Brief({ name, profile, loading, error, record, gap, preview, previewState, onPreview }) {
  return (
    <div className="px-5 py-7 md:px-8">
      <p className="text-[13px] text-white/55">What to expect</p>
      <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-white">{name || "Your company"}</h2>

      {loading ? (
        <div aria-busy="true" aria-label="Loading the company profile" className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse bg-white/[0.03]" />)}
        </div>
      ) : error ? (
        <p className="mt-4 text-[14px] text-white/65">{error}</p>
      ) : profile && (
        <dl className="mt-5 space-y-5 text-[14px]">
          {profile.typical_rounds && (
            <div><dt className="text-[12.5px] text-white/50">Typical loop</dt><dd className="mt-0.5 text-white/90">{profile.typical_rounds}</dd></div>
          )}
          {profile.question_style && (
            <div><dt className="text-[12.5px] text-white/50">How they ask</dt><dd className="mt-0.5 text-white/90">{profile.question_style}</dd></div>
          )}
          {(profile.green_flags?.length > 0 || profile.red_flags?.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.green_flags?.length > 0 && (
                <div>
                  <dt className="text-[12.5px] text-emerald-200/90">They reward</dt>
                  <dd><ul className="mt-1 space-y-1 text-white/85">{profile.green_flags.map((f) => <li key={f}>{f}</li>)}</ul></dd>
                </div>
              )}
              {profile.red_flags?.length > 0 && (
                <div>
                  <dt className="text-[12.5px] text-rose-200/90">They push back on</dt>
                  <dd><ul className="mt-1 space-y-1 text-white/85">{profile.red_flags.map((f) => <li key={f}>{f}</li>)}</ul></dd>
                </div>
              )}
            </div>
          )}
          {typeof profile.difficulty_bias === "number" && profile.difficulty_bias !== 1 && (
            <div>
              <dt className="text-[12.5px] text-white/50">Difficulty</dt>
              <dd className="mt-0.5 text-white/90">
                Questions run {profile.difficulty_bias > 1 ? "harder" : "easier"} than average ({profile.difficulty_bias}×).
              </dd>
            </div>
          )}
        </dl>
      )}

      {(record.length > 0 || gap) && (
        <div className="mt-7 border-t border-white/[0.08] pt-5 text-[14px] leading-relaxed text-white/75">
          {record.length > 0 && (
            <p>
              Your last {record.length === 1 ? "interview" : `${record.length} interviews`} here scored{" "}
              {record.map((s, i) => (
                <span key={s.id}>
                  <span className="font-mono tabular-nums text-white">{s.score != null ? s.score.toFixed(1) : "–"}</span>
                  {i < record.length - 2 ? ", " : i === record.length - 2 ? " and " : ""}
                </span>
              ))}.
            </p>
          )}
          {gap && <p className="mt-1">Your most urgent gap for them is <span className="text-amber-200">{humanize(gap)}</span>.</p>}
        </div>
      )}

      <div className="mt-7 border-t border-white/[0.08] pt-5">
        {preview ? (
          <figure>
            <figcaption className="text-[12.5px] text-white/50">The interview will open with</figcaption>
            <blockquote className="mt-2 flex gap-2.5 text-[15px] leading-relaxed text-white">
              <Quote size={14} aria-hidden="true" className="mt-1 shrink-0 text-indigo-300" />
              {preview.question}
            </blockquote>
          </figure>
        ) : (
          <>
            <button type="button" onClick={onPreview} disabled={previewState === "loading"}
              className="border border-white/15 px-4 py-2 text-[13.5px] font-medium text-white hover:bg-white/[0.06] disabled:opacity-50">
              {previewState === "loading" ? "Writing the question…" : "Preview the first question"}
            </button>
            <p className="mt-2 text-[12.5px] text-white/50">
              {previewState === "error" ? "Couldn't write a preview. Starting still works." : "Optional. If you start afterwards, the interview opens with the same question."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ onStart, user, onGoBack }) {
  const [companyChoice, setCompanyChoice] = useState(() => {
    const saved = readSetting("ic_last_company", "google");
    return KNOWN.has(saved) ? saved : OTHER;
  });
  const [customCompany, setCustomCompany] = useState(() => {
    const saved = readSetting("ic_last_company", "");
    return KNOWN.has(saved) ? "" : saved;
  });
  const [role, setRole] = useState(() => {
    const saved = readSetting("ic_last_role");
    return ROLES.includes(saved) ? saved : ROLES[1];
  });
  const [persona, setPersona] = useState(() => {
    const saved = readSetting("ic_last_persona");
    return PERSONAS.some((p) => p.id === saved) ? saved : "standard";
  });

  const company = companyChoice === OTHER ? customCompany.trim().toLowerCase() : companyChoice;
  const [profile, setProfile] = useState({ data: null, loading: true, error: "" });
  const [bands, setBands] = useState({});
  const [record, setRecord] = useState([]);
  const [gap, setGap] = useState(null);
  const [preview, setPreview] = useState({ data: null, state: "idle" });
  const [launch, setLaunch] = useState({ state: "idle", error: "" });
  const customRef = useRef(null);
  const elo = Math.round(user?.elo_rating ?? 1200);

  useEffect(() => {
    if (company) writeSetting("ic_last_company", company);
    writeSetting("ic_last_role", role);
    writeSetting("ic_last_persona", persona);
  }, [company, role, persona]);

  useEffect(() => { api.get("/roles/elo-bands").then((r) => setBands(r.data || {})).catch(() => setBands({})); }, []);

  // Profile: immediate for known companies; debounced while typing another.
  useEffect(() => {
    if (!company || company.length < 2) {
      setProfile({ data: null, loading: false, error: "" });
      return undefined;
    }
    let cancelled = false;
    setProfile((p) => ({ ...p, loading: true, error: "" }));
    const timer = setTimeout(() => {
      api.get(`/companies/${encodeURIComponent(company)}/profile`)
        .then((r) => !cancelled && setProfile({ data: r.data, loading: false, error: "" }))
        .catch((err) => !cancelled && setProfile({ data: null, loading: false, error: err.message }));
    }, KNOWN.has(company) ? 0 : 700);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [company]);

  useEffect(() => {
    if (!company) return undefined;
    let cancelled = false;
    Promise.all([api.get("/user/sessions"), api.get("/user/gap-queue", { params: { company } })])
      .then(([s, g]) => {
        if (cancelled) return;
        setRecord((s.data?.sessions || []).filter((x) => (x.company_target || "").toLowerCase() === company).slice(0, 3));
        setGap(g.data?.queue?.[0]?.gap || null);
      })
      .catch(() => { if (!cancelled) { setRecord([]); setGap(null); } });
    return () => { cancelled = true; };
  }, [company]);

  // A preview belongs to exactly one combination of choices.
  useEffect(() => { setPreview({ data: null, state: "idle" }); }, [company, role, persona]);

  const displayName = useMemo(() => {
    if (!company) return "";
    return COMPANIES.find((c) => c.id === company)?.name || profile.data?.name || titleCase(company);
  }, [company, profile.data]);
  const personaLabel = PERSONAS.find((p) => p.id === persona)?.label;
  const ready = company.length >= 2;

  async function loadPreview() {
    setPreview({ data: null, state: "loading" });
    try {
      const res = await api.post("/session/preview", { user_name: user?.name || "Candidate", company, role, elo, persona });
      setPreview({ data: res.data, state: "done" });
    } catch {
      setPreview({ data: null, state: "error" });
    }
  }

  async function start() {
    if (!ready || launch.state === "starting") return;
    setLaunch({ state: "starting", error: "" });
    try {
      const res = await api.post("/session/start", {
        user_name: user?.name || "Candidate", company, role, elo, persona, preview_id: preview.data?.preview_id || null,
      });
      onStart?.({ ...res.data, company, role, persona, elo });
    } catch (err) {
      setLaunch({ state: "idle", error: err.message || "Couldn't start the interview. Try again." });
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-transparent font-sans text-slate-200 selection:bg-indigo-500/40">
      <AppHeader back={{ label: "Overview", onClick: onGoBack }} />

      <PageIntro
        title="Set up an interview"
        subtitle="Pick the company, the level and who's across the table. Your rating sets the difficulty; each answer is scored as you go."
      />

      <Frame className="flex-1" innerClassName="border-b border-white/[0.08]">
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <form onSubmit={(e) => { e.preventDefault(); start(); }} className="border-b border-white/[0.08] lg:border-b-0 lg:border-r">
            <Fieldset legend="Company" hint="Known companies use a built-in profile; any other name gets one written for it.">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {COMPANIES.map((c) => (
                  <Choice key={c.id} name="company" value={c.id} checked={companyChoice === c.id} onChange={setCompanyChoice}>
                    <span className="flex items-center gap-2 text-[14px] text-white">
                      <span className="grid h-4 w-4 place-items-center">{c.logo}</span>{c.name}
                    </span>
                  </Choice>
                ))}
                <Choice name="company" value={OTHER} checked={companyChoice === OTHER}
                  onChange={(v) => { setCompanyChoice(v); requestAnimationFrame(() => customRef.current?.focus()); }}>
                  <span className="text-[14px] text-white">Another</span>
                </Choice>
              </div>
              {companyChoice === OTHER && (
                <label className="mt-3 block">
                  <span className="text-[12.5px] text-white/55">Company name</span>
                  <input ref={customRef} value={customCompany} onChange={(e) => setCustomCompany(e.target.value)} maxLength={50}
                    placeholder="e.g. Stripe" autoComplete="off"
                    className="mt-1 w-full border border-white/15 bg-[#07070b] px-3 py-2.5 text-[14px] text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none sm:w-80" />
                </label>
              )}
            </Fieldset>

            <Fieldset legend="Role and level" hint={`Your rating is ${elo.toLocaleString("en-US")}. Each role is scored against its level's band; pick the one you're interviewing for.`}>
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((r) => {
                  const band = bands[r];
                  return (
                    <Choice key={r} name="role" value={r} checked={role === r} onChange={setRole}>
                      <span className="block text-[14px] text-white">{r}</span>
                      {band && (
                        <span className="mt-0.5 block text-[12.5px] text-white/55">
                          <span className="tabular-nums">{band.low.toLocaleString("en-US")}–{band.high.toLocaleString("en-US")}</span>
                          {LEVEL_NOTE[r] && <>, {LEVEL_NOTE[r]}</>}. {bandNote(band, elo)}
                        </span>
                      )}
                    </Choice>
                  );
                })}
              </div>
            </Fieldset>

            <Fieldset legend="Interviewer">
              <div className="grid gap-2 sm:grid-cols-2">
                {PERSONAS.map((p) => (
                  <Choice key={p.id} name="persona" value={p.id} checked={persona === p.id} onChange={setPersona}>
                    <span className="block text-[14px] text-white">{p.label}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-white/55">{p.blurb}</span>
                  </Choice>
                ))}
              </div>
            </Fieldset>
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>

          <aside aria-label="Company brief" className="lg:sticky lg:top-16 lg:self-start">
            <Brief name={displayName} profile={profile.data} loading={profile.loading} error={profile.error}
              record={record} gap={gap} preview={preview.data} previewState={preview.state}
              onPreview={ready ? loadPreview : undefined} />
          </aside>
        </div>
      </Frame>

      <div className="sticky bottom-0 z-30 border-t border-white/[0.1] bg-[#050507]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="min-w-0 text-[14px]" aria-live="polite">
            {launch.error ? (
              <p role="alert" className="text-rose-300">{launch.error}</p>
            ) : launch.state === "starting" ? (
              <p className="text-white/70">Writing your first question. This takes a few seconds.</p>
            ) : (
              <p className="truncate text-white/80">
                {ready ? <>{displayName}, {role}, {personaLabel?.toLowerCase()} interviewer</> : "Enter a company name to continue."}
              </p>
            )}
          </div>
          <button type="button" onClick={start} disabled={!ready || launch.state === "starting"}
            className="btn-liquid flex shrink-0 items-center justify-center gap-2 px-6 py-3 text-[14.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            <Play size={14} aria-hidden="true" />
            {launch.state === "starting" ? "Starting…" : "Start interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
