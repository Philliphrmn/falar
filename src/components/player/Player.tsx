"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise } from "@/lib/exercises";
import type { ItemResult } from "@/lib/data";
import { speak } from "@/lib/speech";
import { IconCheck, IconClose, IconSpeaker } from "../icons";
import {
  BuildEx,
  ChoiceEx,
  DictationEx,
  FillEx,
  ListenChoiceEx,
  MatchEx,
  SpeakEx,
  TypeEx,
  type ExerciseProps,
  type Outcome,
} from "./Exercises";
import { DialogueEx, ProduceEx, RoleplayEx } from "./Dialogue";

export type SessionSummary = {
  results: ItemResult[];
  /** Anteil beim ersten Versuch richtig, 0–100 */
  score: number;
  mistakes: { prompt: string; solution: string }[];
};

type Props = {
  exercises: Exercise[];
  onExit: () => void;
  onFinish: (summary: SessionSummary) => void;
};

const MAX_RETRIES = 1;

function promptOf(ex: Exercise) {
  switch (ex.kind) {
    case "choice":
    case "build":
    case "type":
      return ex.prompt;
    case "dictation":
      return `🎧 ${ex.de}`;
    case "listen-choice":
      return "🎧 Hörübung";
    case "fill":
      return ex.de;
    case "speak":
      return ex.de;
    case "match":
      return "Paare";
    case "dialogue":
      return ex.dialogue.question.q;
    case "roleplay":
      return "Rollenspiel";
    case "produce":
      return ex.task.prompt;
  }
}

