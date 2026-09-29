# Regeln für Inhalte und Lernlogik

Diese Regeln halten den Kurs einheitlich, auch wenn neue Lektionen dazukommen.
`npm run check` prüft sie automatisch und läuft vor jedem Build – ein Verstoß
verhindert das Deployment. Jede Meldung nennt die Regelnummer (z. B. `[R4]`).

## Aufbau

| Was | Wo |
| --- | --- |
| Lektionen einer Unit (Wörter, Sätze, Grammatik, Aussprache, Dialog) | `src/content/units/<unit>.ts` |
| Wortart, Verb-Zuordnung, Aussprachehilfe je Vokabel | `src/content/lexicon/<unit>.ts` |
| Konjugationstabellen aller Verben | `src/content/lexicon/verbs.ts` |
| Reihenfolge der Units | `src/content/course.ts` |
| Festgeschriebene Fortschritts-IDs | `src/content/ids.json` |
| Aufnahmen | `public/audio/`, Zuordnung in `src/content/audio.json` |

## Neue Lektion hinzufügen – Ablauf

1. Lektion in `units/<unit>.ts` anlegen (neue Unit: Datei anlegen, in `course.ts`
   eintragen, dazu `lexicon/<unit>.ts` anlegen und in `lexicon/index.ts` eintragen).
2. Für jede neue Vokabel einen Lexikon-Eintrag anlegen (R4), neue Verben in `verbs.ts` (R6).
3. `npm run check` – solange Meldungen kommen, nachbessern.
4. `AZURE_SPEECH_KEY=… npm run audio` vertont alle neuen Texte (R8).
5. `npm run check -- --write-ids` schreibt die neuen Fortschritts-IDs fest (R2).

## Regeln

**R1 – Eindeutige IDs.** Unit- und Lektions-IDs sind eindeutig. Jede Unit hat genau
ein Lexikon mit derselben ID.

**R2 – Fortschritt bleibt erhalten.** Der Lernstand hängt an IDs, die aus dem
portugiesischen Text abgeleitet werden (`w:<wort>`, `s:<satz>`, `v:<infinitiv>`) bzw. an
Lektions-IDs. Deshalb:
- Portugiesischen Text bestehender Vokabeln und Sätze **nie ändern** (Deutsch, Hinweise,
  Grammatik, Dialoge, `altPt` dürfen geändert werden).
- Lektionen und Units nie umbenennen oder löschen. Ein Wort darf in eine andere Lektion
  verschoben werden – seine ID bleibt gleich.
- Neue IDs werden mit `npm run check -- --write-ids` festgeschrieben; verschwindet danach
  eine festgeschriebene ID, schlägt die Prüfung fehl.

**R3 – Lektionen.** Mindestens 5 Vokabeln und 3 Sätze. Keine Vokabel doppelt in derselben
Lektion; derselbe Satz nur einmal im ganzen Kurs. Jede Vokabel und jeder Satz hat eine
deutsche Übersetzung. Dialoge enthalten mindestens eine Zeile für den Lernenden (`b`),
die Verständnisfrage mindestens zwei verschiedene Antworten – die erste ist die richtige.
Eine Vokabel darf in einer späteren Lektion zur Wiederholung erneut vorkommen; in der
Vokabelliste und im Lernstand zählt sie zur ersten Lektion.

**R4 – Lexikon.** Jede Vokabel hat genau einen Lexikon-Eintrag, und zwar in der Unit, in
der sie zuerst vorkommt:
- `pos` – Wortart: `verb`, `noun`, `adj`, `adv`, `pron`, `num`, `prep`, `conj`, `art`,
  `question` (Fragewörter), `phrase` (feste Wendungen).
- `verb` – der Infinitiv, wenn die Vokabel eine Verbform ist oder ein Verb enthält
  (`"gosto de"` → `gostar`). Pflicht bei `pos: "verb"`. Die erste Vokabel, die auf ein
  Verb verweist, führt es ein: Ab dieser Lektion gelten alle seine Formen als bekannt,
  die Lektion zeigt die Konjugationstabelle und übt sie.
