"use client";

let speechRate = 0.9;
export function setSpeechRate(rate: number) {
  speechRate = rate;
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

/** Bevorzugt eine europäisch-portugiesische Stimme, sonst irgendeine portugiesische. */
export function getPortugueseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const norm = (l: string) => l.toLowerCase().replace("_", "-");
  cachedVoice =
    voices.find((v) => norm(v.lang) === "pt-pt") ??
    voices.find((v) => norm(v.lang).startsWith("pt")) ??
    null;
  return cachedVoice;
}

export function hasEuropeanVoice() {
  const v = getPortugueseVoice();
  return !!v && v.lang.toLowerCase().replace("_", "-") === "pt-pt";
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = undefined;
  });
}

export function speak(text: string, opts: { slow?: boolean } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-PT";
  const voice = getPortugueseVoice();
  if (voice) u.voice = voice;
  u.rate = opts.slow ? Math.max(0.5, speechRate * 0.65) : speechRate;
  synth.speak(u);
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canRecognize() {
  return getRecognitionCtor() !== null;
}

/** Nimmt einen Satz auf und liefert alle erkannten Varianten. */
export function listen(): { promise: Promise<string[]>; stop: () => void } {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return { promise: Promise.reject(new Error("unsupported")), stop: () => {} };
  const rec = new Ctor();
  rec.lang = "pt-PT";
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  const promise = new Promise<string[]>((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const first = e.results[0];
      const out: string[] = [];
      for (let i = 0; i < first.length; i++) out.push(first[i].transcript);
      resolve(out);
    };
    rec.onerror = (e) => {
      done = true;
      reject(new Error(e.error));
    };
    rec.onend = () => {
      if (!done) resolve([]);
    };
    rec.start();
  });
  return { promise, stop: () => rec.stop() };
}
