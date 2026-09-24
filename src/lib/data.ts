import { supabase } from "./supabase";
import { addDays, dayKey } from "./date";
import { nextState, type ReviewState } from "./srs";

export type Settings = { daily_goal_xp: number; speech_rate: number };
export type LessonProgress = { lesson_id: string; best_score: number; times_completed: number };
export type ActivityDay = { day: string; xp: number; lessons: number };

export const DEFAULT_SETTINGS: Settings = { daily_goal_xp: 30, speech_rate: 0.9 };

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function loadAll(userId: string) {
  const since = dayKey(addDays(new Date(), -120));
  const [settings, progress, activity, reviews] = await Promise.all([
    supabase.from("user_settings").select("daily_goal_xp, speech_rate").eq("user_id", userId).maybeSingle(),
    supabase.from("lesson_progress").select("lesson_id, best_score, times_completed").eq("user_id", userId),
    supabase.from("activity_days").select("day, xp, lessons").eq("user_id", userId).gte("day", since),
    supabase.from("review_items").select("item_id, box, due_at, correct_count, wrong_count").eq("user_id", userId),
  ]);
  return {
    settings: (must(settings) as Settings | null) ?? DEFAULT_SETTINGS,
    progress: must(progress) as LessonProgress[],
    activity: must(activity) as ActivityDay[],
    reviews: must(reviews) as ReviewState[],
  };
}

export async function saveSettings(userId: string, settings: Settings) {
  must(
    await supabase
      .from("user_settings")
      .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }),
  );
}

export type ItemResult = { itemId: string; correct: boolean };

/** Speichert Ergebnis einer Lektion bzw. Wiederholung: Leitner-Boxen, XP, Lektionsfortschritt. */
export async function saveSession(
  userId: string,
  opts: {
    results: ItemResult[];
    xp: number;
    lesson?: { id: string; score: number; prev?: LessonProgress };
    reviews: Map<string, ReviewState>;
    today?: ActivityDay;
  },
) {
  const now = new Date();

  // Pro Element zählt: einmal falsch in der Sitzung = falsch
  const perItem = new Map<string, boolean>();
  for (const r of opts.results) perItem.set(r.itemId, (perItem.get(r.itemId) ?? true) && r.correct);
  const reviewRows = [...perItem].map(([id, correct]) => ({
    user_id: userId,
    ...nextState(id, opts.reviews.get(id), correct, now),
    last_seen_at: now.toISOString(),
  }));

  const day = dayKey(now);
  const writes: PromiseLike<{ error: { message: string } | null }>[] = [
    supabase.from("activity_days").upsert({
      user_id: userId,
      day,
      xp: (opts.today?.xp ?? 0) + opts.xp,
      lessons: (opts.today?.lessons ?? 0) + (opts.lesson ? 1 : 0),
    }),
  ];
  if (reviewRows.length) writes.push(supabase.from("review_items").upsert(reviewRows));
  if (opts.lesson) {
    writes.push(
      supabase.from("lesson_progress").upsert({
        user_id: userId,
        lesson_id: opts.lesson.id,
        best_score: Math.max(opts.lesson.score, opts.lesson.prev?.best_score ?? 0),
        times_completed: (opts.lesson.prev?.times_completed ?? 0) + 1,
        last_completed_at: now.toISOString(),
      }),
    );
  }
  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
