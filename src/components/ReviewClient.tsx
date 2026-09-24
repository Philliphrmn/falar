"use client";

import { reviewExercises } from "@/lib/exercises";
import { useApp } from "./AppProvider";
import { SessionRunner } from "./SessionRunner";

const SESSION_SIZE = 15;

export function ReviewClient() {
  const { dueIds, reviews } = useApp();
  return (
    <SessionRunner
      title="Wiederholung"
      xpBase={10}
      build={(opts) => {
        let ids = dueIds.slice(0, SESSION_SIZE);
        if (!ids.length) {
          // Nichts fällig: die schwächsten bisher gelernten Einträge üben
          ids = [...reviews.values()]
            .sort((a, b) => a.box - b.box || b.wrong_count - a.wrong_count)
            .slice(0, SESSION_SIZE)
            .map((r) => r.item_id);
        }
        return reviewExercises(ids, opts);
      }}
    />
  );
}
