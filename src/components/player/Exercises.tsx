"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/lib/exercises";
import { checkAnswer, normalize, similarity } from "@/lib/answer";
import { canRecognize, canRecord, canSpeak, listen, speak, startRecording } from "@/lib/speech";
import type { ItemResult } from "@/lib/data";
import { IconMic, IconSpeaker, IconTurtle } from "../icons";
import { shuffle } from "@/lib/exercises";

export type Outcome = {
  correct: boolean;
  note?: string;
  /** Musterlösung, wird bei Fehlern angezeigt */
  solution?: string;
  /** Portugiesischer Text zum Anhören in der Rückmeldung */
  audio?: string;
  items?: ItemResult[];
  /** Zählt nicht zur Wertung */
  skipped?: boolean;
};

export type ExerciseProps<K extends Exercise["kind"]> = {
  ex: Extract<Exercise, { kind: K }>;
  locked: boolean;
  /** Übung meldet, wie geprüft wird (null = noch keine Antwort) */
  setCheck: (fn: (() => Outcome) | null) => void;
  /** Für Übungen, die sich selbst auswerten (Paare, Sprechen) */
  complete: (o: Outcome) => void;
  skipSpeaking?: () => void;
};

export function AudioButtons({ text, size = "md", autoPlay = false }: { text: string; size?: "md" | "lg"; autoPlay?: boolean }) {
  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(() => speak(text), 250);
      return () => clearTimeout(t);
    }
  }, [text, autoPlay]);
  if (!canSpeak()) return null;
  const big = size === "lg";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => speak(text)}
        className={`flex items-center justify-center rounded-xl bg-accent text-accent-ink hover:opacity-90 ${big ? "h-16 w-16" : "h-9 w-9"}`}
        aria-label="Anhören"
      >
        <IconSpeaker className={big ? "h-7 w-7" : "h-5 w-5"} />
      </button>
      <button
        type="button"
        onClick={() => speak(text, { slow: true })}
        className={`flex items-center justify-center rounded-xl border border-line bg-surface text-muted hover:text-ink ${big ? "h-12 w-12" : "h-9 w-9"}`}
        aria-label="Langsam anhören"
        title="Langsam"
      >
        <IconTurtle className={big ? "h-6 w-6" : "h-4 w-4"} />
      </button>
    </span>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-6 font-serif text-2xl leading-snug">{children}</h2>;
}

/** Zifferntasten 1–9 wählen Optionen */
function useNumberKeys(count: number, onPick: (i: number) => void, disabled: boolean) {
  const ref = useRef(onPick);
  useEffect(() => {
    ref.current = onPick;
  });
  useEffect(() => {
    if (disabled) return;
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const n = Number(e.key);
      if (n >= 1 && n <= count) ref.current(n - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [count, disabled]);
}

export function Options({
  options,
  answer,
  locked,
  selected,
  onSelect,
  lang,
}: {
  options: string[];
  answer: string;
  locked: boolean;
  selected: number | null;
  onSelect: (i: number) => void;
  lang?: "pt";
}) {
  useNumberKeys(options.length, onSelect, locked);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o, i) => {
        let state = selected === i ? "selected" : "idle";
        if (locked && o === answer) state = "correct";
        else if (locked && selected === i) state = "wrong";
        return (
          <button key={o + i} className="option flex items-center gap-3" data-state={state} disabled={locked} onClick={() => onSelect(i)} lang={lang}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line text-xs text-muted">{i + 1}</span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function ChoiceEx({ ex, locked, setCheck }: ExerciseProps<"choice">) {
  const [sel, setSel] = useState<number | null>(null);
  const pick = (i: number) => {
    setSel(i);
    if (ex.direction === "de-pt") speak(ex.options[i]);
    setCheck(() => ({
      correct: ex.options[i] === ex.answer,
      solution: ex.answer,
      audio: ex.direction === "de-pt" ? ex.answer : ex.prompt,
    }));
  };
  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-wide text-muted">
        {ex.direction === "pt-de" ? "Was bedeutet …" : "Wie sagt man auf Portugiesisch …"}
      </p>
      <Title>
        <span className="flex flex-wrap items-center gap-3">
          <span lang={ex.direction === "pt-de" ? "pt-PT" : "de"}>{ex.prompt}</span>
          {ex.direction === "pt-de" && <AudioButtons text={ex.prompt} autoPlay />}
        </span>
        {ex.note && ex.direction === "pt-de" && <span className="mt-1 block font-sans text-sm text-muted">({ex.note})</span>}
      </Title>
      <Options options={ex.options} answer={ex.answer} locked={locked} selected={sel} onSelect={pick} lang={ex.direction === "de-pt" ? "pt" : undefined} />
    </div>
  );
}

export function ListenChoiceEx({ ex, locked, setCheck }: ExerciseProps<"listen-choice">) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div>
      <Title>Was hörst du?</Title>
      <div className="mb-8 flex justify-center">
        <AudioButtons text={ex.audio} size="lg" autoPlay />
      </div>
      <Options
        options={ex.options}
        answer={ex.answer}
        locked={locked}
        selected={sel}
        lang="pt"
        onSelect={(i) => {
          setSel(i);
          setCheck(() => ({ correct: ex.options[i] === ex.answer, solution: ex.answer, audio: ex.answer }));
        }}
      />
    </div>
  );
}

