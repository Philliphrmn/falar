import { course } from "./course";
import { lexicon, PERSONS, PERSONS_DE, verbs } from "./lexicon";
import type {
  Dialogue,
  DialogueLine,
  GrammarNote,
  Item,
  LessonDef,
  LexEntry,
  PartOfSpeech,
  SpeakingTask,
  UnitDef,
  VerbDef,
} from "./types";

export { course, lexicon, verbs, PERSONS, PERSONS_DE };
export type { Dialogue, DialogueLine, GrammarNote, Item, LessonDef, LexEntry, PartOfSpeech, SpeakingTask, UnitDef, VerbDef };

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
export const verbId = (inf: string) => `v:${slug(inf)}`;

export const allLessons: LessonDef[] = course.flatMap((u) => u.lessons);

export function getLesson(id: string) {
  return allLessons.find((l) => l.id === id);
}

/** Verben, die in dieser Lektion zum ersten Mal vorkommen (über Vokabeln mit lexicon.verb) */
export function lessonVerbs(lesson: LessonDef): VerbDef[] {
  return verbsByLesson.get(lesson.id) ?? [];
}

const verbsByLesson: Map<string, VerbDef[]> = (() => {
  const map = new Map<string, VerbDef[]>();
  const seen = new Set<string>();
  for (const lesson of allLessons) {
    for (const [pt] of lesson.words) {
      const inf = lexicon.get(pt)?.verb;
      const v = inf ? verbs.get(inf) : undefined;
      if (!v || seen.has(v.inf)) continue;
      seen.add(v.inf);
      map.set(lesson.id, [...(map.get(lesson.id) ?? []), v]);
    }
  }
  return map;
})();

export function lessonItems(lesson: LessonDef): { words: Item[]; sentences: Item[]; verbs: Item[] } {
  return {
    words: lesson.words.map(([pt, de, note]) => ({
      id: wordId(pt),
      kind: "word",
      pt,
      de,
      note,
      altPt: [],
      lessonId: lesson.id,
      pos: lexicon.get(pt)?.pos,
      sound: lexicon.get(pt)?.sound,
    })),
    sentences: lesson.sentences.map(([pt, de, altPt]) => ({
      id: sentenceId(pt),
      kind: "sentence",
      pt,
      de,
      altPt: altPt ?? [],
      lessonId: lesson.id,
    })),
    verbs: lessonVerbs(lesson).map((v) => ({
      id: verbId(v.inf),
      kind: "verb",
      pt: v.inf,
      de: v.de,
      altPt: [],
      lessonId: lesson.id,
      pos: "verb",
      sound: v.sound,
    })),
  };
}

/** Alle Vokabeln und Sätze, nach ID. Bei doppelten Einträgen gewinnt das erste Vorkommen. */
export const itemIndex: Map<string, Item> = (() => {
  const map = new Map<string, Item>();
  for (const lesson of allLessons) {
    const { words, sentences, verbs } = lessonItems(lesson);
    for (const item of [...words, ...sentences, ...verbs]) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
  }
  return map;
})();

export const allWords = [...itemIndex.values()].filter((i) => i.kind === "word");

/** Verb zu einem Vokabel-Item (Infinitiv oder Konjugationsform) */
export function verbOf(item: Pick<Item, "kind" | "pt">): VerbDef | undefined {
  const inf = item.kind === "verb" ? item.pt : lexicon.get(item.pt)?.verb;
  return inf ? verbs.get(inf) : undefined;
}

export const POS_LABELS: Record<PartOfSpeech, string> = {
  verb: "Verben",
  noun: "Nomen",
  adj: "Adjektive",
  adv: "Adverbien",
  pron: "Pronomen",
  num: "Zahlen",
  question: "Fragewörter",
  prep: "Präpositionen",
  conj: "Bindewörter",
  art: "Artikel",
  phrase: "Wendungen",
};
