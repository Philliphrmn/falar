"use client";

import { getLesson } from "@/content";
import { lessonExercises } from "@/lib/exercises";
import { SessionRunner } from "./SessionRunner";

export function LessonClient({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId)!;
  return (
    <SessionRunner
      lesson={lesson}
      title={lesson.title}
      xpBase={10}
      build={(opts) => lessonExercises(lesson, opts)}
    />
  );
}
