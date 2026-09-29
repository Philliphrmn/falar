"use client";

import { PERSONS, PERSONS_DE, type VerbDef } from "@/content";
import { speak } from "@/lib/speech";
import { AudioButtons } from "./player/Exercises";
import { IconSpeaker } from "./icons";

/** Konjugationstabelle: Präsens mit allen Personen, dazu weitere Formen aus dem Kurs */
export function ConjugationTable({ verb, compact = false }: { verb: VerbDef; compact?: boolean }) {
  return (
    <div className={compact ? "" : "card p-5"}>
      {!compact && (
        <div className="mb-3 flex items-center gap-3">
          <AudioButtons text={verb.inf} />
          <span>
            <span lang="pt-PT" className="font-serif text-xl">{verb.inf}</span>
            <span className="ml-2 text-muted">{verb.de}</span>
          </span>
        </div>
      )}
      {verb.note && <p className="mb-3 text-sm text-muted">{verb.note}</p>}
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">Präsens</p>
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {verb.present.map((form, i) => (
          <li key={i}>
            <FormButton pt={form} label={PERSONS[i]} de={PERSONS_DE[i]} />
          </li>
        ))}
      </ul>
      {verb.extra?.map((x) => (
        <div key={x.label} className="mt-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">{x.label}</p>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {x.forms.map(([pt, de]) => (
              <li key={pt}>
                <FormButton pt={pt} de={de} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FormButton({ pt, label, de }: { pt: string; label?: string; de: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(pt)}
      className="flex w-full items-baseline gap-2 rounded-lg px-1 py-1 text-left hover:bg-surface-2"
      aria-label={`${pt} anhören`}
    >
      <IconSpeaker className="h-3.5 w-3.5 shrink-0 self-center text-accent" />
      {label && <span lang="pt-PT" className="w-28 shrink-0 text-sm text-muted">{label}</span>}
      <span lang="pt-PT" className="font-medium">{pt}</span>
      <span className="ml-auto text-right text-xs text-muted">{de}</span>
    </button>
  );
}
