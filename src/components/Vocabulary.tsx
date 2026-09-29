"use client";

import { useMemo, useState } from "react";
import { course, itemIndex, lessonItems, POS_LABELS, verbOf, type Item, type PartOfSpeech } from "@/content";
import { boxLabel, MAX_BOX } from "@/lib/srs";
import { stripAccents } from "@/lib/answer";
import { useApp } from "./AppProvider";
import { AudioButtons, SoundHint } from "./player/Exercises";
import { ConjugationTable } from "./Conjugation";

type Filter = "all" | PartOfSpeech | "small";

/** Kleine Wörter (Präpositionen, Bindewörter, Artikel) teilen sich einen Filter */
const SMALL: PartOfSpeech[] = ["prep", "conj", "art"];
const FILTERS: [Filter, string][] = [
  ["all", "Alle"],
  ["verb", POS_LABELS.verb],
  ["noun", POS_LABELS.noun],
  ["adj", POS_LABELS.adj],
  ["adv", POS_LABELS.adv],
  ["pron", POS_LABELS.pron],
  ["question", POS_LABELS.question],
  ["num", POS_LABELS.num],
  ["small", "Kleine Wörter"],
  ["phrase", POS_LABELS.phrase],
];

const matchesFilter = (i: Item, f: Filter) =>
  f === "all" || (f === "small" ? !!i.pos && SMALL.includes(i.pos) : i.pos === f);

export function Vocabulary() {
  const { reviews } = useApp();
  const [query, setQuery] = useState("");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  const q = stripAccents(query.toLowerCase().trim());
  const units = useMemo(
    () =>
      course.map((u) => ({
        ...u,
        // Kommt ein Wort in mehreren Lektionen vor, steht es nur bei der ersten
        lessons: u.lessons.map((l) => ({
          ...l,
          items: lessonItems(l).words.filter((i) => itemIndex.get(i.id)?.lessonId === l.id),
        })),
      })),
    [],
  );
  const counts = useMemo(() => {
    const all = units.flatMap((u) => u.lessons.flatMap((l) => l.items));
    return new Map(FILTERS.map(([f]) => [f, all.filter((i) => matchesFilter(i, f)).length]));
  }, [units]);

  return (
    <div>
      <h1 className="font-serif text-3xl">Vokabeln</h1>
      <p className="mt-2 text-muted">
        Alle Wörter des Kurses. Der Balken zeigt, wie sicher du ein Wort schon kannst. Bei Verben siehst du per Tipp alle Formen.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input className="input max-w-xs" placeholder="Suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyLearned} onChange={(e) => setOnlyLearned(e.target.checked)} />
          nur gelernte
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Wortart">
        {FILTERS.filter(([f]) => f === "all" || counts.get(f)).map(([f, label]) => (
          <button
            key={f}
            type="button"
            className="chip px-3 py-1 text-sm"
            data-state={filter === f ? "selected" : undefined}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {label}
            <span className="ml-1.5 text-xs text-muted">{counts.get(f)}</span>
          </button>
        ))}
      </div>

      {units.map((u) => {
        const lessons = u.lessons
          .map((l) => ({
            ...l,
            items: l.items.filter((i) => {
              if (!matchesFilter(i, filter)) return false;
              if (onlyLearned && !reviews.has(i.id)) return false;
              if (!q) return true;
              return stripAccents(`${i.pt} ${i.de} ${verbOf(i)?.present.join(" ") ?? ""}`.toLowerCase()).includes(q);
            }),
          }))
          .filter((l) => l.items.length);
        if (!lessons.length) return null;
        return (
          <section key={u.id} className="mt-10">
            <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">{u.title}</h2>
            {lessons.map((l) => (
              <div key={l.id} className="mb-6">
                <h3 className="mb-2 font-medium" lang="pt-PT">{l.title}</h3>
                <ul className="card divide-y divide-line">
                  {l.items.map((i) => {
                    const r = reviews.get(i.id);
                    const verb = verbOf(i);
                    const key = `${l.id}/${i.id}`;
                    const expanded = open === key;
                    return (
                      <li key={i.id} className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <AudioButtons text={i.pt} />
                          <span className="min-w-0 flex-1">
                            <span lang="pt-PT" className="font-medium">{i.pt}</span>
                            <span className="block text-sm text-muted">
                              {i.de}
                              {i.note && ` · ${i.note}`}
                            </span>
                            <SoundHint sound={i.sound} className="text-xs" />
                            {verb && (
                              <button
                                type="button"
                                className="mt-1 text-sm text-accent hover:underline"
                                aria-expanded={expanded}
                                onClick={() => setOpen(expanded ? null : key)}
                              >
                                {expanded ? "Formen ausblenden" : `Alle Formen von ${verb.inf}`}
                              </button>
                            )}
                          </span>
                          <span className="w-20 shrink-0 text-right" title={r ? `Box ${r.box} von ${MAX_BOX}` : "noch nicht gelernt"}>
                            <span className="block text-[11px] text-muted">{r ? boxLabel(r.box) : "–"}</span>
                            <span className="mt-1 flex gap-0.5">
                              {Array.from({ length: MAX_BOX }, (_, b) => (
                                <span key={b} className={`h-1.5 flex-1 rounded-full ${r && b < r.box ? "bg-ok" : "bg-surface-2"}`} />
                              ))}
                            </span>
                          </span>
                        </div>
                        {verb && expanded && (
                          <div className="mt-3 rounded-xl bg-surface-2 p-3">
                            <p className="mb-2 text-sm">
                              <span lang="pt-PT" className="font-medium">{verb.inf}</span>
                              <span className="text-muted"> – {verb.de}</span>
                            </p>
                            <ConjugationTable verb={verb} compact />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
