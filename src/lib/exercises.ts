import { allWords, itemIndex, lessonItems, type Item, type LessonDef } from "@/content";
import { tokenize } from "./answer";

type Base = { key: string; itemId: string };

export type Exercise =
  | (Base & {
      kind: "choice";
      direction: "pt-de" | "de-pt";
      prompt: string;
      options: string[];
      answer: string;
      note?: string;
    })
  | (Base & { kind: "listen-choice"; audio: string; options: string[]; answer: string })
  | (Base & { kind: "match"; pairs: { id: string; pt: string; de: string }[] })
  | (Base & {
      kind: "build";
      direction: "pt-de" | "de-pt";
      prompt: string;
      tokens: string[];
      answers: string[];
    })
  | (Base & { kind: "type"; prompt: string; answers: string[]; isWord: boolean })
  | (Base & { kind: "dictation"; audio: string; de: string; answers: string[] })
  | (Base & { kind: "speak"; text: string; de: string })
  | (Base & {
      kind: "fill";
      before: string;
      after: string;
      de: string;
      options: string[];
      answer: string;
      full: string;
    });

export type ExerciseKind = Exercise["kind"];

let counter = 0;
const key = () => `ex${++counter}`;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const lower = (s: string) => s.toLowerCase();

function pickDistinct(candidates: string[], exclude: string[], n: number) {
  const ex = new Set(exclude.map(lower));
  const out: string[] = [];
  for (const c of shuffle(candidates)) {
    if (out.length >= n) break;
    if (ex.has(lower(c)) || out.some((o) => lower(o) === lower(c))) continue;
    out.push(c);
  }
  return out;
}

/** Ablenker bevorzugt aus derselben Lektion, aufgefüllt aus dem ganzen Kurs */
function wordDistractors(item: Item, field: "pt" | "de", n: number, local: Item[]) {
  // Wörter mit gleicher Übersetzung (obrigado/obrigada) wären ebenfalls richtig – ausschließen
  const clash = (w: Item) => lower(w.de) === lower(item.de) || lower(w.pt) === lower(item.pt);
  const localPool = local.filter((w) => !clash(w)).map((w) => w[field]);
  const picked = pickDistinct(localPool, [item[field]], n);
  if (picked.length < n) {
    const global = allWords.filter((w) => !clash(w)).map((w) => w[field]);
    picked.push(...pickDistinct(global, [item[field], ...picked], n - picked.length));
  }
  return picked;
}

function choice(item: Item, direction: "pt-de" | "de-pt", local: Item[]): Exercise {
  const field = direction === "pt-de" ? "de" : "pt";
  const answer = item[field];
  return {
    kind: "choice",
    key: key(),
    itemId: item.id,
    direction,
    prompt: direction === "pt-de" ? item.pt : item.de,
    note: item.note,
    answer,
    options: shuffle([answer, ...wordDistractors(item, field, 3, local)]),
  };
}

function listenChoice(item: Item, local: Item[]): Exercise {
  return {
    kind: "listen-choice",
    key: key(),
    itemId: item.id,
    audio: item.pt,
    answer: item.pt,
    options: shuffle([item.pt, ...wordDistractors(item, "pt", 3, local)]),
  };
}

function match(items: Item[]): Exercise {
  return {
    kind: "match",
    key: key(),
    itemId: items[0].id,
    pairs: items.map((i) => ({ id: i.id, pt: i.pt, de: i.de })),
  };
}

function build(item: Item, direction: "pt-de" | "de-pt", pool: Item[]): Exercise {
  const target = direction === "pt-de" ? item.de : item.pt;
  const answerTokens = tokenize(target);
  const otherTokens = pool
    .filter((p) => p.id !== item.id)
    .flatMap((p) => tokenize(direction === "pt-de" ? p.de : p.pt));
  const distractors = pickDistinct(otherTokens, answerTokens, Math.min(4, Math.max(2, answerTokens.length - 2)));
  return {
    kind: "build",
    key: key(),
    itemId: item.id,
    direction,
    prompt: direction === "pt-de" ? item.pt : item.de,
    tokens: shuffle([...answerTokens, ...distractors]),
    answers: direction === "pt-de" ? [item.de] : [item.pt, ...item.altPt],
  };
}

function typeIt(item: Item): Exercise {
  return {
    kind: "type",
    key: key(),
    itemId: item.id,
    prompt: item.de,
    answers: [item.pt, ...item.altPt],
    isWord: item.kind === "word",
  };
}

function dictation(item: Item): Exercise {
  return { kind: "dictation", key: key(), itemId: item.id, audio: item.pt, de: item.de, answers: [item.pt, ...item.altPt] };
}

