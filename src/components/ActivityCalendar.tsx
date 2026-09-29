"use client";

import { useMemo } from "react";
import type { ActivityDay } from "@/lib/data";
import { addDays, dayKey } from "@/lib/date";

const WEEKS = 17; // rund vier Monate
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const ROW_LABELS = ["Mo", "", "Mi", "", "Fr", "", ""];

/**
 * Aktivität der letzten Monate als Raster: eine Spalte pro Woche (Mo–So), ein Feld pro Tag.
 * Je mehr XP, desto kräftiger; Tage mit erreichtem Tagesziel sind grün.
 */
export function ActivityCalendar({ activity, goal }: { activity: ActivityDay[]; goal: number }) {
  const { weeks, months, activeDays, totalXp } = useMemo(() => {
    const xpByDay = new Map(activity.map((a) => [a.day, a.xp]));
    const today = new Date();
    // Montag der aktuellen Woche, dann WEEKS-1 Wochen zurück
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    const start = addDays(monday, -7 * (WEEKS - 1));
    const todayKey = dayKey(today);

    const weeks = Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(start, w * 7 + d);
        const key = dayKey(date);
        return { key, date, xp: xpByDay.get(key) ?? 0, future: key > todayKey };
      }),
    );
    // Monatsname über der ersten Woche, die in diesem Monat beginnt
    const months = weeks.map((week, w) => {
      const m = week[0].date.getMonth();
      return w === 0 || m !== weeks[w - 1][0].date.getMonth() ? MONTHS[m] : "";
    });
    const days = weeks.flat().filter((d) => !d.future);
    return {
      weeks,
      months,
      activeDays: days.filter((d) => d.xp > 0).length,
      totalXp: days.reduce((sum, d) => sum + d.xp, 0),
    };
  }, [activity]);

  const cell = (xp: number, future: boolean) => {
    if (future) return "bg-transparent";
    if (!xp) return "bg-surface-2";
    if (xp >= goal) return "bg-ok";
    return xp >= goal / 2 ? "bg-accent/70" : "bg-accent/35";
  };

  return (
    <div>
      <div className="flex gap-1.5">
        <div className="grid shrink-0 grid-rows-7 gap-[3px] pt-4 text-[9px] leading-none text-muted">
          {ROW_LABELS.map((l, i) => (
            <span key={i} className="flex h-full items-center">{l}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 grid h-3 text-[9px] leading-none text-muted" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
            {months.map((m, i) => (
              <span key={i} className="whitespace-nowrap">{m}</span>
            ))}
          </div>
          <div
            className="grid grid-flow-col grid-rows-7 gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}
            role="img"
            aria-label={`Aktivität der letzten ${WEEKS} Wochen: ${activeDays} aktive Tage, ${totalXp} XP`}
          >
            {weeks.flat().map((d) => (
              <span
                key={d.key}
                className={`aspect-square rounded-[3px] ${cell(d.xp, d.future)}`}
                title={d.future ? undefined : `${d.date.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}: ${d.xp} XP`}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>
          {activeDays} aktive Tage · {totalXp} XP
        </span>
        <span className="flex items-center gap-1">
          weniger
          {["bg-surface-2", "bg-accent/35", "bg-accent/70", "bg-ok"].map((c) => (
            <span key={c} className={`h-2.5 w-2.5 rounded-[3px] ${c}`} />
          ))}
          Ziel erreicht
        </span>
      </div>
    </div>
  );
}
