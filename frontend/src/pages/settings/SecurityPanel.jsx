// Password change and "sign out everywhere". Both revoke every earlier
// login token on the server; a password change keeps this device signed in
// with the fresh token it returns.

import { useState } from "react";
import { Check, Key, LogOut } from "lucide-react";
import api, { saveAuth } from "../../lib/api";

const inputClass =
  "w-full bg-[#0a0a10]/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none " +
  "focus:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/50 shadow-inner";
const labelClass = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 font-mono";

export default function SecurityPanel({ Card, onLogout }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const mismatch = form.confirm.length > 0 && form.next !== form.confirm;
  const canSubmit = form.current && form.next && form.next === form.confirm && status.state !== "saving";

  async function changePassword(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ state: "saving", message: "" });
    try {
      const res = await api.post("/auth/change-password", {
        current_password: form.current, new_password: form.next,
      });
      saveAuth(res.data.access_token, res.data.user);
      setForm({ current: "", next: "", confirm: "" });
      setStatus({ state: "saved", message: "Password changed. Other devices have been signed out." });
    } catch (err) {
      setStatus({ state: "error", message: err.message });
    }
  }

  async function signOutEverywhere() {
    setSignOutError("");
    try {
      await api.post("/auth/logout-all");
      onLogout();
    } catch (err) {
      setSignOutError(err.message);
    }
  }

  return (
    <>
      <Card className="p-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2 font-mono">
          <Key size={16} className="text-indigo-400" aria-hidden="true" /> Change Password
        </h3>
        <form onSubmit={changePassword} className="space-y-4 max-w-md" noValidate>
          <div>
            <label htmlFor="current-password" className={labelClass}>Current password</label>
            <input id="current-password" type="password" autoComplete="current-password"
              value={form.current} onChange={update("current")} className={inputClass} />
          </div>
          <div>
            <label htmlFor="new-password" className={labelClass}>New password</label>
            <input id="new-password" type="password" autoComplete="new-password" aria-describedby="new-password-hint"
              value={form.next} onChange={update("next")} className={inputClass} />
            <p id="new-password-hint" className="text-[11px] text-slate-500 mt-1.5">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className={labelClass}>Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password"
              aria-invalid={mismatch} aria-describedby={mismatch ? "confirm-password-error" : undefined}
              value={form.confirm} onChange={update("confirm")} className={inputClass} />
            {mismatch && <p id="confirm-password-error" className="text-[11px] text-rose-400 mt-1.5">Passwords don't match.</p>}
          </div>

          <div role="status" aria-live="polite">
            {status.state === "error" && <p className="text-xs font-semibold text-rose-400">{status.message}</p>}
            {status.state === "saved" && (
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Check size={13} aria-hidden="true" /> {status.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={!canSubmit}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {status.state === "saving" ? "Changing…" : "Change password"}
          </button>
        </form>
      </Card>

      <Card className="p-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2 font-mono">
          <LogOut size={16} className="text-indigo-400" aria-hidden="true" /> Sessions
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white mb-1">Sign out everywhere</p>
            <p className="text-xs text-slate-400">Ends every login on every device, including this one. Use it if you signed in on a shared computer.</p>
            {signOutError && <p role="alert" className="text-xs font-semibold text-rose-400 mt-2">{signOutError}</p>}
          </div>
          {confirmingSignOut ? (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirmingSignOut(false)}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/[0.05]">
                Cancel
              </button>
              <button onClick={signOutEverywhere}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400">
                Yes, sign out everywhere
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmingSignOut(true)}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-bold hover:bg-white/10">
              <LogOut size={14} aria-hidden="true" /> Sign out everywhere
            </button>
          )}
        </div>
      </Card>
    </>
  );
}
