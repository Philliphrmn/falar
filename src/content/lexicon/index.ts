import type { LexEntry, UnitLexicon, VerbDef } from "../types";
import { u1 } from "./u1";
import { u2 } from "./u2";
import { u3 } from "./u3";
import { u4 } from "./u4";
import { verbList } from "./verbs";

/** Lexikon je Unit, Schlüssel = Unit-ID (wie in units/) */
export const unitLexicons: Record<string, UnitLexicon> = { u1, u2, u3, u4 };

/** Jede Vokabel hat genau einen Eintrag (npm run check stellt das sicher) */
export const lexicon = new Map<string, LexEntry>(Object.values(unitLexicons).flatMap((l) => Object.entries(l.words)));

export const verbs = new Map<string, VerbDef>(verbList.map((v) => [v.inf, v]));

export const PERSONS = ["eu", "tu", "ele/ela/você", "nós", "eles/elas/vocês"] as const;
export const PERSONS_DE = ["ich", "du", "er/sie/Sie", "wir", "sie/Sie (Plural)"] as const;
