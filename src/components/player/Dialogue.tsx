"use client";

import { useEffect, useRef, useState } from "react";
import type { DialogueLine } from "@/content";
import { checkAnswer, similarity } from "@/lib/answer";
import { canRecord, canSpeak, listen, speak, speakAsync, startRecording, stopSpeaking } from "@/lib/speech";
import { IconCheck, IconClose, IconMic, IconSpeaker } from "../icons";
import { AccentInput, AudioButtons, Options, Title, type ExerciseProps } from "./Exercises";

/** Gesprächspartnerin mit Frauen-, deine Rolle mit Männerstimme – so lassen sich die Sprecher unterscheiden */
const voiceOf = (who: DialogueLine[0]) => (who === "b" ? "m" : "f");

function Bubble({
  line,
  partner,
  active,
  showText,
  showDe,
  mark,
}: {
  line: DialogueLine;
  partner: string;
  active?: boolean;
  showText: boolean;
  showDe: boolean;
  mark?: "ok" | "bad";
}) {
  const [who, pt, de] = line;
  const mine = who === "b";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 transition ${
          mine ? "rounded-br-sm bg-accent-soft" : "rounded-bl-sm border border-line bg-surface"
        } ${active ? "ring-2 ring-accent" : ""}`}
      >
        <p className="mb-0.5 flex items-center gap-1.5 text-xs text-muted">
          {mine ? "Du" : partner}
          {mark === "ok" && <IconCheck className="h-3.5 w-3.5 text-ok" />}
          {mark === "bad" && <IconClose className="h-3.5 w-3.5 text-bad" />}
        </p>
        <button type="button" className="flex items-start gap-2 text-left" onClick={() => speak(pt, { voice: voiceOf(who) })} aria-label="Anhören">
          <IconSpeaker className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span lang="pt-PT" className={showText ? "" : "select-none blur-sm"}>{pt}</span>
        </button>
        {showDe && <p className="mt-1 text-sm text-muted">{de}</p>}
      </div>
    </li>
  );
}

/** Dialog hören, optional mitlesen, dann eine Verständnisfrage beantworten */
export function DialogueEx({ ex, locked, setCheck }: ExerciseProps<"dialogue">) {
  const d = ex.dialogue;
  const audio = canSpeak();
  const [showText, setShowText] = useState(!audio);
  const [showDe, setShowDe] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const cancelled = useRef(false);

  async function playAll() {
    cancelled.current = false;
    for (let i = 0; i < d.lines.length; i++) {
      if (cancelled.current) break;
      setPlaying(i);
      await speakAsync(d.lines[i][1], { voice: voiceOf(d.lines[i][0]) });
      await new Promise((r) => setTimeout(r, 350));
    }
    setPlaying(null);
  }

  useEffect(() => {
    if (!audio) return;
    const t = setTimeout(playAll, 400);
    return () => {
      clearTimeout(t);
      cancelled.current = true;
      stopSpeaking();
    };
    // Nur beim ersten Anzeigen automatisch abspielen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-wide text-muted">Gespräch</p>
      <Title>{d.situation}</Title>
      <div className="mb-4 flex flex-wrap gap-2">
        {audio && (
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-sm"
            onClick={() => {
              if (playing !== null) {
                cancelled.current = true;
                stopSpeaking();
                setPlaying(null);
              } else void playAll();
            }}
          >
            <IconSpeaker className="h-4 w-4" /> {playing !== null ? "Stopp" : "Abspielen"}
          </button>
        )}
        {audio && (
          <button type="button" className="chip px-3 py-1.5 text-sm" onClick={() => setShowText((v) => !v)}>
            {showText ? "Text verbergen" : "Text zeigen"}
          </button>
        )}
        <button type="button" className="chip px-3 py-1.5 text-sm" onClick={() => setShowDe((v) => !v)}>
          {showDe ? "Übersetzung aus" : "Übersetzung"}
        </button>
      </div>
      <ul className="mb-8 space-y-2">
        {d.lines.map((l, i) => (
          <Bubble key={i} line={l} partner={d.partner} active={playing === i} showText={showText || locked} showDe={showDe} />
        ))}
      </ul>
      <p className="mb-3 font-medium">{d.question.q}</p>
      <Options
        options={ex.options}
        answer={ex.answer}
        locked={locked}
        selected={sel}
        onSelect={(i) => {
          setSel(i);
          setCheck(() => ({ correct: ex.options[i] === ex.answer, solution: ex.answer, items: [] }));
        }}
      />
    </div>
  );
}

type Mode = "speak" | "type" | "aloud";
type Result = "ok" | "bad";

/** Rollenspiel: Die Gesprächspartnerin spricht, du sprichst oder schreibst deine Zeilen */
export function RoleplayEx({ ex, locked, complete }: ExerciseProps<"roleplay">) {
  const d = ex.dialogue;
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [mode, setMode] = useState<Mode>(ex.speech ? "speak" : "type");
  const endRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  const line = d.lines[step];
  const done = step >= d.lines.length;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopSpeaking();
    };
  }, []);

  // Zeilen der Gesprächspartnerin automatisch abspielen und weitergehen
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    if (done) {
      const mine = d.lines.filter((l) => l[0] === "b").length;
      const ok = Object.values(results).filter((r) => r === "ok").length;
      if (!locked) {
        complete({
          correct: true,
          items: [],
          note:
            mode === "aloud"
              ? "Gut gemacht – sprich den Dialog ruhig noch ein paar Mal laut."
              : `${ok} von ${mine} deiner Sätze auf Anhieb richtig.`,
        });
      }
      return;
    }
    if (line[0] === "a") {
      const t = setTimeout(async () => {
        await speakAsync(line[1], { voice: "f" });
        if (alive.current) setTimeout(() => alive.current && setStep((s) => s + 1), 300);
      }, 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function answered(r: Result) {
    setResults((prev) => ({ ...prev, [step]: r }));
    const pt = line[1];
    void speakAsync(pt, { voice: "m" }).then(() => alive.current && setStep((s) => s + 1));
  }

  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-wide text-muted">Rollenspiel</p>
      <Title>Jetzt bist du dran</Title>
      <p className="-mt-4 mb-6 text-muted">
        {d.situation} Dein Gegenüber: {d.partner}.
      </p>
      <ul className="space-y-2">
        {d.lines.slice(0, step).map((l, i) => (
          <Bubble key={i} line={l} partner={d.partner} showText showDe={false} mark={results[i]} />
        ))}
        {!done && line[0] === "a" && (
          <li className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3 text-muted">
              <span className="animate-pulse">{d.partner} spricht …</span>
            </div>
          </li>
        )}
      </ul>
      {!done && line[0] === "b" && (
        <MyTurn key={`${step}-${mode}`} line={line} mode={mode} setMode={setMode} canRecognize={ex.speech} onDone={answered} />
      )}
      <div ref={endRef} />
    </div>
  );
}

function MyTurn({
  line,
  mode,
  setMode,
  canRecognize,
  onDone,
}: {
  line: DialogueLine;
  mode: Mode;
  setMode: (m: Mode) => void;
  canRecognize: boolean;
  onDone: (r: Result) => void;
}) {
  const [, pt, de, alt] = line;
  const answers = [pt, ...(alt ?? [])];
  const [value, setValue] = useState("");
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  function fail(msg: string) {
    const n = tries + 1;
    setTries(n);
    if (n >= 2) {
      setFeedback(null);
      onDone("bad");
    } else setFeedback(msg);
  }

  function checkTyped() {
    if (!value.trim()) return;
    if (checkAnswer(value, answers).correct) onDone(tries === 0 && !revealed ? "ok" : "bad");
    else fail("Noch nicht ganz – versuch es noch einmal.");
  }

  async function record() {
    setListening(true);
    setFeedback(null);
    const { promise, stop } = listen({ onProcessing: () => setProcessing(true) });
    stopRef.current = stop;
    try {
      const heard = await promise;
      setListening(false);
      setProcessing(false);
      if (!heard.length) {
        setFeedback("Ich habe nichts gehört. Noch einmal?");
        return;
      }
      const best = Math.max(...heard.flatMap((h) => answers.map((a) => similarity(h, a))));
      if (best >= 0.7) onDone(tries === 0 && !revealed ? "ok" : "bad");
      else fail(`Verstanden: „${heard[0]}“ – noch einmal?`);
    } catch (e) {
      setListening(false);
      setProcessing(false);
      setFeedback(
        e instanceof Error && e.message === "not-allowed"
          ? "Kein Zugriff auf das Mikrofon – du kannst auch tippen."
          : "Die Spracherkennung hat nicht funktioniert – du kannst auch tippen.",
      );
    }
  }

  return (
    <div className="card mt-6 p-5">
      <p className="text-sm text-muted">Sag auf Portugiesisch:</p>
      <p className="mt-1 text-xl font-medium">{de}</p>
      {revealed && (
        <p lang="pt-PT" className="mt-2 text-accent">
          {pt}
        </p>
      )}

      <div className="mt-5">
        {mode === "speak" && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition ${
                listening && !processing ? "animate-pulse border-bad bg-bad-soft text-bad" : "border-accent bg-accent-soft text-accent"
              }`}
              disabled={processing}
              onClick={() => (listening ? stopRef.current() : record())}
              aria-label="Aufnehmen"
            >
              <IconMic className="h-7 w-7" />
            </button>
            <p className="text-sm text-muted">{processing ? "Einen Moment …" : listening ? "Ich höre zu …" : "Tippen und sprechen"}</p>
          </div>
        )}
        {mode === "type" && (
          <div>
            <AccentInput value={value} onChange={setValue} disabled={false} placeholder="Deine Antwort" onEnter={checkTyped} />
            <button type="button" className="btn-primary mt-4 w-full" disabled={!value.trim()} onClick={checkTyped}>
              Antworten
            </button>
          </div>
        )}
        {mode === "aloud" && (
          <div className="flex flex-col gap-3">
            {!revealed ? (
              <button type="button" className="btn-primary w-full" onClick={() => setRevealed(true)}>
                Laut gesagt – Lösung zeigen
              </button>
            ) : (
              <div className="flex gap-3">
                <button type="button" className="btn-ghost flex-1" onClick={() => onDone("bad")}>
                  Anders gesagt
                </button>
                <button type="button" className="btn-primary flex-1" onClick={() => onDone("ok")}>
                  Hab ich so gesagt
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {feedback && <p className="mt-3 text-center text-sm text-bad">{feedback}</p>}

      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted">
        {canRecognize && mode !== "speak" && (
          <button type="button" className="underline" onClick={() => setMode("speak")}>Sprechen</button>
        )}
        {mode !== "type" && (
          <button type="button" className="underline" onClick={() => setMode("type")}>Lieber tippen</button>
        )}
        {mode !== "aloud" && (
          <button type="button" className="underline" onClick={() => setMode("aloud")}>Nur laut sagen</button>
        )}
        {mode !== "aloud" && !revealed && (
          <button type="button" className="underline" onClick={() => setRevealed(true)}>Hilfe</button>
        )}
      </div>
    </div>
  );
}

/** Freies Sprechen: eigene Antwort formulieren (laut, als Aufnahme oder schriftlich), dann mit der Musterlösung vergleichen */
export function ProduceEx({ ex, locked, complete }: ExerciseProps<"produce">) {
  const t = ex.task;
  const recordable = canRecord();
  const [recording, setRecording] = useState(false);
  const [take, setTake] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [writing, setWriting] = useState(false);
  const [shown, setShown] = useState(false);
  const stopRef = useRef<(() => Promise<string>) | null>(null);

  useEffect(() => () => {
    if (take) URL.revokeObjectURL(take);
  }, [take]);

  async function toggle() {
    if (recording && stopRef.current) {
      setTake(await stopRef.current());
      setRecording(false);
      return;
    }
    try {
      const { stop } = await startRecording();
      stopRef.current = stop;
      setTake(null);
      setRecording(true);
    } catch {
      setWriting(true);
    }
  }

  const rate = (good: boolean) =>
    complete({
      correct: true,
      items: [],
      note: good
        ? "Super – genau so übt man freies Sprechen."
        : "Sprich die Musterlösung ein paar Mal nach und versuch es später noch einmal mit eigenen Worten.",
    });

  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-wide text-muted">Frei sprechen</p>
      <Title>{t.prompt}</Title>
      <div className="-mt-2 mb-6 flex flex-wrap gap-1.5">
        {t.hints.map((h) => (
          <span key={h} lang="pt-PT" className="chip px-2.5 py-1 text-sm">{h}</span>
        ))}
      </div>

      {!shown && (
        <div className="card p-5">
          <p className="text-sm text-muted">
            Sprich in 2–4 Sätzen. Es muss nicht perfekt sein – Hauptsache, du sagst es laut.
          </p>
          {recordable && !writing && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <button
                type="button"
                className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition ${
                  recording ? "animate-pulse border-bad bg-bad-soft text-bad" : "border-accent bg-accent-soft text-accent"
                }`}
                onClick={toggle}
                aria-label={recording ? "Aufnahme beenden" : "Aufnehmen"}
              >
                <IconMic className="h-7 w-7" />
              </button>
              <p className="text-sm text-muted">{recording ? "Aufnahme läuft … zum Beenden tippen" : take ? "Aufgenommen" : "Aufnehmen (optional)"}</p>
              {take && (
                <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => void new Audio(take).play()}>
                  Meine Aufnahme anhören
                </button>
              )}
            </div>
          )}
          {writing && (
            <textarea
              className="input mt-4 min-h-28 text-lg"
              lang="pt-PT"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Schreib deine Antwort …"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
            />
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {!writing && (
              <button type="button" className="btn-ghost flex-1" onClick={() => setWriting(true)}>
                Lieber schreiben
              </button>
            )}
            <button type="button" className="btn-primary flex-1" disabled={recording} onClick={() => setShown(true)}>
              Musterlösung zeigen
            </button>
          </div>
        </div>
      )}

      {shown && (
        <div>
          {text.trim() && (
            <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3">
              <p className="text-xs text-muted">Deine Antwort</p>
              <p lang="pt-PT" className="whitespace-pre-wrap">{text}</p>
            </div>
          )}
          {take && (
            <button type="button" className="btn-ghost mb-4 px-3 py-1.5 text-sm" onClick={() => void new Audio(take).play()}>
              Meine Aufnahme anhören
            </button>
          )}
          <p className="mb-2 text-sm text-muted">So könnte es klingen – deine Version darf anders sein:</p>
          <ul className="card divide-y divide-line">
            {t.model.map((m) => (
              <li key={m.pt} className="flex items-center gap-3 px-4 py-3">
                <AudioButtons text={m.pt} />
                <span>
                  <span lang="pt-PT" className="font-medium">{m.pt}</span>
                  <span className="block text-sm text-muted">{m.de}</span>
                </span>
              </li>
            ))}
          </ul>
          {!locked && (
            <div className="mt-6 flex gap-3">
              <button type="button" className="btn-ghost flex-1" onClick={() => rate(false)}>Das war schwer</button>
              <button type="button" className="btn-primary flex-1" onClick={() => rate(true)}>Hab ich gut hinbekommen</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
