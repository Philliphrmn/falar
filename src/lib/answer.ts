export type CheckResult = {
  correct: boolean;
  /** Hinweis bei knapp richtigen Antworten (Akzente, Tippfehler) */
  note?: string;
};

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[’`´]/g, "'")
    .replace(/[.,!?¿¡;:"“”„«»()]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripAccents(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

export function levenshtein(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Portugiesische Subjektpronomen dürfen fehlen („Eu sou alemão“ = „Sou alemão“). */
function withOptionalPronoun(answers: string[]) {
  const out = new Set(answers.map(normalize));
  for (const a of [...out]) {
    const m = a.match(/^(eu|tu) (.+)$/);
    if (m) out.add(m[2]);
  }
  return [...out];
}

export function checkAnswer(input: string, answers: string[]): CheckResult {
  const given = normalize(input);
  if (!given) return { correct: false };
  const targets = withOptionalPronoun(answers);

  if (targets.includes(given)) return { correct: true };

  const bare = stripAccents(given);
  const accentMatch = targets.find((t) => stripAccents(t) === bare);
  if (accentMatch) {
    return { correct: true, note: `Achte auf die Akzente: ${accentMatch}` };
  }

  for (const t of targets) {
    const tolerance = t.length > 14 ? 2 : t.length > 4 ? 1 : 0;
    if (tolerance && levenshtein(stripAccents(t), bare) <= tolerance) {
      return { correct: true, note: `Kleiner Tippfehler – richtig ist: ${t}` };
    }
  }
  return { correct: false };
}

/** Ähnlichkeit 0..1, für die Spracherkennung */
export function similarity(a: string, b: string) {
  const x = stripAccents(normalize(a));
  const y = stripAccents(normalize(b));
  if (!x.length && !y.length) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** Satz in Wörter für die Wortbausteine zerlegen */
export function tokenize(sentence: string) {
  return sentence
    .replace(/[.,!?¿¡;:"“”„«»]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
