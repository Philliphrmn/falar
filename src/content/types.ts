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
  kind: "word" | "sentence" | "verb";
  pt: string;
  de: string;
  altPt: string[];
  note?: string;
  lessonId: string;
  /** Aus dem Lexikon: Wortart und Aussprachehilfe */
  pos?: PartOfSpeech;
  sound?: string;
};

/** Wortart – für Filter in der Vokabelliste */
export type PartOfSpeech =
  | "verb"
  | "noun"
  | "adj"
  | "adv"
  | "pron"
  | "num"
  | "prep"
  | "conj"
  | "art"
  | "question"
  | "phrase";

export type LexEntry = {
  pos: PartOfSpeech;
  /** Aussprache in deutscher Umschrift, nur bei kniffligen Wörtern, z. B. „dschkulp“ */
  sound?: string;
  /** Infinitiv, wenn das Wort eine Verbform ist oder ein Verb enthält (z. B. „gosto de“ → „gostar“) */
  verb?: string;
};

/** Personen im Präsens: eu, tu, ele/ela/você, nós, eles/elas/vocês */
export type PresentForms = [eu: string, tu: string, ele: string, nos: string, eles: string];

export type VerbDef = {
  inf: string;
  de: string;
  present: PresentForms;
  /** Weitere Formen, die im Kurs vorkommen, z. B. Imperativ „siga“ oder „queria“ */
  extra?: { label: string; forms: [pt: string, de: string][] }[];
  /** Kurzer Hinweis, z. B. „unregelmäßig“ */
  note?: string;
  sound?: string;
};

export type UnitLexicon = {
  /** Schlüssel: portugiesischer Text genau wie in LessonDef.words */
  words: Record<string, LexEntry>;
  /** Verben, die in dieser Unit zum ersten Mal vorkommen */
  verbs?: VerbDef[];
  /**
   * Abgewandelte Formen, die in Sätzen vorkommen, aber keine eigene Vokabel sind:
   * Form (klein) → Vokabel (genau wie in words), z. B. „filhos“ → „o filho“.
   */
  forms?: Record<string, string>;
  /** Eigennamen, die nicht erklärt werden müssen (Ana, Lisboa …) */
  names?: string[];
};
