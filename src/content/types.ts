/** [portugiesisch, deutsch, hinweis?] */
export type WordDef = [pt: string, de: string, note?: string];
/** [portugiesisch, deutsch, weitere akzeptierte portugiesische Varianten?] */
export type SentenceDef = [pt: string, de: string, altPt?: string[]];

export type GrammarNote = {
  title: string;
  body: string[];
  examples?: { pt: string; de: string }[];
};

/**
 * Eine Dialogzeile: „a“ spricht die Gesprächspartnerin, „b“ spricht der Lernende.
 * [sprecher, portugiesisch, deutsch, weitere akzeptierte Varianten (nur für b)?]
 */
export type DialogueLine = [who: "a" | "b", pt: string, de: string, altPt?: string[]];

export type Dialogue = {
  /** Situation auf Deutsch, z. B. „Im Café an der Ecke“ */
  situation: string;
  /** Name der Gesprächspartnerin */
  partner: string;
  lines: DialogueLine[];
  /** Verständnisfrage auf Deutsch; die erste Option ist die richtige */
  question: { q: string; options: [string, ...string[]] };
};

/** Freie Sprechaufgabe: Situation → eigene Antwort → Musterlösung */
export type SpeakingTask = {
  prompt: string;
  hints: string[];
  model: { pt: string; de: string }[];
};

export type LessonDef = {
  id: string;
  title: string;
  subtitle: string;
  grammar?: GrammarNote;
  /** Kurzer Aussprache-Tipp für europäisches Portugiesisch */
  sound?: GrammarNote;
  words: WordDef[];
  sentences: SentenceDef[];
  dialogue?: Dialogue;
};

export type UnitDef = {
  id: string;
  title: string;
  description: string;
  lessons: LessonDef[];
  /** Freie Sprechaufgaben für den Unit-Abschluss */
  speaking?: SpeakingTask[];
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