- Reine Verbformen (`pos: "verb"`) erscheinen in der Vokabelliste nicht einzeln, sondern
  beim Verb in der Grundform. Wendungen (`pos: "phrase"`) bleiben zusätzlich sichtbar.
- `forms` – abgewandelte Formen ohne eigene Vokabel (Plural, weiblich): Schlüssel klein
  geschrieben, Wert = Vokabel genau wie in `words`.
- `names` – Eigennamen, die nicht erklärt werden müssen.

**R5 – Aussprachehilfe (`sound`).** Nur bei Wörtern, deren Aussprache für Deutsche
überrascht. Deutsche Umschrift, betonte Silbe in Großbuchstaben: `obriGAdu`, `dschKULP`,
`TANju`. Nur deutsche Buchstaben plus ã/õ für Nasale; `w` statt `v`; `ß` für stimmloses s,
`s` für stimmhaftes; `sch` für s vor Konsonant/am Ende und für j/g; `lj` für lh, `nj` für nh;
unbetontes o → `u`, unbetontes e am Ende entfällt.

**R6 – Verben.** Jedes Verb steht genau einmal in `verbs.ts` mit
- `present`: 5 Formen (eu, tu, ele/ela/você, nós, eles/elas/vocês), reflexiv mit
  nachgestelltem Pronomen (`chamo-me`),
- `presentDe`: die 5 deutschen Formen (`ich heiße`, …, `sie heißen`),
- `extra`: nur Formen außerhalb des Präsens, die im Kurs wirklich vorkommen (`siga`, `queria`).
Alle Formen klein geschrieben. Jedes Verb wird von mindestens einer Vokabel eingeführt.

**R7 – Keine unerklärten Wörter.** Jedes Wort in Sätzen, Dialogen, Beispielen und
Sprechaufgaben ist in derselben oder einer früheren Lektion eingeführt – als Vokabel,
als Form eines eingeführten Verbs, über `forms` oder als Name.

**R8 – Alles ist vertont.** Jeder vorlesbare Text (Vokabeln, Sätze, Dialogzeilen, Beispiele,
Verbformen, jedes Einzelwort) hat eine Aufnahme. Welche Texte das sind, legt
`src/content/speakable.ts` fest. Fehlende Aufnahmen erzeugt `npm run audio`.

## Lernlogik (Code)

- **Übungen** entstehen automatisch aus den Inhalten (`src/lib/exercises.ts`): Jede Vokabel
  einer Lektion wird mindestens einmal abgefragt, jedes neue Verb konjugiert, jeder Satz
  in wechselnden Übungsformen geübt, danach Dialog und Rollenspiel.
- **Wiederholung** (`src/lib/srs.ts`): Leitner-Boxen 1–6, Abstände 1, 2, 4, 8, 16, 32 Tage.
  Richtig → eine Box höher, falsch → zurück auf Box 1. Pro Sitzung zählt ein Element als
  falsch, sobald es einmal falsch war.
- **Freies Üben:** Ist nichts fällig, übt „Wiederholen“ die schwächsten Einträge – das
  bringt weniger XP und verändert die Boxen nicht, damit nichts zu früh nach hinten rückt.
- **Stellschrauben** (XP, Sitzungsgröße, neue Einträge pro Tag) stehen gesammelt in
  `src/lib/learning.ts`.
- **Neue Inhalte in abgeschlossenen Lektionen** kommen automatisch in die Wiederholung,
  verteilt auf höchstens `BACKFILL_PER_DAY` pro Tag – bestehende Einträge werden nie verändert.
- **Lernbalken eines Verbs** = Durchschnitt aus Konjugationsübung, Formen und Wendungen,
  Ungeübtes zählt als 0.
- **Texte** werden überall mit denselben Regeln zerlegt und verglichen (`src/lib/text.ts`):
  Antwortprüfung, Wortbausteine, Suche nach Aufnahmen und Inhaltsprüfung.