export function MatchEx({ ex, complete }: ExerciseProps<"match">) {
  const left = useMemo(() => shuffle(ex.pairs), [ex]);
  const right = useMemo(() => shuffle(ex.pairs), [ex]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pickL, setPickL] = useState<string | null>(null);
  const [pickR, setPickR] = useState<string | null>(null);
  const [flash, setFlash] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());

  function attempt(l: string | null, r: string | null) {
    setPickL(l);
    setPickR(r);
    if (!l || !r) return;
    if (l === r) {
      const next = new Set(done).add(l);
      setDone(next);
      setPickL(null);
      setPickR(null);
      if (next.size === ex.pairs.length) {
        complete({
          correct: mistakes.size === 0,
          note: mistakes.size ? "Einige Paare brauchten mehr als einen Versuch." : undefined,
          items: ex.pairs.map((p) => ({ itemId: p.id, correct: !mistakes.has(p.id) })),
        });
      }
    } else {
      setMistakes(new Set(mistakes).add(l).add(r));
      setFlash([`l${l}`, `r${r}`]);
      setTimeout(() => {
        setFlash([]);
        setPickL(null);
        setPickR(null);
      }, 500);
    }
  }

  const cls = (side: "l" | "r", id: string) => {
    if (done.has(id)) return "correct";
    if (flash.includes(side + id)) return "wrong";
    if ((side === "l" ? pickL : pickR) === id) return "selected";
    return "idle";
  };

  return (
    <div>
      <Title>Finde die Paare</Title>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {left.map((p) => (
            <button
              key={p.id}
              lang="pt"
              className="option text-center"
              data-state={cls("l", p.id)}
              disabled={done.has(p.id)}
              onClick={() => {
                speak(p.pt);
                attempt(p.id, pickR);
              }}
            >
              {p.pt}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {right.map((p) => (
            <button key={p.id} className="option text-center" data-state={cls("r", p.id)} disabled={done.has(p.id)} onClick={() => attempt(pickL, p.id)}>
              {p.de}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BuildEx({ ex, locked, setCheck }: ExerciseProps<"build">) {
  const [picked, setPicked] = useState<number[]>([]);
  const update = (next: number[]) => {
    setPicked(next);
    if (!next.length) return setCheck(null);
    const text = next.map((i) => ex.tokens[i]).join(" ");
    setCheck(() => {
      const ok = ex.answers.some((a) => normalize(a) === normalize(text));
      return {
        correct: ok,
        solution: ex.answers[0],
        audio: ex.direction === "de-pt" ? ex.answers[0] : ex.prompt,
      };
    });
  };
  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-wide text-muted">Übersetze</p>
      <Title>
        <span className="flex flex-wrap items-center gap-3">
          <span>{ex.prompt}</span>
          {ex.direction === "pt-de" && <AudioButtons text={ex.prompt} autoPlay />}
        </span>
      </Title>
      <div className="mb-6 flex min-h-[3.75rem] flex-wrap content-start gap-2 border-b-2 border-line pb-3">
        {picked.map((ti, pos) => (
          <button key={ti} className="chip" disabled={locked} onClick={() => update(picked.filter((_, p) => p !== pos))}>
            {ex.tokens[ti]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ex.tokens.map((t, i) => (
          <button
            key={i}
            className="chip"
            lang={ex.direction === "de-pt" ? "pt" : undefined}
            disabled={locked || picked.includes(i)}
            onClick={() => {
              if (ex.direction === "de-pt") speak(t);
              update([...picked, i]);
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextAnswer({
  answers,
  locked,
  setCheck,
  placeholder,
}: {
  answers: string[];
  locked: boolean;
  setCheck: ExerciseProps<"type">["setCheck"];
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  const change = (v: string) => {
    setValue(v);
    setCheck(v.trim() ? () => ({ ...checkAnswer(v, answers), solution: answers[0], audio: answers[0] }) : null);
  };
  return <AccentInput value={value} onChange={change} disabled={locked} placeholder={placeholder} />;
}

/** Eingabefeld mit Akzent-Leiste für portugiesische Sonderzeichen */
export function AccentInput({
  value,
  onChange,
  disabled,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder: string;
  /** Eigene Enter-Behandlung (sonst übernimmt der Player) */
  onEnter?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const insert = (ch: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + ch + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 1, start + 1);
    });
  };
  return (
    <div>
      <input
        ref={input}
        className="input text-lg"
        lang="pt-PT"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (onEnter && e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onEnter();
          }
        }}
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["á", "à", "â", "ã", "ç", "é", "ê", "í", "ó", "ô", "õ", "ú"].map((c) => (
          <button key={c} type="button" className="chip px-2.5 py-1 text-sm" disabled={disabled} onClick={() => insert(c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TypeEx({ ex, locked, setCheck }: ExerciseProps<"type">) {
  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-wide text-muted">Schreib auf Portugiesisch</p>
      <Title>{ex.prompt}</Title>
      <TextAnswer answers={ex.answers} locked={locked} setCheck={setCheck} placeholder="Deine Antwort" />
    </div>
  );
}

export function DictationEx({ ex, locked, setCheck }: ExerciseProps<"dictation">) {
  return (
    <div>
      <Title>Schreib, was du hörst</Title>
      <div className="mb-6 flex justify-center">
        <AudioButtons text={ex.audio} size="lg" autoPlay />
      </div>
      <TextAnswer answers={ex.answers} locked={locked} setCheck={setCheck} placeholder="Auf Portugiesisch …" />
    </div>
  );
}

export function FillEx({ ex, locked, setCheck }: ExerciseProps<"fill">) {
  const [sel, setSel] = useState<number | null>(null);
  const chosen = sel === null ? null : ex.options[sel];
  return (
    <div>
      <p className="mb-2 text-sm uppercase tracking-wide text-muted">Ergänze den Satz</p>
      <Title>
        <span lang="pt-PT">
          {ex.before}{" "}
          <span className={`inline-block min-w-20 border-b-2 px-1 text-center ${chosen ? "border-accent text-accent" : "border-muted"}`}>
            {chosen ?? " "}
          </span>{" "}
          {ex.after}
        </span>
        <span className="mt-2 block font-sans text-base text-muted">{ex.de}</span>
      </Title>
      <Options
        options={ex.options}
        answer={ex.answer}
        locked={locked}
        selected={sel}
        lang="pt"
        onSelect={(i) => {
          setSel(i);
          setCheck(() => ({ correct: ex.options[i] === ex.answer, solution: ex.full, audio: ex.full }));
        }}
      />
    </div>
  );
}

export function SpeakEx(props: ExerciseProps<"speak">) {
  return canRecognize() ? <RecognizeSpeak {...props} /> : <ShadowSpeak {...props} />;
}

/** Nachsprechen ohne Spracherkennung: sich selbst aufnehmen, mit dem Original vergleichen, selbst einschätzen */
function ShadowSpeak({ ex, locked, complete, skipSpeaking }: ExerciseProps<"speak">) {
  const recordable = canRecord();
  const [state, setState] = useState<"idle" | "recording" | "error">("idle");
  const [take, setTake] = useState<string | null>(null);
  const stopRef = useRef<(() => Promise<string>) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    if (take) URL.revokeObjectURL(take);
  }, [take]);

  async function toggle() {
    if (state === "recording" && stopRef.current) {
      const url = await stopRef.current();
      setState("idle");
      setTake(url);
      audioRef.current = new Audio(url);
      void audioRef.current.play();
      return;
    }
    try {
      const { stop } = await startRecording();
      stopRef.current = stop;
      setTake(null);
      setState("recording");
    } catch {
      setState("error");
    }
  }

  const rate = (good: boolean) =>
    complete({ correct: true, items: [], audio: ex.text, note: good ? "Selbst eingeschätzt – weiter so!" : "Hör dir das Original noch ein paar Mal an und sprich mit." });

  return (
    <div>
      <Title>Sprich nach</Title>
      <div className="card mb-8 flex items-center gap-4 p-5">
        <AudioButtons text={ex.text} autoPlay />
        <div>
          <p lang="pt-PT" className="text-xl">{ex.text}</p>
          <p className="text-sm text-muted">{ex.de}</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        {recordable && state !== "error" ? (
          <>
            <button
              className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition ${
                state === "recording" ? "animate-pulse border-bad bg-bad-soft text-bad" : "border-accent bg-accent-soft text-accent"
              }`}
              disabled={locked}
              onClick={toggle}
              aria-label={state === "recording" ? "Aufnahme beenden" : "Aufnehmen"}
            >
              <IconMic className="h-8 w-8" />
            </button>
            <p className="text-center text-sm text-muted">
              {state === "recording" ? "Aufnahme läuft … zum Beenden tippen" : take ? "Vergleiche deine Aufnahme mit dem Original" : "Hör zu, dann tippen und nachsprechen"}
            </p>
            {take && (
              <div className="flex gap-3">
                <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => void audioRef.current?.play()} disabled={locked}>
                  Meine Aufnahme
                </button>
                <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => speak(ex.text)} disabled={locked}>
                  Original
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-muted">
            {state === "error" ? "Kein Zugriff auf das Mikrofon. " : ""}Sprich den Satz laut nach – gern mehrmals, bis er flüssig klingt.
          </p>
        )}
        {(take || !recordable || state === "error") && !locked && (
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-ghost flex-1" onClick={() => rate(false)}>Noch unsicher</button>
            <button className="btn-primary flex-1" onClick={() => rate(true)}>Klang gut</button>
          </div>
        )}
        <button className="text-sm text-muted hover:text-ink" onClick={skipSpeaking} disabled={locked}>
          Kann gerade nicht sprechen
        </button>
      </div>
    </div>
  );
}

function RecognizeSpeak({ ex, locked, complete, skipSpeaking }: ExerciseProps<"speak">) {
  const [state, setState] = useState<"idle" | "listening" | "processing" | "error">("idle");
  const [heard, setHeard] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");
  const stopRef = useRef<() => void>(() => {});

  async function record() {
    setState("listening");
    setHeard(null);
    const { promise, stop } = listen({ onProcessing: () => setState("processing") });
    stopRef.current = stop;
    try {
      const alternatives = await promise;
      setState("idle");
      if (!alternatives.length) {
        setHeard("");
        return;
      }
      const best = alternatives.reduce((a, b) => (similarity(b, ex.text) > similarity(a, ex.text) ? b : a));
      setHeard(best);
      const score = similarity(best, ex.text);
      if (score >= 0.75) {
        complete({ correct: true, note: `Erkannt: „${best}“`, audio: ex.text });
      }
    } catch (e) {
      setState("error");
      const msg = e instanceof Error ? e.message : "";
      setErrorText(
        msg === "not-allowed"
          ? "Kein Zugriff auf das Mikrofon – bitte in den Browser-Einstellungen erlauben."
          : msg === "no-microphone"
            ? "Kein Mikrofon gefunden."
            : "Die Spracherkennung hat nicht funktioniert. Versuch es noch einmal.",
      );
    }
  }

  return (
    <div>
      <Title>Sprich nach</Title>
      <div className="card mb-8 flex items-center gap-4 p-5">
        <AudioButtons text={ex.text} autoPlay />
        <div>
          <p lang="pt-PT" className="text-xl">{ex.text}</p>
          <p className="text-sm text-muted">{ex.de}</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <button
          className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition ${
            state === "listening" ? "animate-pulse border-bad bg-bad-soft text-bad" : "border-accent bg-accent-soft text-accent"
          }`}
          disabled={locked || state === "processing"}
          onClick={() => (state === "listening" ? stopRef.current() : record())}
          aria-label="Aufnehmen"
        >
          <IconMic className="h-8 w-8" />
        </button>
        <p className="text-sm text-muted">{state === "listening"
            ? "Ich höre zu …"
            : state === "processing"
              ? "Einen Moment …"
              : "Tippen und den Satz sprechen"}</p>
        {heard !== null && !locked && (
          <p className="text-center text-sm">
            {heard ? (
              <>
                Verstanden: <span className="text-bad">„{heard}“</span> – versuch es noch einmal.
              </>
            ) : (
              "Ich habe nichts gehört. Noch einmal?"
            )}
          </p>
        )}
        {state === "error" && <p className="text-sm text-bad">{errorText}</p>}
        {heard !== null && heard !== "" && !locked && (
          <button className="text-sm text-muted underline" onClick={() => complete({ correct: true, skipped: true, note: "Ohne Wertung übersprungen", audio: ex.text })}>
            Weiter ohne Wertung
          </button>
        )}
        <button className="text-sm text-muted hover:text-ink" onClick={skipSpeaking} disabled={locked}>
          Kann gerade nicht sprechen
        </button>
      </div>
    </div>
  );
}
