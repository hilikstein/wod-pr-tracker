"use client";
import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { site } from "@/lib/site";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const done = () => {
    router.replace("/");
    router.refresh();
  };

  const withPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/api/auth/login", "POST", { username, password });
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
      const options = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/auth/passkey/login/options", "POST", {});
      const response = await startAuthentication({ optionsJSON: options });
      await api("/api/auth/passkey/login/verify", "POST", response);
      done();
    } catch (error) {
      const message = (error as Error).message;
      setErr(message === "unknown passkey" ? "This passkey is not registered here. Sign in with your password, then add it under Me." : message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form className="flex flex-col gap-3" onSubmit={withPassword}>
        <input className="input" name="username" autoComplete="username" autoCapitalize="none" placeholder="Username or email" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className="input" name="password" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-primary text-lg" disabled={busy}>{busy ? "..." : "Sign in"}</button>
      </form>
      {site.passkeys && (
        <button className="btn-ghost" onClick={withPasskey} disabled={busy}>Sign in with a passkey</button>
      )}
      {err && <p className="text-sm text-bad" role="alert">{err}</p>}
    </div>
  );
}
