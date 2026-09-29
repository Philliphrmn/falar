import { course } from "./course";
import { verbs } from "./lexicon";
import { textKey, wordKeys } from "../lib/text";

export type Voice = "f" | "m";

/** Stimmtest in den Einstellungen */
export const VOICE_TEST = "Olá! Bom dia, como estás?";

/**
 * Alle Texte, die die App vorlesen kann – Grundlage für die Vertonung
 * (scripts/generate-audio.mts) und die Inhaltsprüfung (npm run check).
 * f = Frauenstimme (Standard), m = Männerstimme (deine Rolle im Dialog).
 */
export function speakableTexts(): Record<Voice, Set<string>> {
  const out: Record<Voice, Set<string>> = { f: new Set(), m: new Set() };
  const add = (text: string, voice: Voice = "f") => out[voice].add(text);
  for (const unit of course) {
    for (const l of unit.lessons) {
      l.words.forEach(([pt]) => add(pt));
      l.sentences.forEach(([pt]) => add(pt));
      l.grammar?.examples?.forEach((e) => add(e.pt));
      l.sound?.examples?.forEach((e) => add(e.pt));
      l.dialogue?.lines.forEach(([who, pt]) => add(pt, who === "b" ? "m" : "f"));
    }
    unit.speaking?.forEach((t) => t.model.forEach((m) => add(m.pt)));
  }
  add(VOICE_TEST);
  // Konjugationstabellen und -übungen
  for (const v of verbs.values()) {
    [v.inf, ...v.present, ...(v.extra ?? []).flatMap((x) => x.forms.map(([pt]) => pt))].forEach((t) => add(t));
  }
  // Jedes einzelne Wort, damit auch angetippte Bausteine („Siga“) eine Aufnahme haben
  const known = new Set([...out.f].map(textKey));
  for (const text of [...out.f, ...out.m]) {
    for (const word of wordKeys(text)) {
      if (!known.has(word)) {
        known.add(word);
        add(word);
      }
    }
  }
  return out;
}
