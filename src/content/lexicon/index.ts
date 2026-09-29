import type { LexEntry, UnitLexicon, VerbDef } from "../types";
import { u1 } from "./u1";
import { u2 } from "./u2";
import { u3 } from "./u3";
import { u4 } from "./u4";
import { verbList } from "./verbs";

export const unitLexicons: UnitLexicon[] = [u1, u2, u3, u4];

/** Steht ein Wort in mehreren Units, gilt der erste Eintrag */
export const lexicon = new Map<string, LexEntry>(unitLexicons.flatMap((l) => Object.entries(l.words)).reverse());

export const verbs = new Map<string, VerbDef>(
  [...verbList, ...unitLexicons.flatMap((l) => l.verbs ?? [])].map((v) => [v.inf, v]),
);

export const PERSONS = ["eu", "tu", "ele/ela/você", "nós", "eles/elas/vocês"] as const;
export const PERSONS_DE = ["ich", "du", "er/sie/Sie", "wir", "sie/Sie (Plural)"] as const;
