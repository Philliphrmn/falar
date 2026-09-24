"use client";

import clips from "@/content/audio.json";

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

/**
 * Vertonte Aufnahmen (Azure Neural, pt-PT), erzeugt mit scripts/generate-audio.mjs.
 * f = Frauenstimme (Standard), m = Männerstimme (z. B. deine Rolle im Dialog).
 */
export type Voice = "f" | "m";
type SpeakOpts = { slow?: boolean; voice?: Voice };

const clipIndex = clips as Record<Voice, Record<string, string>>;
export const hasRecordedAudio = Object.keys(clipIndex.f).length > 0;

function clipFor(text: string, voice: Voice = "f") {
  return clipIndex[voice]?.[text] ?? clipIndex.f[text];
}

let current: HTMLAudioElement | null = null;

function playClip(file: string, opts: SpeakOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    stopSpeaking();
    const a = new Audio(`/audio/${file}`);
    current = a;
    // Standard-Tempo 0.9 in den Einstellungen entspricht der Originalaufnahme
    const rate = Math.min(1.5, Math.max(0.5, speechRate / 0.9));
    a.playbackRate = opts.slow ? Math.max(0.5, rate * 0.7) : rate;
    a.onended = () => resolve();
    a.onerror = () => reject(new Error("audio"));
    a.play().catch(reject);
  });
}

export function speak(text: string, opts: SpeakOpts = {}) {
  void speakAsync(text, opts);
}

/** Spricht einen Text und löst auf, sobald er zu Ende ist. Nutzt Aufnahmen, sonst die Gerätestimme. */
export function speakAsync(text: string, opts: SpeakOpts = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const file = clipFor(text, opts.voice);
  if (file) return playClip(file, opts).catch(() => synthesize(text, opts));
  return synthesize(text, opts);
}

function synthesize(text: string, opts: SpeakOpts): Promise<void> {
  if (!("speechSynthesis" in window)) return Promise.resolve();
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-PT";
    const voice = getPortugueseVoice();
    if (voice) u.voice = voice;
    u.rate = opts.slow ? Math.max(0.5, speechRate * 0.65) : speechRate;
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    // Manche Browser feuern onend nicht zuverlässig
    const timer = setTimeout(done, 1500 + text.length * 120);
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (current) {
    current.pause();
    current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function canSpeak() {
  return typeof window !== "undefined" && (hasRecordedAudio || "speechSynthesis" in window);
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

export function canRecord() {
  return (
    typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"
  );
}

/** Nimmt über das Mikrofon auf; stop() liefert eine abspielbare URL der Aufnahme. */
export async function startRecording(): Promise<{ stop: () => Promise<string> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        };
        rec.stop();
      }),
  };
}
