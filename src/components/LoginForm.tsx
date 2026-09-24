"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Wordmark } from "./Wordmark";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ ok: false, text: translate(error.message) });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMessage({ ok: false, text: translate(error.message) });
      else if (!data.session)
        setMessage({ ok: true, text: "Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link in deinem Postfach." });
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Wordmark />
          <p className="mt-3 text-muted">Europäisches Portugiesisch – Schritt für Schritt.</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <h1 className="font-serif text-xl">{mode === "login" ? "Anmelden" : "Konto erstellen"}</h1>
          <label className="block space-y-1">
            <span className="text-sm text-muted">E-Mail</span>
            <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Passwort</span>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && (
            <p className={`rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{message.text}</p>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Anmelden" : "Registrieren"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-ink"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage(null);
            }}
          >
            {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon registriert? Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

function translate(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-Mail oder Passwort ist falsch.";
  if (/email not confirmed/i.test(msg)) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (/already registered/i.test(msg)) return "Diese E-Mail ist schon registriert.";
  if (/password should be at least/i.test(msg)) return "Das Passwort muss mindestens 6 Zeichen haben.";
  return msg;
}
