"use client";

import { useEffect, useState } from "react";
import { saveSettings } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { canRecognize, canRecord, canSpeak, getPortugueseVoice, hasEuropeanVoice, hasRecordedAudio, setSpeechRate, speak } from "@/lib/speech";
import { useApp } from "./AppProvider";

const GOALS = [
  { xp: 10, label: "Locker", hint: "ca. 5 Min." },
  { xp: 30, label: "Normal", hint: "ca. 15 Min." },
  { xp: 50, label: "Ernsthaft", hint: "ca. 25 Min." },
  { xp: 80, label: "Intensiv", hint: "ca. 40 Min." },
];

export function SettingsForm() {
  const { session, settings, setSettingsLocal } = useApp();
  const [status, setStatus] = useState<string | null>(null);
  const [voice, setVoice] = useState<{ name: string; european: boolean } | null>(null);
  const [support, setSupport] = useState({ speak: true, recognize: true, record: true });

  useEffect(() => {
    const read = () => {
      const v = getPortugueseVoice();
      setVoice(v ? { name: `${v.name} (${v.lang})`, european: hasEuropeanVoice() } : null);
    };
    const t0 = setTimeout(() => {
      read();
      setSupport({ speak: canSpeak(), recognize: canRecognize(), record: canRecord() });
    }, 0);
    const t1 = setTimeout(read, 500);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, []);

  async function update(patch: Partial<typeof settings>) {
    const next = { ...settings, ...patch };
    setSettingsLocal(next);
    setStatus("Speichere …");
    try {
      await saveSettings(session!.user.id, next);
      setStatus("Gespeichert");
    } catch (e) {
      setStatus(`Fehler: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl">Einstellungen</h1>
        {status && <span className="text-sm text-muted">{status}</span>}
      </div>

      <section className="card p-6">
        <h2 className="font-medium">Tagesziel</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GOALS.map((g) => (
            <button
              key={g.xp}
              className="option text-center"
              data-state={settings.daily_goal_xp === g.xp ? "selected" : "idle"}
              onClick={() => update({ daily_goal_xp: g.xp })}
            >
              <span className="block font-medium">{g.label}</span>
              <span className="block text-xs text-muted">
                {g.xp} XP · {g.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-medium">Aussprache</h2>
        <label className="mt-4 block">
          <span className="flex justify-between text-sm text-muted">
            <span>Sprechtempo</span>
            <span className="tabular-nums">{settings.speech_rate.toFixed(2)}×</span>
          </span>
          <input
            type="range"
            min={0.6}
            max={1.2}
            step={0.05}
            value={settings.speech_rate}
            className="mt-2 w-full accent-[var(--accent)]"
            onChange={(e) => {
              const rate = Number(e.target.value);
              setSettingsLocal({ ...settings, speech_rate: rate });
              setSpeechRate(rate);
            }}
            onPointerUp={() => {
              void update({ speech_rate: settings.speech_rate });
              speak("Olá! Bom dia, como estás?");
            }}
          />
        </label>
        <button className="btn-ghost mt-4" onClick={() => speak("Olá! Bom dia, como estás?")}>
          Stimme testen
        </button>
        <div className="mt-4 space-y-1 text-sm text-muted">
          {!support.speak && <p className="text-bad">Dein Browser unterstützt keine Sprachausgabe.</p>}
          {hasRecordedAudio && <p>Stimmen: professionelle Aufnahmen in europäischem Portugiesisch.</p>}
          {!hasRecordedAudio && support.speak && voice && <p>Stimme: {voice.name}</p>}
          {!hasRecordedAudio && support.speak && voice && !voice.european && (
            <p className="text-warm">
              Es ist keine europäisch-portugiesische Stimme (pt-PT) installiert – die Aussprache klingt brasilianisch.
              Installiere in den Systemeinstellungen deines Geräts eine Stimme „Portugiesisch (Portugal)“.
            </p>
          )}
          {!hasRecordedAudio && support.speak && !voice && (
            <p className="text-warm">Keine portugiesische Stimme gefunden. Installiere „Portugiesisch (Portugal)“ in deinen Systemeinstellungen.</p>
          )}
          <p>
            Sprechübungen:{" "}
            {support.recognize
              ? "mit automatischer Erkennung"
              : support.record
                ? "Nachsprechen mit eigener Aufnahme"
                : "Nachsprechen ohne Aufnahme"}
          </p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-medium">Konto</h2>
        <p className="mt-2 text-sm text-muted">Angemeldet als {session?.user.email}</p>
        <button className="btn-ghost mt-4" onClick={() => supabase.auth.signOut()}>
          Abmelden
        </button>
      </section>
    </div>
  );
}
