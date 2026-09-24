"use client";

import Link from "next/link";
import { allLessons, course } from "@/content";
import { addDays, dayKey } from "@/lib/date";
import { unitProgressId } from "@/lib/exercises";
import { useApp } from "./AppProvider";
import { IconCheck, IconFlame, IconMic, IconRepeat } from "./icons";

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function Dashboard() {
  const { progress, today, settings, streak, dueIds, activity, reviews, loaded } = useApp();
  // Nächster Schritt: nächste offene Lektion – oder der Abschluss einer fertig gelernten Unit
  const steps = course.flatMap((u) => [
    ...u.lessons.map((l) => ({ id: l.id, href: `/lektion/${l.id}`, title: l.title, subtitle: l.subtitle })),
    ...(u.speaking
      ? [{ id: unitProgressId(u.id), href: `/abschluss/${u.id}`, title: `Abschluss: ${u.title}`, subtitle: "Wiederholen, Rollenspiel und frei sprechen" }]
      : []),
  ]);
  const nextStep = steps.find((st) => !progress.has(st.id));
  const todayXp = today?.xp ?? 0;
  const goal = settings.daily_goal_xp;
  const done = allLessons.filter((l) => progress.has(l.id)).length;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6);
    const xp = activity.find((a) => a.day === dayKey(d))?.xp ?? 0;
    return { label: WEEKDAYS[d.getDay()], xp, isToday: i === 6 };
  });
  const maxXp = Math.max(goal, ...week.map((w) => w.xp));

  return (
    <div className={loaded ? "" : "opacity-60"}>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <p className="text-sm text-muted">{nextStep ? (done ? "Weiter geht's mit" : "Los geht's mit") : "Kurs abgeschlossen"}</p>
          <h1 className="mt-1 font-serif text-3xl">{nextStep ? nextStep.title : "Parabéns!"}</h1>
          <p className="mt-1 text-muted">{nextStep ? nextStep.subtitle : "Du hast alle Lektionen geschafft – wiederhole regelmäßig, damit es sitzt."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {nextStep && (
              <Link href={nextStep.href} className="btn-primary">
                Starten
              </Link>
            )}
            <Link href="/wiederholen" className="btn-ghost">
              <IconRepeat className="h-4 w-4" />
              {dueIds.length ? `${dueIds.length} fällig` : "Üben"}
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted">Tagesziel</p>
            <p className="flex items-center gap-1 text-sm text-warm">
              <IconFlame className="h-4 w-4" /> {streak} {streak === 1 ? "Tag" : "Tage"}
            </p>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {todayXp} <span className="text-base font-normal text-muted">/ {goal} XP</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-all ${todayXp >= goal ? "bg-ok" : "bg-accent"}`}
              style={{ width: `${Math.min(100, (100 * todayXp) / goal)}%` }}
            />
          </div>
          <div className="mt-5 flex h-16 items-end gap-1.5" aria-label="XP der letzten 7 Tage">
            {week.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm ${w.xp >= goal ? "bg-ok" : w.xp ? "bg-accent/60" : "bg-surface-2"}`}
                  style={{ height: `${Math.max(4, (40 * w.xp) / maxXp)}px` }}
                  title={`${w.xp} XP`}
                />
                <span className={`text-[10px] ${w.isToday ? "font-semibold" : "text-muted"}`}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="mt-4 text-sm text-muted">
        {done} von {allLessons.length} Lektionen · {reviews.size} Wörter und Sätze gelernt
      </p>

      <div className="mt-10 space-y-10">
        {course.map((unit, ui) => {
          const unitDone = unit.lessons.filter((l) => progress.has(l.id)).length;
          return (
            <section key={unit.id}>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Unit {ui + 1}</p>
                  <h2 className="font-serif text-2xl">{unit.title}</h2>
                  <p className="text-sm text-muted">{unit.description}</p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-muted">
                  {unitDone}/{unit.lessons.length}
                </span>
              </div>
              <ol className="card divide-y divide-line overflow-hidden">
                {unit.lessons.map((l) => {
                  const p = progress.get(l.id);
                  const isNext = nextStep?.id === l.id;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/lektion/${l.id}`}
                        className={`flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2 ${isNext ? "bg-accent-soft" : ""}`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
                            p ? "border-ok bg-ok text-bg" : isNext ? "border-accent text-accent" : "border-line text-muted"
                          }`}
                        >
                          {p ? <IconCheck className="h-4 w-4" /> : allLessons.indexOf(l) + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium" lang="pt-PT">{l.title}</span>
                          <span className="block truncate text-sm text-muted">{l.subtitle}</span>
                        </span>
                        {p ? (
                          <span className="text-right text-xs text-muted">
                            {p.best_score} %<span className="block">{p.times_completed}× geübt</span>
                          </span>
                        ) : isNext ? (
                          <span className="text-sm font-medium text-accent">Start →</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
                {unit.speaking && (() => {
                  const cp = progress.get(unitProgressId(unit.id));
                  const isNext = nextStep?.id === unitProgressId(unit.id);
                  return (
                    <li>
                      <Link
                        href={`/abschluss/${unit.id}`}
                        className={`flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2 ${isNext ? "bg-accent-soft" : ""}`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                            cp ? "border-ok bg-ok text-bg" : isNext ? "border-accent text-accent" : "border-line text-muted"
                          }`}
                        >
                          {cp ? <IconCheck className="h-4 w-4" /> : <IconMic className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">Abschluss</span>
                          <span className="block truncate text-sm text-muted">Wiederholen, Rollenspiel und frei sprechen</span>
                        </span>
                        {cp ? (
                          <span className="text-right text-xs text-muted">{cp.times_completed}× geübt</span>
                        ) : isNext ? (
                          <span className="text-sm font-medium text-accent">Start →</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })()}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
