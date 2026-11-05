"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { site } from "@/lib/site";

// Redeems an invite: a signup invite creates the account, a recovery invite re-opens an existing one.
export function InviteForm({ token, kind, username: fixedUsername }: { token: string; kind: "signup" | "recovery"; username: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const signup = kind === "signup";

  const done = () => {
    router.replace("/");
    router.refresh();
  };

  const withPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setErr("The two passwords differ.");
    setBusy(true);
    setErr(null);
    try {
      await api("/api/auth/invite/password", "POST", { token, username, password });
      done();
    } catch (error) {
      setErr((error as Error).message);
      setBusy(false);
    }
  };

  const withPasskey = async () => {
    setBusy(true);
    setErr(null);
    try {
      const options = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/auth/invite/passkey/options", "POST", { token, username });
      const response = await startRegistration({ optionsJSON: options });
      await api("/api/auth/invite/passkey/verify", "POST", { token, response });
      done();
    } catch (error) {
      setErr((error as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form className="flex flex-col gap-3" onSubmit={withPassword}>
        {signup ? (
          <input className="input" name="username" autoComplete="username" autoCapitalize="none" placeholder="Choose a username (an email works)" value={username} onChange={(e) => setUsername(e.target.value)} required />
        ) : (
          <p className="lede">Account: <strong>{fixedUsername}</strong></p>
        )}
        <input className="input" name="new-password" type="password" autoComplete="new-password" placeholder="Password (10+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="input" name="confirm-password" type="password" autoComplete="new-password" placeholder="Repeat the password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <button className="btn-primary text-lg" disabled={busy}>{busy ? "..." : signup ? "Create account" : "Set new password"}</button>
      </form>
      {site.passkeys && (
        <button className="btn-ghost" onClick={withPasskey} disabled={busy || (signup && !username)}>
          {signup ? "Or create the account with a passkey" : "Or add a new passkey"}
        </button>
      )}
      {err && <p className="text-sm text-bad" role="alert">{err}</p>}
    </div>
  );
}
