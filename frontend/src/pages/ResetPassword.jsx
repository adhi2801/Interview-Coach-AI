import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { saveAuth } from "../lib/api";
import AuthShell, { Field, FormError, PasswordInput, SubmitButton, TextLink } from "../components/app/AuthShell";

const MIN_PASSWORD = 8;

// The emailed link carries its token in the URL fragment, which browsers
// never send to a server or in a Referer header. Read once, then removed
// from the address bar so it doesn't linger in history.
function takeTokenFromUrl() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
  if (token) window.history.replaceState(null, "", window.location.pathname);
  return token;
}

export default function ResetPassword({ onAuth, onForgotPassword, onBackToHome }) {
  const [token] = useState(takeTokenFromUrl);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/reset-password", { token, new_password: password });
      saveAuth(res.data.access_token, res.data.user);
      // Leave this page first: once logged in, the signed-in routes would
      // otherwise mount it again, without the (already consumed) token.
      navigate("/", { replace: true });
      onAuth(res.data.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="This link isn't complete" onBackToHome={onBackToHome}
        footer={<TextLink onClick={onForgotPassword}>Ask for a new reset link</TextLink>}>
        <p className="text-[15px] leading-relaxed text-white/70">Open the link from the email exactly as it was sent. If it has expired, ask for a new one; each link works once, for 30 minutes.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      intro="This signs you out on every other device, then logs you in here."
      onBackToHome={onBackToHome}
      footer={<>Link expired? <TextLink onClick={onForgotPassword}>Ask for a new one</TextLink></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="reset-password" label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
          <PasswordInput id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="reset-password-hint" autoFocus />
        </Field>
        <Field id="reset-confirm" label="Confirm new password">
          <PasswordInput id="reset-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        <FormError>{error}</FormError>
        <SubmitButton loading={loading} loadingText="Saving…">Save and log in</SubmitButton>
      </form>
    </AuthShell>
  );
}
