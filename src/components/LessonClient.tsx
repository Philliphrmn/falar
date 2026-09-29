"use client";

import { getLesson } from "@/content";
import { lessonExercises } from "@/lib/exercises";
import { XP } from "@/lib/learning";
import { SessionRunner } from "./SessionRunner";

export function LessonClient({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId)!;
  return (
    <SessionRunner
      lesson={lesson}
      title={lesson.title}
      xpBase={XP.lesson}
      build={(opts) => lessonExercises(lesson, opts)}
    />
  );
}
