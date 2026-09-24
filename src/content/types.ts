/** [portugiesisch, deutsch, hinweis?] */
export type WordDef = [pt: string, de: string, note?: string];
/** [portugiesisch, deutsch, weitere akzeptierte portugiesische Varianten?] */
export type SentenceDef = [pt: string, de: string, altPt?: string[]];

export type GrammarNote = {
  title: string;
  body: string[];
  examples?: { pt: string; de: string }[];
};

export type LessonDef = {
  id: string;
  title: string;
  subtitle: string;
  grammar?: GrammarNote;
  words: WordDef[];
  sentences: SentenceDef[];
};

export type UnitDef = {
  id: string;
  title: string;
  description: string;
  lessons: LessonDef[];
};

export type Item = {
  id: string;
  kind: "word" | "sentence";
  pt: string;
  de: string;
  altPt: string[];
  note?: string;
  lessonId: string;
};
