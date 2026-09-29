/**
 * Prüft den Kursinhalt auf Lücken:
 *  - Jedes Wort in einem Satz, Dialog oder Beispiel muss in derselben oder einer
 *    früheren Lektion als Vokabel eingeführt sein – direkt, als Verbform eines
 *    eingeführten Verbs oder als abgewandelte Form (lexicon.forms).
 *  - Jede Vokabel braucht einen Lexikon-Eintrag (Wortart, ggf. Verb, Aussprache).
 *  - Jedes referenzierte Verb braucht eine Konjugationstabelle.
 *
 * Aufruf: npm run check            (alles)
 *         npm run check -- u2      (nur Unit u2)
 */
import { course } from "../src/content/course";
import { lexicon, unitLexicons, verbs } from "../src/content/lexicon";
import { verbList } from "../src/content/lexicon/verbs";

const only = process.argv[2];
const problems: string[] = [];
const report = (unitId: string, msg: string) => {
  if (!only || only === unitId) problems.push(`[${unitId}] ${msg}`);
};

const tokens = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[’`´]/g, "'")
    .replace(/[.,!?¿¡;:"“”„«»()…/]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !/^\d+$/.test(t) && t !== "-" && t !== "–");

const names = new Set(unitLexicons.flatMap((l) => l.names ?? []).map((n) => n.toLowerCase()));
const forms = new Map<string, string>(unitLexicons.flatMap((l) => Object.entries(l.forms ?? {})));

// --- Lexikon-Konsistenz ---------------------------------------------------
const allWordTexts = new Set(course.flatMap((u) => u.lessons.flatMap((l) => l.words.map(([pt]) => pt))));
for (const [i, lex] of unitLexicons.entries()) {
  const unitId = course[i].id;
  for (const [pt, e] of Object.entries(lex.words)) {
    if (!course[i].lessons.some((l) => l.words.some(([w]) => w === pt)))
      report(unitId, `Lexikon-Eintrag ohne Vokabel in dieser Unit: „${pt}“`);
    if (e.verb && !verbs.has(e.verb)) report(unitId, `Verb „${e.verb}“ (bei „${pt}“) hat keine Konjugationstabelle`);
    if (e.pos === "verb" && !e.verb) report(unitId, `„${pt}“ ist als Verb markiert, aber ohne verb: "<Infinitiv>"`);
  }
  for (const [form, base] of Object.entries(lex.forms ?? {})) {
    if (!allWordTexts.has(base)) report(unitId, `forms: „${form}“ verweist auf „${base}“, das keine Vokabel ist`);
    if (form !== form.toLowerCase()) report(unitId, `forms: „${form}“ bitte kleingeschrieben`);
  }
}
const seenVerbs = new Map<string, string>(verbList.map((v) => [v.inf, "verbs.ts"]));
for (const v of verbList) if (v.present.length !== 5) report("verbs", `Verb „${v.inf}“: present braucht genau 5 Formen`);
for (const [i, lex] of unitLexicons.entries()) {
  for (const v of lex.verbs ?? []) {
    const unitId = course[i].id;
    if (seenVerbs.has(v.inf)) report(unitId, `Verb „${v.inf}“ doppelt definiert (auch in ${seenVerbs.get(v.inf)})`);
    seenVerbs.set(v.inf, unitId);
    if (v.present.length !== 5) report(unitId, `Verb „${v.inf}“: present braucht genau 5 Formen`);
  }
}
const referencedVerbs = new Set([...lexicon.values()].map((e) => e.verb).filter(Boolean));
for (const inf of verbs.keys()) {
  if (!referencedVerbs.has(inf)) report(seenVerbs.get(inf) === "verbs.ts" ? "verbs" : seenVerbs.get(inf)!, `Verb „${inf}“ wird von keiner Vokabel referenziert (lexicon.words[…].verb)`);
}

// --- Abdeckung in Lektionsreihenfolge -------------------------------------
const known = new Set<string>();
const knownWords = new Set<string>();
const addWord = (pt: string) => {
  knownWords.add(pt);
  for (const t of tokens(pt)) {
    known.add(t);
    t.split("-").forEach((p) => p && known.add(p));
  }
  const inf = lexicon.get(pt)?.verb;
  const v = inf ? verbs.get(inf) : undefined;
  if (v) {
    for (const f of [v.inf, ...v.present, ...(v.extra ?? []).flatMap((x) => x.forms.map(([p]) => p))]) {
      for (const t of tokens(f)) {
        known.add(t);
        t.split("-").forEach((p) => p && known.add(p));
      }
    }
  }
};
const isKnown = (t: string): boolean => {
  if (known.has(t) || names.has(t)) return true;
  const base = forms.get(t);
  if (base && knownWords.has(base)) return true;
  if (t.includes("-")) return t.split("-").every((p) => !p || isKnown(p));
  return false;
};

for (const unit of course) {
  const lex = unitLexicons[course.indexOf(unit)];
  for (const lesson of unit.lessons) {
    lesson.words.forEach(([pt]) => addWord(pt));
    for (const [pt] of lesson.words) {
      if (!lexicon.has(pt)) report(unit.id, `${lesson.id}: Vokabel „${pt}“ fehlt im Lexikon`);
      else if (!(pt in lex.words)) report(unit.id, `${lesson.id}: Vokabel „${pt}“ steht im Lexikon einer anderen Unit`);
    }
    const texts: [string, string][] = [];
    lesson.sentences.forEach(([pt, , alt]) => [pt, ...(alt ?? [])].forEach((t) => texts.push(["Satz", t])));
    lesson.dialogue?.lines.forEach(([, pt, , alt]) => [pt, ...(alt ?? [])].forEach((t) => texts.push(["Dialog", t])));
    lesson.grammar?.examples?.forEach((e) => texts.push(["Grammatik", e.pt]));
    lesson.sound?.examples?.forEach((e) => texts.push(["Aussprache", e.pt]));
    for (const [where, text] of texts) {
      const missing = tokens(text).filter((t) => !isKnown(t));
      if (missing.length) report(unit.id, `${lesson.id} (${where}): ${missing.map((m) => `„${m}“`).join(", ")} nicht eingeführt – „${text}“`);
    }
  }
  for (const task of unit.speaking ?? []) {
    for (const text of [...task.model.map((m) => m.pt), ...task.hints]) {
      const missing = tokens(text).filter((t) => !isKnown(t));
      if (missing.length) report(unit.id, `Unit-Abschluss: ${missing.map((m) => `„${m}“`).join(", ")} nicht eingeführt – „${text}“`);
    }
  }
}

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} Hinweise.`);
  process.exit(1);
}
console.log("Alles abgedeckt.");
