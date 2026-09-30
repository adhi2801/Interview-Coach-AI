import React, { useState } from "react";
import api, { saveAuth } from "../lib/api";
import { readSetting, writeSetting } from "../lib/storage";
import AuthShell, { Field, FormError, PasswordInput, SubmitButton, TextLink, inputClass } from "../components/app/AuthShell";

const REMEMBERED_EMAIL_KEY = "ic_remembered_email";

export default function Login({ onAuth, onSwitchToSignup, onForgotPassword, onBackToHome }) {
  const remembered = readSetting(REMEMBERED_EMAIL_KEY, "");
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(remembered));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      saveAuth(res.data.access_token, res.data.user);
      writeSetting(REMEMBERED_EMAIL_KEY, rememberMe ? email : null);
      onAuth(res.data.user);
    } catch (err) {
      // The server's own reason ("Invalid email or password", "Too many
      // requests…") or a clear network message from lib/api.
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Log in"
      intro="Your rating, your gaps and every past interview are waiting."
      onBackToHome={onBackToHome}
      footer={<>New here? <TextLink onClick={onSwitchToSignup}>Create an account</TextLink></>}
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <Field id="login-email" label="Email">
          <input id="login-email" type="email" required autoComplete="email" autoFocus={!remembered}
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={inputClass} />
        </Field>
        <div>
          <Field id="login-password" label="Password">
            <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus={Boolean(remembered)} />
          </Field>
          {onForgotPassword && (
            <p className="mt-2 text-[14px]"><TextLink onClick={onForgotPassword}>Forgot your password?</TextLink></p>
          )}
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2.5 text-[14px] text-white/70">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 accent-indigo-400" />
          Remember my email on this device
        </label>
        <FormError>{error}</FormError>
        <SubmitButton loading={loading} loadingText="Logging in…">Log in</SubmitButton>
      </form>
    </AuthShell>
  );
}
