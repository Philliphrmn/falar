import { course } from "./course";
import type { GrammarNote, Item, LessonDef, UnitDef } from "./types";

export { course };
export type { GrammarNote, Item, LessonDef, UnitDef };

// Akzente bleiben erhalten, sonst fallen z. B. „está“ und „esta“ zusammen
function slug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

export const wordId = (pt: string) => `w:${slug(pt)}`;
export const sentenceId = (pt: string) => `s:${slug(pt)}`;

export const allLessons: LessonDef[] = course.flatMap((u) => u.lessons);

export function getLesson(id: string) {
  return allLessons.find((l) => l.id === id);
}

export function getUnitOfLesson(id: string) {
  return course.find((u) => u.lessons.some((l) => l.id === id));
}

export function lessonItems(lesson: LessonDef): { words: Item[]; sentences: Item[] } {
  return {
    words: lesson.words.map(([pt, de, note]) => ({
      id: wordId(pt),
      kind: "word",
      pt,
      de,
      note,
      altPt: [],
      lessonId: lesson.id,
    })),
    sentences: lesson.sentences.map(([pt, de, altPt]) => ({
      id: sentenceId(pt),
      kind: "sentence",
      pt,
      de,
      altPt: altPt ?? [],
      lessonId: lesson.id,
    })),
  };
}

/** Alle Vokabeln und Sätze, nach ID. Bei doppelten Einträgen gewinnt das erste Vorkommen. */
export const itemIndex: Map<string, Item> = (() => {
  const map = new Map<string, Item>();
  for (const lesson of allLessons) {
    const { words, sentences } = lessonItems(lesson);
    for (const item of [...words, ...sentences]) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
  }
  return map;
})();

export const allWords = [...itemIndex.values()].filter((i) => i.kind === "word");
