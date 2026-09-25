import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import api, { saveAuth } from "../lib/api";
import { AuthLayout, Field, FormError } from "../components/AuthLayout";
import { Button, Spinner } from "../components/ui";
import { cn } from "../lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Must match auth.py MIN_PASSWORD_LENGTH — the server is the real check.
const MIN_PASSWORD_LENGTH = 8;

export default function Signup({ onAuth, onSwitchToLogin, onBackToHome, onNavigatePrivacy, onNavigateTerms }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    formRef.current?.querySelector("input")?.focus();
  }, []);

  const lengthOk = password.length >= MIN_PASSWORD_LENGTH;
  const emailError = emailTouched && email && !EMAIL_RE.test(email) ? "Enter an email address like name@example.com." : "";

  async function handleSignup(e) {
    e.preventDefault();
    if (!name.trim() || !email || !password) {
      setError("Fill in your name, email, and a password.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setEmailTouched(true);
      return;
    }
    if (!lengthOk) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", { name: name.trim(), email, password });
      saveAuth(res.data.access_token, res.data.user);
      onAuth(res.data.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free. Your first interview takes about five minutes."
      onBackToHome={onBackToHome}
      footer={
        <>
          Already have an account?{" "}
          <button onClick={onSwitchToLogin} className="text-accent hover:text-accent-hover hover:underline underline-offset-4">
            Sign in
          </button>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleSignup} noValidate className="space-y-5">
        <FormError message={error} />
        <Field label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          error={emailError}
        />
        <div>
          <Field
            label="Password"
            reveal
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={(e) => setCapsLockOn(e.getModifierState?.("CapsLock"))}
            hint={capsLockOn ? "Caps Lock is on." : ""}
            maxLength={128}
          />
          <p className={cn("mt-2 flex items-center gap-1.5 text-footnote transition-colors", lengthOk ? "text-positive" : "text-label-3")}>
            <Check size={14} aria-hidden="true" className={lengthOk ? "opacity-100" : "opacity-40"} />
            At least {MIN_PASSWORD_LENGTH} characters
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" label="Creating account" /> : "Create account"}
        </Button>
        {(onNavigatePrivacy || onNavigateTerms) && (
          <p className="text-center text-footnote text-label-3">
            By creating an account you agree to the{" "}
            <button type="button" onClick={onNavigateTerms} className="underline underline-offset-2 hover:text-label">Terms</button>
            {" "}and{" "}
            <button type="button" onClick={onNavigatePrivacy} className="underline underline-offset-2 hover:text-label">Privacy Policy</button>.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
