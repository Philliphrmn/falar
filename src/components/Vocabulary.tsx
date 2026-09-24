"use client";

import { useMemo, useState } from "react";
import { course, lessonItems } from "@/content";
import { boxLabel, MAX_BOX } from "@/lib/srs";
import { stripAccents } from "@/lib/answer";
import { useApp } from "./AppProvider";
import { AudioButtons } from "./player/Exercises";

export function Vocabulary() {
  const { reviews } = useApp();
  const [query, setQuery] = useState("");
  const [onlyLearned, setOnlyLearned] = useState(false);

  const q = stripAccents(query.toLowerCase().trim());
  const units = useMemo(
    () =>
      course.map((u) => ({
        ...u,
        lessons: u.lessons.map((l) => ({ ...l, items: lessonItems(l).words })),
      })),
    [],
  );

  return (
    <div>
      <h1 className="font-serif text-3xl">Vokabeln</h1>
      <p className="mt-2 text-muted">Alle Wörter des Kurses. Der Balken zeigt, wie sicher du ein Wort schon kannst.</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input className="input max-w-xs" placeholder="Suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyLearned} onChange={(e) => setOnlyLearned(e.target.checked)} />
          nur gelernte
        </label>
      </div>

      {units.map((u) => (
        <section key={u.id} className="mt-10">
          <h2 className="mb-3 text-sm uppercase tracking-wide text-muted">{u.title}</h2>
          {u.lessons.map((l) => {
            const items = l.items.filter((i) => {
              if (onlyLearned && !reviews.has(i.id)) return false;
              if (!q) return true;
              return stripAccents(`${i.pt} ${i.de}`.toLowerCase()).includes(q);
            });
            if (!items.length) return null;
            return (
              <div key={l.id} className="mb-6">
                <h3 className="mb-2 font-medium" lang="pt-PT">{l.title}</h3>
                <ul className="card divide-y divide-line">
                  {items.map((i) => {
                    const r = reviews.get(i.id);
                    return (
                      <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                        <AudioButtons text={i.pt} />
                        <span className="min-w-0 flex-1">
                          <span lang="pt-PT" className="font-medium">{i.pt}</span>
                          <span className="block text-sm text-muted">
                            {i.de}
                            {i.note && ` · ${i.note}`}
                          </span>
                        </span>
                        <span className="w-20 shrink-0 text-right" title={r ? `Box ${r.box} von ${MAX_BOX}` : "noch nicht gelernt"}>
                          <span className="block text-[11px] text-muted">{r ? boxLabel(r.box) : "–"}</span>
                          <span className="mt-1 flex gap-0.5">
                            {Array.from({ length: MAX_BOX }, (_, b) => (
                              <span key={b} className={`h-1.5 flex-1 rounded-full ${r && b < r.box ? "bg-ok" : "bg-surface-2"}`} />
                            ))}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
