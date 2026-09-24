"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { DEFAULT_SETTINGS, loadAll, type ActivityDay, type LessonProgress, type Settings } from "@/lib/data";
import type { ReviewState } from "@/lib/srs";
import { computeStreak, dayKey } from "@/lib/date";
import { itemIndex } from "@/content";
import { setSpeechRate } from "@/lib/speech";

type AppState = {
  session: Session | null;
  authReady: boolean;
  /** Daten mindestens einmal geladen */
  loaded: boolean;
  error: string | null;
  settings: Settings;
  progress: Map<string, LessonProgress>;
  activity: ActivityDay[];
  reviews: Map<string, ReviewState>;
  today: ActivityDay | undefined;
  streak: number;
  dueIds: string[];
  refresh: () => Promise<void>;
  setSettingsLocal: (s: Settings) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [reviews, setReviews] = useState<ReviewState[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const apply = useCallback((d: Awaited<ReturnType<typeof loadAll>>) => {
    setSettings(d.settings);
    setSpeechRate(d.settings.speech_rate);
    setProgress(d.progress);
    setActivity(d.activity);
    setReviews(d.reviews);
    setError(null);
    setNow(Date.now());
    setLoaded(true);
  }, []);
  const fail = useCallback((e: unknown) => setError(e instanceof Error ? e.message : String(e)), []);

  const refresh = useCallback(async () => {
    if (userId) await loadAll(userId).then(apply, fail);
  }, [userId, apply, fail]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadAll(userId).then(
      (d) => !cancelled && apply(d),
      (e) => !cancelled && fail(e),
    );
    return () => {
      cancelled = true;
    };
  }, [userId, apply, fail]);

  const value = useMemo<AppState>(() => {
    const todayKey = dayKey(new Date(now));
    return {
      session,
      authReady,
      loaded,
      error,
      settings,
      progress: new Map(progress.map((p) => [p.lesson_id, p])),
      activity,
      reviews: new Map(reviews.map((r) => [r.item_id, r])),
      today: activity.find((a) => a.day === todayKey),
      streak: computeStreak(new Set(activity.filter((a) => a.xp > 0).map((a) => a.day)), new Date(now)),
      dueIds: reviews
        .filter((r) => new Date(r.due_at).getTime() <= now && itemIndex.has(r.item_id))
        .sort((a, b) => a.box - b.box || a.due_at.localeCompare(b.due_at))
        .map((r) => r.item_id),
      refresh,
      setSettingsLocal: (s) => {
        setSettings(s);
        setSpeechRate(s.speech_rate);
      },
    };
  }, [session, authReady, loaded, now, error, settings, progress, activity, reviews, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp außerhalb von AppProvider");
  return ctx;
}
