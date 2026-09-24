/** Lokales Datum als YYYY-MM-DD */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Anzahl aufeinanderfolgender Tage mit XP, endend heute (oder gestern, falls heute noch nichts) */
export function computeStreak(activeDays: Set<string>, today = new Date()) {
  let cursor = activeDays.has(dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (activeDays.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
