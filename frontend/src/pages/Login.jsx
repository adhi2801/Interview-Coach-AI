import React, { useEffect, useState } from "react";
import api, { saveAuth } from "../lib/api";
import { AuthLayout, Field, FormError } from "../components/AuthLayout";
import { Button, Spinner } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBERED_EMAIL_KEY = "ic_remembered_email";

function readRememberedEmail() {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export default function Login({ onAuth, onSwitchToSignup, onBackToHome }) {
  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(readRememberedEmail()));
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Focus the first empty field — the password if the email was remembered.
    const target = document.querySelector(email ? 'input[type="password"]' : 'input[type="email"]');
    target?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emailError = emailTouched && email && !EMAIL_RE.test(email) ? "Enter an email address like name@example.com." : "";

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setEmailTouched(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      saveAuth(res.data.access_token, res.data.user);
      try {
        if (rememberMe) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        /* non-fatal */
      }
      onAuth(res.data.user);
    } catch (err) {
      // err.message is the server's own reason ("Invalid email or password",
      // "Too many requests...") or a clear network message from lib/api.
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in to InterviewCoach"
      subtitle="Pick up where you left off."
      onBackToHome={onBackToHome}
      footer={
        <>
          New here?{" "}
          <button onClick={onSwitchToSignup} className="text-accent hover:text-accent-hover hover:underline underline-offset-4">
            Create an account
          </button>
        </>
      }
    >
      <form onSubmit={handleLogin} noValidate className="space-y-5">
        <FormError message={error} />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          error={emailError}
        />
        <Field
          label="Password"
          reveal
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyUp={(e) => setCapsLockOn(e.getModifierState?.("CapsLock"))}
          hint={capsLockOn ? "Caps Lock is on." : ""}
        />
        <label className="flex cursor-pointer items-center gap-3 text-callout text-label-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded accent-[#2997FF]"
          />
          Remember my email on this device
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" label="Signing in" /> : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
