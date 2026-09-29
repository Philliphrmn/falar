"use client";

import { useMemo, useState } from "react";
import {
  course,
  itemIndex,
  lessonItems,
  lessonVerbs,
  lexicon,
  POS_LABELS,
  verbId,
  verbs,
  type Item,
  type LessonDef,
  type PartOfSpeech,
  type VerbDef,
} from "@/content";
import { boxLabel, MAX_BOX, type ReviewState } from "@/lib/srs";
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

/**
 * Eine Zeile der Liste: ein Wort – oder ein Verb in der Grundform. Konjugierte Formen
 * (sou, és, é …) stehen nicht einzeln, sondern aufgeklappt beim Verb, mit ihrem Fortschritt.
 */
type Row =
  | { type: "word"; item: Item }
  | {
      type: "verb";
      verb: VerbDef;
      /** Vokabeln aus den Lektionen, die zu diesem Verb gehören (Formen und Wendungen) */
      linked: Item[];
    };

const lower = (s: string) => s.toLowerCase();
const formsOf = (v: VerbDef) => [v.inf, ...v.present, ...(v.extra ?? []).flatMap((x) => x.forms.map(([pt]) => pt))];

/** Alle Vokabeln je Verb (jedes Wort nur einmal, bei seiner ersten Lektion) */
const linkedByVerb: Map<string, Item[]> = (() => {
  const map = new Map<string, Item[]>();
  for (const item of itemIndex.values()) {
    const inf = item.kind === "word" ? lexicon.get(item.pt)?.verb : undefined;
    if (inf && verbs.has(inf)) map.set(inf, [...(map.get(inf) ?? []), item]);
  }
  return map;
})();

/** Reine Verbformen verschwinden aus der Liste; Wendungen wie „desculpe“ bleiben zusätzlich stehen */
const isVerbForm = (i: Item) => i.pos === "verb" && !!lexicon.get(i.pt)?.verb;

function lessonRows(lesson: LessonDef): Row[] {
  const introduced = new Set(lessonVerbs(lesson).map((v) => v.inf));
  const rows: Row[] = [];
  for (const item of lessonItems(lesson).words) {
    if (itemIndex.get(item.id)?.lessonId !== lesson.id) continue;
    if (!isVerbForm(item)) rows.push({ type: "word", item });
    const inf = lexicon.get(item.pt)?.verb;
    if (inf && introduced.has(inf)) {
      introduced.delete(inf);
      const verb = verbs.get(inf)!;
      rows.push({ type: "verb", verb, linked: linkedByVerb.get(inf) ?? [] });
    }
  }
  return rows;
}

const rowPos = (r: Row) => (r.type === "verb" ? "verb" : r.item.pos);
const matchesFilter = (r: Row, f: Filter) => {
  const pos = rowPos(r);
  return f === "all" || (f === "small" ? !!pos && SMALL.includes(pos) : pos === f);
};
const searchText = (r: Row) =>
  r.type === "word"
    ? `${r.item.pt} ${r.item.de}`
    : `${formsOf(r.verb).join(" ")} ${r.verb.de} ${r.linked.map((i) => `${i.pt} ${i.de}`).join(" ")}`;

