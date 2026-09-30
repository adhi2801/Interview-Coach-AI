import React, { useState } from "react";
import api from "../lib/api";
import AuthShell, { Field, FormError, SubmitButton, TextLink, inputClass } from "../components/app/AuthShell";

export default function ForgotPassword({ onBackToLogin, onBackToHome }) {
  const [email, setEmail] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSentMessage(res.data.message);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <AuthShell
      title={sentMessage ? "Check your email" : "Reset your password"}
      intro={sentMessage ? null : "Enter the email you signed up with and we'll send a link to choose a new password."}
      onBackToHome={onBackToHome}
      footer={<>Remembered it? <TextLink onClick={onBackToLogin}>Back to log in</TextLink></>}
    >
      {sentMessage ? (
        <div role="status" className="space-y-3 text-[15px] leading-relaxed text-white/75">
          <p>{sentMessage}</p>
          <p className="text-white/55">Nothing after a few minutes? Check spam, or <TextLink onClick={() => setSentMessage("")}>try another email</TextLink>.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field id="forgot-email" label="Email">
            <input id="forgot-email" type="email" required autoComplete="email" autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={inputClass} />
          </Field>
          <FormError>{error}</FormError>
          <SubmitButton loading={loading} loadingText="Sending…">Send the reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
