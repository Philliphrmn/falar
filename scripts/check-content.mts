/**
 * Prüft den Kursinhalt gegen die Regeln in docs/INHALT.md. Läuft automatisch vor
 * jedem Build (npm run build → prebuild), damit kein inkonsistenter Stand live geht.
 *
 * Aufruf: npm run check                  alles prüfen
 *         npm run check -- u2            nur Unit u2
 *         npm run check -- --write-ids   neue Fortschritts-IDs in src/content/ids.json aufnehmen
 *
 * Jede Meldung beginnt mit der Regelnummer aus docs/INHALT.md, z. B. [R4].
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import clips from "../src/content/audio.json";
import { course } from "../src/content/course";
import { allLessons, itemIndex } from "../src/content";
import { lexicon, unitLexicons, verbs } from "../src/content/lexicon";
import { verbList } from "../src/content/lexicon/verbs";
import { speakableTexts } from "../src/content/speakable";
import { unitProgressId } from "../src/lib/exercises";
import { textKey, wordKeys } from "../src/lib/text";

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const writeIds = args.includes("--write-ids");

const problems: string[] = [];
const report = (rule: string, where: string, msg: string) => {
  if (!only || where.startsWith(only)) problems.push(`[${rule}] ${where}: ${msg}`);
};
const q = (s: string) => `„${s}“`;

const formsOf = (inf: string) => {
  const v = verbs.get(inf);
  return v ? [v.inf, ...v.present, ...(v.extra ?? []).flatMap((x) => x.forms.map(([pt]) => pt))] : [];
};

// --- R1 Struktur: eindeutige IDs, ein Lexikon je Unit ----------------------
const unitIds = course.map((u) => u.id);
const lessonIds = allLessons.map((l) => l.id);
for (const id of unitIds.filter((x, i) => unitIds.indexOf(x) !== i)) report("R1", id, "Unit-ID doppelt");
for (const id of lessonIds.filter((x, i) => lessonIds.indexOf(x) !== i)) report("R1", id, "Lektions-ID doppelt");
for (const id of unitIds) {
  if (!unitLexicons[id]) report("R1", id, "kein Lexikon – src/content/lexicon/<unit>.ts anlegen und in lexicon/index.ts eintragen");
}
for (const id of Object.keys(unitLexicons)) if (!unitIds.includes(id)) report("R1", id, "Lexikon ohne passende Unit");

// --- R2 Fortschritts-IDs bleiben bestehen -----------------------------------
const idsPath = join(import.meta.dirname, "..", "src", "content", "ids.json");
const currentIds = [
  ...itemIndex.keys(),
  ...lessonIds.map((id) => `lesson:${id}`),
  ...unitIds.map((id) => `lesson:${unitProgressId(id)}`),
].sort();
const lockedIds: string[] = JSON.parse(readFileSync(idsPath, "utf8"));
const current = new Set(currentIds);
for (const id of lockedIds) {
  if (!current.has(id)) {
    report("R2", id, "diese Fortschritts-ID gibt es nicht mehr – der Lernstand dazu ginge verloren. Portugiesischen Text bzw. Lektions-ID zurückändern");
  }
}
const locked = new Set(lockedIds);
const newIds = currentIds.filter((id) => !locked.has(id));

// --- R3 Lektionen: Mindestumfang, keine Doppelungen, Dialoge ---------------
for (const unit of course) {
  for (const l of unit.lessons) {
    const where = `${unit.id}/${l.id}`;
    if (l.words.length < 5) report("R3", where, "mindestens 5 Vokabeln (für Paare-Übung und Auswahl)");
    if (l.sentences.length < 3) report("R3", where, "mindestens 3 Sätze");
    const pts = l.words.map(([pt]) => pt);
    for (const pt of pts.filter((x, i) => pts.indexOf(x) !== i)) report("R3", where, `Vokabel ${q(pt)} doppelt in derselben Lektion`);
    for (const [pt, de] of [...l.words, ...l.sentences]) if (!de.trim()) report("R3", where, `${q(pt)} ohne deutsche Übersetzung`);
    if (l.dialogue) {
      const d = l.dialogue;
      if (!d.lines.some(([who]) => who === "b")) report("R3", where, "Dialog braucht mindestens eine Zeile für dich (b)");
      if (d.question.options.length < 2) report("R3", where, "Dialogfrage braucht mindestens 2 Antworten");
      if (new Set(d.question.options).size !== d.question.options.length) report("R3", where, "Dialogfrage mit doppelten Antworten");
    }
  }
}
// Sätze werden über ihren Text identifiziert – derselbe Satz in zwei Lektionen wäre ein Eintrag
const sentenceSeen = new Map<string, string>();
for (const l of allLessons) {
  for (const [pt] of l.sentences) {
    const prev = sentenceSeen.get(textKey(pt));
    if (prev) report("R3", l.id, `Satz ${q(pt)} gibt es schon in ${prev}`);
    else sentenceSeen.set(textKey(pt), l.id);
  }
}

// --- R4 Lexikon: jede Vokabel genau einmal, in der Unit ihres ersten Vorkommens
const firstUnitOf = new Map<string, string>();
for (const unit of course) {
  for (const l of unit.lessons) for (const [pt] of l.words) if (!firstUnitOf.has(pt)) firstUnitOf.set(pt, unit.id);
}
for (const [unitId, lex] of Object.entries(unitLexicons)) {
  for (const [pt, e] of Object.entries(lex.words)) {
    const first = firstUnitOf.get(pt);
    if (!first) report("R4", unitId, `Lexikon-Eintrag ${q(pt)} ohne Vokabel`);
    else if (first !== unitId) report("R4", unitId, `Lexikon-Eintrag ${q(pt)} gehört nach ${first} (dort kommt das Wort zuerst vor)`);
    if (e.pos === "verb" && !e.verb) report("R4", unitId, `${q(pt)} ist als Verb markiert, aber ohne verb: "<Infinitiv>"`);
    if (e.verb && !verbs.has(e.verb)) report("R4", unitId, `${q(pt)}: Verb ${q(e.verb)} fehlt in lexicon/verbs.ts`);
    if (e.sound !== undefined) checkSound(unitId, pt, e.sound);
  }
  for (const [form, base] of Object.entries(lex.forms ?? {})) {
    if (!firstUnitOf.has(base)) report("R4", unitId, `forms: ${q(form)} verweist auf ${q(base)}, das keine Vokabel ist`);
    if (form !== form.toLowerCase()) report("R4", unitId, `forms: ${q(form)} bitte kleinschreiben`);
  }
}
for (const [pt, unitId] of firstUnitOf) {
  if (!unitLexicons[unitId]?.words[pt]) report("R4", unitId, `Vokabel ${q(pt)} fehlt im Lexikon`);
}

// --- R5 Aussprachehilfe: deutsche Umschrift ---------------------------------
function checkSound(where: string, pt: string, sound: string) {
  if (!/^[a-zA-ZäöüÄÖÜßãõÃÕ ]+$/.test(sound)) {
    report("R5", where, `${q(pt)}: Umschrift ${q(sound)} – nur deutsche Buchstaben (plus ã/õ für Nasale), keine portugiesischen Akzente`);
  }
  if (/[vV]/.test(sound)) report("R5", where, `${q(pt)}: Umschrift ${q(sound)} – v liest man auf Deutsch als f, bitte w schreiben`);
}

// --- R6 Verben: vollständige Tabellen, genau eine Quelle --------------------
const infs = verbList.map((v) => v.inf);
for (const inf of infs.filter((x, i) => infs.indexOf(x) !== i)) report("R6", "verbs", `Verb ${q(inf)} doppelt`);
const referenced = new Set([...lexicon.values()].map((e) => e.verb));
for (const v of verbList) {
  const where = `verbs/${v.inf}`;
  if (v.present.length !== 5 || v.present.some((f) => !f.trim())) report("R6", where, "present braucht 5 Formen");
  if (v.presentDe.length !== 5 || v.presentDe.some((f) => !f.trim())) report("R6", where, "presentDe braucht 5 Übersetzungen");
  for (const f of formsOf(v.inf)) if (f !== f.toLowerCase()) report("R6", where, `Form ${q(f)} bitte kleinschreiben`);
  if (!referenced.has(v.inf)) report("R6", where, "wird von keiner Vokabel eingeführt (lexicon: verb)");
  if (v.sound !== undefined) checkSound(where, v.inf, v.sound);
}

// --- R7 Jedes verwendete Wort ist vorher eingeführt -------------------------
const names = new Set(Object.values(unitLexicons).flatMap((l) => l.names ?? []).map((n) => n.toLowerCase()));
const forms = new Map<string, string>(Object.values(unitLexicons).flatMap((l) => Object.entries(l.forms ?? {})));
const known = new Set<string>();
const knownWords = new Set<string>();
const learn = (text: string) => {
  for (const t of wordKeys(text)) {
    known.add(t);
    t.split("-").forEach((p) => p && known.add(p));
  }
};
const isKnown = (t: string): boolean => {
  if (known.has(t) || names.has(t)) return true;
  const base = forms.get(t);
  if (base && knownWords.has(base)) return true;
  return t.includes("-") && t.split("-").every((p) => !p || isKnown(p));
};
const checkCovered = (where: string, what: string, text: string) => {
  const missing = wordKeys(text).filter((t) => !isKnown(t));
  if (missing.length) report("R7", where, `${missing.map(q).join(", ")} nicht eingeführt (${what}: ${q(text)})`);
};
for (const unit of course) {
  for (const l of unit.lessons) {
    for (const [pt] of l.words) {
      knownWords.add(pt);
      learn(pt);
      const inf = lexicon.get(pt)?.verb;
      if (inf) formsOf(inf).forEach(learn);
    }
    const where = `${unit.id}/${l.id}`;
    l.sentences.forEach(([pt, , alt]) => [pt, ...(alt ?? [])].forEach((t) => checkCovered(where, "Satz", t)));
    l.dialogue?.lines.forEach(([, pt, , alt]) => [pt, ...(alt ?? [])].forEach((t) => checkCovered(where, "Dialog", t)));
    l.grammar?.examples?.forEach((e) => checkCovered(where, "Grammatik", e.pt));
    l.sound?.examples?.forEach((e) => checkCovered(where, "Aussprache", e.pt));
  }
  for (const task of unit.speaking ?? []) {
    [...task.model.map((m) => m.pt), ...task.hints].forEach((t) => checkCovered(`${unit.id}/abschluss`, "Sprechaufgabe", t));
  }
}

// --- R8 Für jeden vorlesbaren Text gibt es eine Aufnahme -------------------
const clipKeys = { f: new Set(Object.keys(clips.f).map(textKey)), m: new Set(Object.keys(clips.m).map(textKey)) };
const wanted = speakableTexts();
const missingAudio = (["f", "m"] as const).flatMap((v) => [...wanted[v]].filter((t) => !clipKeys[v].has(textKey(t))));
if (missingAudio.length) {
  report("R8", "audio", `${missingAudio.length} Texte ohne Aufnahme (z. B. ${q(missingAudio[0])}) – AZURE_SPEECH_KEY=… npm run audio`);
}

// --- Ergebnis ---------------------------------------------------------------
if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} Verstöße gegen die Inhaltsregeln (docs/INHALT.md).`);
  process.exit(1);
}
if (newIds.length) {
  if (writeIds) {
    writeFileSync(idsPath, JSON.stringify(currentIds, null, 1) + "\n");
    console.log(`${newIds.length} neue Fortschritts-IDs in src/content/ids.json aufgenommen.`);
  } else {
    console.log(`[R2] ${newIds.length} neue Fortschritts-IDs – mit „npm run check -- --write-ids“ festschreiben:`);
    console.log(newIds.slice(0, 20).join(", ") + (newIds.length > 20 ? " …" : ""));
    process.exit(1);
  }
}
console.log("Alle Inhaltsregeln erfüllt.");