export function Vocabulary() {
  const { reviews } = useApp();
  const [query, setQuery] = useState("");
  const [onlyLearned, setOnlyLearned] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  const q = stripAccents(query.toLowerCase().trim());
  const units = useMemo(
    () => course.map((u) => ({ ...u, lessons: u.lessons.map((l) => ({ ...l, rows: lessonRows(l) })) })),
    [],
  );
  const counts = useMemo(() => {
    const all = units.flatMap((u) => u.lessons.flatMap((l) => l.rows));
    return new Map(FILTERS.map(([f]) => [f, all.filter((r) => matchesFilter(r, f)).length]));
  }, [units]);

  const learned = (r: Row) =>
    r.type === "word" ? reviews.has(r.item.id) : reviews.has(verbId(r.verb.inf)) || r.linked.some((i) => reviews.has(i.id));

  return (
    <div>
      <h1 className="font-serif text-3xl">Vokabeln</h1>
      <p className="mt-2 text-muted">
        Alle Wörter des Kurses. Der Balken zeigt, wie sicher du ein Wort schon kannst. Verben stehen in der Grundform –
        tippe darauf für alle Formen und deinen Fortschritt je Form.
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
            rows: l.rows.filter((r) => {
              if (!matchesFilter(r, filter)) return false;
              if (onlyLearned && !learned(r)) return false;
              return !q || stripAccents(lower(searchText(r))).includes(q);
            }),
          }))
          .filter((l) => l.rows.length);
        if (!lessons.length) return null;
        return (
          <section key={u.id} className="mt-10">
            <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">{u.title}</h2>
            {lessons.map((l) => (
              <div key={l.id} className="mb-6">
                <h3 className="mb-2 font-medium" lang="pt-PT">{l.title}</h3>
                <ul className="card divide-y divide-line">
                  {l.rows.map((r) =>
                    r.type === "word" ? (
                      <WordRow key={r.item.id} item={r.item} review={reviews.get(r.item.id)} />
                    ) : (
                      <VerbRow
                        key={`v:${r.verb.inf}`}
                        verb={r.verb}
                        linked={r.linked}
                        reviews={reviews}
                        expanded={open === r.verb.inf}
                        toggle={() => setOpen(open === r.verb.inf ? null : r.verb.inf)}
                      />
                    ),
                  )}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function WordRow({ item, review }: { item: Item; review?: ReviewState }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <AudioButtons text={item.pt} />
      <span className="min-w-0 flex-1">
        <span lang="pt-PT" className="font-medium">{item.pt}</span>
        <span className="block text-sm text-muted">
          {item.de}
          {item.note && ` · ${item.note}`}
        </span>
        <SoundHint sound={item.sound} className="text-xs" />
      </span>
      <Progress review={review} />
    </li>
  );
}

function VerbRow({
  verb,
  linked,
  reviews,
  expanded,
  toggle,
}: {
  verb: VerbDef;
  linked: Item[];
  reviews: Map<string, ReviewState>;
  expanded: boolean;
  toggle: () => void;
}) {
  // Vokabeln, die genau einer Form entsprechen, zeigen ihren Balken in der Tabelle;
  // der Rest (Wendungen wie „gosto de“, „se faz favor“) steht darunter
  const forms = new Set(formsOf(verb).map(lower));
  const byForm = new Map(linked.filter((i) => forms.has(lower(i.pt))).map((i) => [lower(i.pt), i]));
  const phrases = linked.filter((i) => !forms.has(lower(i.pt)));
  const formProgress = (pt: string) => {
    const item = byForm.get(lower(pt));
    return <Progress review={item ? reviews.get(item.id) : undefined} tracked={!!item} />;
  };
  const sound = verb.sound ?? byForm.get(lower(verb.inf))?.sound;

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <AudioButtons text={verb.inf} />
        <span className="min-w-0 flex-1">
          <span lang="pt-PT" className="font-medium">{verb.inf}</span>
          <span className="block text-sm text-muted">{verb.de}</span>
          <SoundHint sound={sound} className="text-xs" />
          <button type="button" className="mt-1 text-sm text-accent hover:underline" aria-expanded={expanded} onClick={toggle}>
            {expanded ? "Formen ausblenden" : "Alle Formen und Fortschritt"}
          </button>
        </span>
      </div>
      {expanded && (
        <div className="mt-3 space-y-4 rounded-xl border border-line bg-bg p-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex-1 text-muted">Konjugation geübt</span>
            <Progress review={reviews.get(verbId(verb.inf))} />
          </div>
          {byForm.has(lower(verb.inf)) && (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex-1">
                <span className="text-muted">Grundform </span>
                <span lang="pt-PT" className="font-medium">{verb.inf}</span>
              </span>
              {formProgress(verb.inf)}
            </div>
          )}
          <ConjugationTable verb={verb} compact aside={formProgress} />
          {phrases.length > 0 && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Wendungen</p>
              <ul>
                {phrases.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-1">
                    <span className="min-w-0 flex-1 px-1">
                      <span lang="pt-PT" className="font-medium">{i.pt}</span>
                      <span className="ml-2 text-xs text-muted">{i.de}</span>
                    </span>
                    <Progress review={reviews.get(i.id)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** Lernbalken; `tracked = false` heißt: diese Form wird nicht einzeln abgefragt */
function Progress({ review, tracked = true }: { review?: ReviewState; tracked?: boolean }) {
  if (!tracked) return <span className="w-20 shrink-0" />;
  return (
    <span className="w-20 shrink-0 text-right" title={review ? `Box ${review.box} von ${MAX_BOX}` : "noch nicht gelernt"}>
      <span className="block text-[11px] text-muted">{review ? boxLabel(review.box) : "–"}</span>
      <span className="mt-1 flex gap-0.5">
        {Array.from({ length: MAX_BOX }, (_, b) => (
          <span key={b} className={`h-1.5 flex-1 rounded-full ${review && b < review.box ? "bg-ok" : "bg-surface-2"}`} />
        ))}
      </span>
    </span>
  );
}