export function Player({ exercises, onExit, onFinish }: Props) {
  const [queue, setQueue] = useState(() => exercises.map((e) => ({ ex: e, attempt: 0 })));
  const [pos, setPos] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const checkRef = useRef<(() => Outcome) | null>(null);
  const [canCheck, setCanCheck] = useState(false);
  const [noSpeaking, setNoSpeaking] = useState(false);

  const firstTry = useRef(new Map<string, boolean>());
  const results = useRef<ItemResult[]>([]);
  const mistakes = useRef<{ prompt: string; solution: string }[]>([]);
  const solved = useRef(new Set<string>());
  const [solvedCount, setSolvedCount] = useState(0);

  const current = queue[pos];

  const setCheck = useCallback((fn: (() => Outcome) | null) => {
    checkRef.current = fn;
    setCanCheck(!!fn);
  }, []);

  const record = useCallback(
    (o: Outcome) => {
      const { ex, attempt } = current;
      if (attempt === 0) {
        if (!o.skipped) firstTry.current.set(ex.key, o.correct);
        results.current.push(...(o.items ?? (o.skipped ? [] : [{ itemId: ex.itemId, correct: o.correct }])));
        if (!o.correct && o.solution && !mistakes.current.some((m) => m.solution === o.solution)) {
          mistakes.current.push({ prompt: promptOf(ex), solution: o.solution });
        }
      }
      if (o.correct || attempt >= MAX_RETRIES) {
        solved.current.add(ex.key);
        setSolvedCount(solved.current.size);
      } else {
        // Falsch beantwortete Übung kommt am Ende noch einmal
        setQueue((q) => [...q, { ex: { ...ex, key: ex.key }, attempt: attempt + 1 }]);
      }
      setOutcome(o);
      if (o.audio && !o.correct) speak(o.audio);
    },
    [current],
  );

  const check = useCallback(() => {
    if (!checkRef.current || outcome) return;
    record(checkRef.current());
  }, [outcome, record]);

  const finish = useCallback(() => {
    const scored = [...firstTry.current.values()];
    const score = scored.length ? Math.round((100 * scored.filter(Boolean).length) / scored.length) : 100;
    onFinish({ results: results.current, score, mistakes: mistakes.current });
  }, [onFinish]);

  const next = useCallback(() => {
    setOutcome(null);
    setCheck(null);
    let n = pos + 1;
    // Sprechübungen überspringen, wenn deaktiviert
    while (n < queue.length && noSpeaking && queue[n].ex.kind === "speak") n++;
    if (n >= queue.length) finish();
    else setPos(n);
  }, [pos, queue, noSpeaking, finish, setCheck]);

  const skipSpeaking = useCallback(() => {
    setNoSpeaking(true);
    solved.current.add(current.ex.key);
    setSolvedCount(solved.current.size);
    setOutcome({ correct: true, skipped: true, note: "Sprechübungen sind für diese Sitzung ausgeschaltet." });
  }, [current]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (outcome) next();
      else check();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [outcome, next, check]);

  if (!current) return null;

  const total = exercises.length;
  const progress = Math.min(100, (100 * solvedCount) / total);
  const props = { locked: !!outcome, setCheck, complete: record, skipSpeaking };
  const ex = current.ex;
  const selfChecking = ex.kind === "match" || ex.kind === "speak" || ex.kind === "roleplay" || ex.kind === "produce";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 pt-5">
        <button onClick={onExit} className="text-muted hover:text-ink" aria-label="Beenden">
          <IconClose className="h-6 w-6" />
        </button>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="w-12 text-right text-sm tabular-nums text-muted">
          {solvedCount}/{total}
        </span>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-48 pt-10">
        {current.attempt > 0 && <p className="mb-3 text-sm font-medium text-warm">Noch einmal</p>}
        <ExerciseView key={`${ex.key}-${current.attempt}`} ex={ex} {...props} />
      </div>

      {(outcome || !selfChecking) && (
        <footer
          className={`fixed inset-x-0 bottom-0 border-t transition-colors ${
            !outcome ? "border-line bg-bg" : outcome.correct ? "border-ok/30 bg-ok-soft" : "border-bad/30 bg-bad-soft"
          }`}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              {outcome && (
                <div className={outcome.correct ? "text-ok" : "text-bad"}>
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    {outcome.correct ? <IconCheck /> : <IconClose />}
                    {outcome.skipped ? "Übersprungen" : outcome.correct ? "Richtig!" : "Nicht ganz."}
                  </p>
                  {!outcome.correct && outcome.solution && (
                    <p className="mt-1 text-ink">
                      Richtig: <span lang="pt-PT" className="font-medium">{outcome.solution}</span>
                    </p>
                )}
                {outcome.note && <p className="mt-1 text-sm text-ink/80">{outcome.note}</p>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {outcome?.audio && (
              <button onClick={() => speak(outcome.audio!)} className="btn-ghost px-3" aria-label="Anhören">
                <IconSpeaker />
              </button>
            )}
            {outcome ? (
              <button className="btn-primary min-w-40 flex-1" onClick={next} autoFocus>
                Weiter
              </button>
            ) : selfChecking ? null : (
              <button className="btn-primary min-w-40 flex-1" onClick={check} disabled={!canCheck}>
                Prüfen
              </button>
            )}
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}

function ExerciseView({ ex, ...props }: { ex: Exercise } & Omit<ExerciseProps<"choice">, "ex">) {
  switch (ex.kind) {
    case "choice":
      return <ChoiceEx ex={ex} {...props} />;
    case "listen-choice":
      return <ListenChoiceEx ex={ex} {...props} />;
    case "match":
      return <MatchEx ex={ex} {...props} />;
    case "build":
      return <BuildEx ex={ex} {...props} />;
    case "type":
      return <TypeEx ex={ex} {...props} />;
    case "dictation":
      return <DictationEx ex={ex} {...props} />;
    case "fill":
      return <FillEx ex={ex} {...props} />;
    case "speak":
      return <SpeakEx ex={ex} {...props} />;
    case "dialogue":
      return <DialogueEx ex={ex} {...props} />;
    case "roleplay":
      return <RoleplayEx ex={ex} {...props} />;
    case "produce":
      return <ProduceEx ex={ex} {...props} />;
  }
}
