/**
 * Stellschrauben der Lernlogik an einem Ort (siehe docs/INHALT.md, „Lernlogik“).
 */

/** XP je abgeschlossener Sitzung */
export const XP = {
  lesson: 10,
  review: 10,
  /** Freies Üben, wenn nichts fällig ist – verändert die Wiederholungs-Boxen nicht */
  practice: 5,
  unit: 20,
  /** Bonus für 100 % beim ersten Versuch */
  perfect: 5,
} as const;

/** Höchstens so viele fällige Einträge pro Wiederholungs-Sitzung */
export const REVIEW_SESSION_SIZE = 15;

/** Neue Einträge in schon abgeschlossenen Lektionen: höchstens so viele werden pro Tag fällig */
export const BACKFILL_PER_DAY = 12;
