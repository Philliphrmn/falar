"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "./AppProvider";
import { LoginForm } from "./LoginForm";
import { Player, type SessionSummary } from "./player/Player";
import { AudioButtons } from "./player/Exercises";
import type { Exercise, GenOptions } from "@/lib/exercises";
import { saveSession } from "@/lib/data";
import type { GrammarNote, LessonDef } from "@/content";
import { canRecognize, canSpeak } from "@/lib/speech";

type Props = {
  /** Lektion (mit Einführung) oder Wiederholung */
  lesson?: LessonDef;
  title: string;
  build: (opts: GenOptions) => Exercise[];
  xpBase: number;
};

type Phase = "intro" | "play" | "saving" | "done";

export function SessionRunner(props: Props) {
  const app = useApp();
  const [run, setRun] = useState(0);
  if (!app.authReady) return null;
  if (!app.session) return <LoginForm />;
  if (!app.loaded) {
    return (
      <Centered>
        <p className="text-muted">Lade …</p>
      </Centered>
    );
  }
  return <Session key={run} {...props} restart={() => setRun((r) => r + 1)} withIntro={run === 0} />;
}

function Session({
  lesson,
  title,
  build,
  xpBase,
  restart,
  withIntro,
}: Props & { restart: () => void; withIntro: boolean }) {
  const app = useApp();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(lesson && withIntro ? "intro" : "play");
  // Übungen nur im Browser erzeugen (Zufall, Sprach-APIs) – diese Komponente rendert nie auf dem Server
  const [exercises] = useState<Exercise[]>(() => build({ audio: canSpeak(), speech: canRecognize() }));
  const [summary, setSummary] = useState<(SessionSummary & { xp: number }) | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!exercises.length) {
    return (
      <Centered>
        <p className="text-muted">Hier gibt es gerade nichts zu üben.</p>
        <Link href="/" className="btn-primary mt-6">Zur Übersicht</Link>
      </Centered>
    );
  }

  async function onFinish(s: SessionSummary) {
    const xp = xpBase + (s.score === 100 ? 5 : 0);
    setSummary({ ...s, xp });
    setPhase("saving");
    try {
      await saveSession(app.session!.user.id, {
        results: s.results,
        xp,
        reviews: app.reviews,
        today: app.today,
        lesson: lesson ? { id: lesson.id, score: s.score, prev: app.progress.get(lesson.id) } : undefined,
      });
      await app.refresh();
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
    setPhase("done");
  }

  if (phase === "intro" && lesson) {
    return <Intro lesson={lesson} onStart={() => setPhase("play")} onExit={() => router.push("/")} />;
  }

  if (phase === "play") {
    return (
      <Player
        exercises={exercises}
        onExit={() => {
          if (confirm("Lektion wirklich beenden? Der Fortschritt dieser Runde geht verloren.")) router.push("/");
        }}
        onFinish={onFinish}
      />
    );
  }

  const goal = app.settings.daily_goal_xp;
  const todayXp = app.today?.xp ?? 0;

  return (
    <Centered>
      {phase === "saving" || !summary ? (
        <p className="text-muted">Speichere …</p>
      ) : (
        <div className="w-full max-w-md">
          <p className="text-sm uppercase tracking-wide text-muted">{title}</p>
          <h1 className="mt-1 font-serif text-3xl">
            {summary.score >= 90 ? "Muito bem!" : summary.score >= 60 ? "Bom trabalho!" : "Continua!"}
          </h1>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Genauigkeit" value={`${summary.score} %`} />
            <Stat label="XP" value={`+${summary.xp}`} />
            <Stat label="Heute" value={`${todayXp}/${goal}`} highlight={todayXp >= goal} />
          </div>
          {saveError && (
            <p className="mt-4 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
              Konnte nicht gespeichert werden: {saveError}
            </p>
          )}
          {summary.mistakes.length > 0 && (
            <div className="card mt-6 p-5">
              <h2 className="mb-3 font-medium">Das kommt in der Wiederholung wieder</h2>
              <ul className="space-y-2 text-sm">
                {summary.mistakes.map((m, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-0">
                    <span className="text-muted">{m.prompt}</span>
                    <span lang="pt-PT" className="text-right font-medium">{m.solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 flex gap-3">
            <button
              className="btn-ghost flex-1"
              onClick={restart}
            >
              Nochmal
            </button>
            <Link href="/" className="btn-primary flex-1">Weiter</Link>
          </div>
        </div>
      )}
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">{children}</div>;
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 text-center ${highlight ? "border-ok/40 bg-ok-soft" : ""}`}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function GrammarCard({ note }: { note: GrammarNote }) {
  return (
    <div className="card p-6">
      <h2 className="font-serif text-xl">{note.title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">
        {note.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {note.examples && (
        <ul className="mt-5 space-y-2">
          {note.examples.map((e) => (
            <li key={e.pt} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <AudioButtons text={e.pt} />
              <span>
                <span lang="pt-PT" className="font-medium">{e.pt}</span>
                <span className="block text-sm text-muted">{e.de}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Intro({ lesson, onStart, onExit }: { lesson: LessonDef; onStart: () => void; onExit: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <button onClick={onExit} className="text-sm text-muted hover:text-ink">← Übersicht</button>
      <p className="mt-6 text-sm uppercase tracking-wide text-muted">{lesson.subtitle}</p>
      <h1 className="mt-1 font-serif text-4xl">{lesson.title}</h1>

      {lesson.grammar && (
        <div className="mt-8">
          <GrammarCard note={lesson.grammar} />
        </div>
      )}

      <h2 className="mb-3 mt-8 font-medium">Wörter in dieser Lektion</h2>
      <ul className="card divide-y divide-line">
        {lesson.words.map(([pt, de, note]) => (
          <li key={pt} className="flex items-center gap-3 px-4 py-2.5">
            <AudioButtons text={pt} />
            <span lang="pt-PT" className="font-medium">{pt}</span>
            <span className="ml-auto text-right text-sm text-muted">
              {de}
              {note && <span className="block text-xs">{note}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 -mx-4 mt-8 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-6 pt-8">
        <button className="btn-primary w-full text-lg" onClick={onStart} autoFocus>
          Lektion starten
        </button>
      </div>
    </div>
  );
}
