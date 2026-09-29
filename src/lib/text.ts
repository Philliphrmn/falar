/**
 * Gemeinsame Textregeln für die ganze App und die Skripte: Antwortprüfung,
 * Wortbausteine, Suche nach Aufnahmen und die Inhaltsprüfung zerlegen Texte
 * alle gleich. Keine Imports mit "@/…", damit auch die Skripte das nutzen können.
 */

/** Satzzeichen, die beim Zerlegen, Vergleichen und Vorlesen keine Rolle spielen */
const PUNCTUATION = /[.,!?¿¡;:"“”„«»()…/]/g;

/** Satz in Wörter zerlegen; Groß-/Kleinschreibung bleibt (für Wortbausteine) */
export function tokenize(text: string) {
  return text.replace(PUNCTUATION, " ").split(/\s+/).filter(Boolean);
}

/** Vergleichsschlüssel: klein, ohne Satzzeichen, einheitliche Apostrophe – z. B. „Siga!“ → „siga“ */
export function textKey(text: string) {
  return tokenize(text.toLowerCase().normalize("NFC").replace(/[’`´]/g, "'")).join(" ");
}

/** Einzelne Wörter eines Textes als Schlüssel (ohne Zahlen und Gedankenstriche) */
export function wordKeys(text: string) {
  return textKey(text)
    .split(" ")
    .filter((t) => t && !/^\d+$/.test(t) && t !== "-" && t !== "–");
}

export function stripAccents(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}
