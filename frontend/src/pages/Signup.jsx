import React, { useState } from "react";
import { Link } from "react-router-dom";
import api, { saveAuth } from "../lib/api";
import AuthShell, { Field, FormError, PasswordInput, SubmitButton, TextLink, inputClass } from "../components/app/AuthShell";

// Must match auth.py MIN_PASSWORD_LENGTH — the only rule the server enforces.
const MIN_PASSWORD = 8;

export default function Signup({ onAuth, onSwitchToLogin, onBackToHome }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const shortBy = password.length > 0 && password.length < MIN_PASSWORD ? MIN_PASSWORD - password.length : 0;

  async function handleSignup(e) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", { name, email, password });
      saveAuth(res.data.access_token, res.data.user);
      onAuth(res.data.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      intro="Free. Your first interview or coding problem sets your starting rating."
      onBackToHome={onBackToHome}
      footer={<>Already have an account? <TextLink onClick={onSwitchToLogin}>Log in</TextLink></>}
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <Field id="signup-name" label="Name">
          <input id="signup-name" type="text" required autoComplete="name" autoFocus maxLength={100}
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className={inputClass} />
        </Field>
        <Field id="signup-email" label="Email">
          <input id="signup-email" type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" className={inputClass} />
        </Field>
        <Field id="signup-password" label="Password"
          hint={shortBy ? `${shortBy} more ${shortBy === 1 ? "character" : "characters"} to go.` : `At least ${MIN_PASSWORD} characters.`}>
          <PasswordInput id="signup-password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="signup-password-hint" />
        </Field>
        <FormError>{error}</FormError>
        <SubmitButton loading={loading} loadingText="Creating your account…">Create account</SubmitButton>
        <p className="text-[13px] leading-relaxed text-white/55">
          By creating an account you agree to the <Link to="/terms" className="text-white/80 underline underline-offset-2">terms</Link> and
          the <Link to="/privacy" className="text-white/80 underline underline-offset-2">privacy policy</Link>. You can delete the account and all its data at any time.
        </p>
      </form>
    </AuthShell>
  );
}