function speakIt(item: Item): Exercise {
  return { kind: "speak", key: key(), itemId: item.id, text: item.pt, de: item.de };
}

function fill(item: Item, local: Item[]): Exercise | null {
  const tokens = tokenize(item.pt);
  const candidates = tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => t.length >= 3 && (i === 0 || t[0] === t[0].toLowerCase()));
  if (!candidates.length) return null;
  const { t: answer, i } = candidates.reduce((a, b) => (b.t.length > a.t.length ? b : a));
  const pool = [
    ...local.filter((w) => !w.pt.includes(" ")).map((w) => w.pt),
    ...allWords.filter((w) => !w.pt.includes(" ")).map((w) => w.pt),
  ];
  const options = shuffle([answer, ...pickDistinct(pool, [answer], 3)]);
  return {
    kind: "fill",
    key: key(),
    itemId: item.id,
    before: tokens.slice(0, i).join(" "),
    after: tokens.slice(i + 1).join(" "),
    de: item.de,
    options,
    answer,
    full: item.pt,
  };
}

export type GenOptions = { speech: boolean; audio: boolean };

/** Übungsfolge für eine Lektion (~16 Aufgaben) */
export function lessonExercises(lesson: LessonDef, opts: GenOptions): Exercise[] {
  const { words: rawWords, sentences: rawSentences } = lessonItems(lesson);
  const words = shuffle(rawWords);
  const sentences = shuffle(rawSentences);
  const pool = [...rawWords, ...rawSentences];

  const intro: Exercise[] = [];
  words.slice(0, 6).forEach((w, i) => {
    intro.push(choice(w, "pt-de", rawWords));
    // Nach ein paar neuen Wörtern gleich hören bzw. rückwärts abfragen
    if (i === 2 && opts.audio) intro.push(listenChoice(words[i - 1], rawWords));
    if (i === 4) intro.push(choice(words[i - 2], "de-pt", rawWords));
  });
  const rest = words.slice(6);
  const matchItems = (rest.length >= 4 ? rest : words).slice(0, 5);
  const wordExtra: Exercise[] = [];
  if (opts.audio) wordExtra.push(listenChoice(shuffle(words)[0], rawWords));
  wordExtra.push(choice(shuffle(words)[0], "de-pt", rawWords));
  wordExtra.push(typeIt(shuffle(words)[0]));

  const sentenceKinds: ((s: Item) => Exercise | null)[] = [
    (s) => build(s, "pt-de", pool),
    (s) => build(s, "de-pt", pool),
    (s) => (opts.audio ? dictation(s) : typeIt(s)),
    (s) => fill(s, rawWords) ?? build(s, "de-pt", pool),
    (s) => typeIt(s),
    (s) => (opts.speech ? speakIt(s) : build(s, "pt-de", pool)),
  ];
  const sentenceEx = sentences
    .map((s, i) => sentenceKinds[i % sentenceKinds.length](s))
    .filter((e): e is Exercise => e !== null);

  // Reihenfolge: erst Wörter kennenlernen, dann Sätze – Wortübungen dazwischen gestreut
  const tail: Exercise[] = [];
  const extras = [match(matchItems), ...wordExtra];
  sentenceEx.forEach((s, i) => {
    tail.push(s);
    if (i % 2 === 1 && extras.length) tail.push(extras.shift()!);
  });
  tail.push(...extras);
  return [...intro, ...tail];
}

/** Übungen für fällige Wiederholungen: je Element eine zufällige, passende Übungsform */
export function reviewExercises(itemIds: string[], opts: GenOptions): Exercise[] {
  const items = itemIds.map((id) => itemIndex.get(id)).filter((i): i is Item => !!i);
  const sentencePool = [...itemIndex.values()].filter((i) => i.kind === "sentence");
  const out: Exercise[] = [];
  for (const item of shuffle(items)) {
    if (item.kind === "word") {
      const forms = [
        () => choice(item, "pt-de", []),
        () => choice(item, "de-pt", []),
        () => typeIt(item),
        ...(opts.audio ? [() => listenChoice(item, [])] : []),
      ];
      out.push(forms[Math.floor(Math.random() * forms.length)]());
    } else {
      const forms = [
        () => build(item, "pt-de", sentencePool),
        () => build(item, "de-pt", sentencePool),
        () => typeIt(item),
        ...(opts.audio ? [() => dictation(item)] : []),
        ...(opts.speech ? [() => speakIt(item)] : []),
      ];
      out.push(forms[Math.floor(Math.random() * forms.length)]());
    }
  }
  return out;
}
