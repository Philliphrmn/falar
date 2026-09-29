"use client";

import { PERSONS, type VerbDef } from "@/content";
import { speak } from "@/lib/speech";
import { AudioButtons } from "./player/Exercises";
import { IconSpeaker } from "./icons";

/**
 * Konjugationstabelle: Präsens mit allen Personen, dazu weitere Formen aus dem Kurs.
 * Jede Form steht in einer Zeile – links „eu chamo-me“, rechts die Übersetzung.
 */
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
      <ul>
        {verb.present.map((form, i) => (
          <li key={i}>
            <FormLine pt={form} pronoun={PERSONS[i]} de={verb.presentDe[i]} />
          </li>
        ))}
      </ul>
      {verb.extra?.map((x) => (
        <div key={x.label} className="mt-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">{x.label}</p>
          <ul>
            {x.forms.map(([pt, de]) => (
              <li key={pt}>
                <FormLine pt={pt} de={de} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FormLine({ pt, pronoun, de }: { pt: string; pronoun?: string; de: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(pt)}
      className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-surface-2"
      aria-label={`${pt} anhören`}
    >
      <IconSpeaker className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span lang="pt-PT" className="min-w-0 flex-1">
        {pronoun && <span className="text-muted">{pronoun} </span>}
        <span className="whitespace-nowrap font-medium">{pt}</span>
      </span>
      <span className="shrink-0 text-right text-sm text-muted">{de}</span>
    </button>
  );
}
