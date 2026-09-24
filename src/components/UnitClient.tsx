"use client";

import { course } from "@/content";
import { unitExercises, unitProgressId } from "@/lib/exercises";
import { SessionRunner } from "./SessionRunner";

export function UnitClient({ unitId }: { unitId: string }) {
  const unit = course.find((u) => u.id === unitId)!;
  return (
    <SessionRunner
      title={`Abschluss: ${unit.title}`}
      xpBase={20}
      progressId={unitProgressId(unit.id)}
      build={(opts) => unitExercises(unit, opts)}
    />
  );
}
