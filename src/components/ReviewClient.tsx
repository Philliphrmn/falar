"use client";

import { reviewExercises } from "@/lib/exercises";
import { REVIEW_SESSION_SIZE, XP } from "@/lib/learning";
import { useApp } from "./AppProvider";
import { SessionRunner } from "./SessionRunner";

export function ReviewClient() {
  const { dueIds, reviews } = useApp();
  // Nichts fällig: freies Üben der schwächsten Einträge – ohne Einfluss auf die Boxen
  const practice = dueIds.length === 0;
  return (
    <SessionRunner
      title={practice ? "Üben" : "Wiederholung"}
      xpBase={practice ? XP.practice : XP.review}
      srs={!practice}
      build={(opts) => {
        const ids = practice
          ? [...reviews.values()]
              .sort((a, b) => a.box - b.box || b.wrong_count - a.wrong_count)
              .slice(0, REVIEW_SESSION_SIZE)
              .map((r) => r.item_id)
          : dueIds.slice(0, REVIEW_SESSION_SIZE);
        return reviewExercises(ids, opts);
      }}
    />
  );
}
