"use client";

import clips from "@/content/audio.json";
import { supabase } from "./supabase";

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

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Spracherkennung läuft über Azure (/api/recognize) – nötig sind nur Mikrofon und Web Audio. */
export function canRecognize() {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && getAudioContextCtor() !== null;
}

const TARGET_RATE = 16000;
const SPEECH_LEVEL = 0.02; // RMS, ab dem ein Block als Sprache zählt
const END_SILENCE = 1.2; // s Stille nach dem Sprechen → Aufnahme endet
const NO_SPEECH = 7; // s ohne Sprache → aufgeben
const MAX_LENGTH = 12; // s

/**
 * Nimmt einen Satz auf, endet automatisch nach einer Sprechpause (oder per stop())
 * und liefert alle erkannten Varianten. onProcessing meldet, dass die Aufnahme
 * fertig ist und ausgewertet wird.
 */
export function listen(opts: { onProcessing?: () => void } = {}): { promise: Promise<string[]>; stop: () => void } {
  const Ctx = getAudioContextCtor();
  if (!Ctx || !canRecognize()) return { promise: Promise.reject(new Error("unsupported")), stop: () => {} };
  stopSpeaking();
  // Der AudioContext muss direkt im Klick entstehen, sonst bleibt er in Safari stumm
  const ctx = new Ctx();
  void ctx.resume();

  let finish: (spoke: boolean) => void = () => {};
  let finished = false;
  let stopRequested = false;
  const stop = () => {
    stopRequested = true;
    finish(true);
  };

  const promise = (async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      void ctx.close();
      const name = e instanceof DOMException ? e.name : "";
      throw new Error(name === "NotAllowedError" || name === "SecurityError" ? "not-allowed" : "no-microphone");
    }

    const chunks: Float32Array[] = [];
    const rate = ctx.sampleRate;
    const recorded = await new Promise<boolean>((resolve) => {
      const source = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      const block = 4096 / rate;
      let elapsed = 0;
      let spoken = 0;
      let silence = 0;
      finish = (spoke) => {
        if (finished) return;
        finished = true;
        proc.onaudioprocess = null;
        source.disconnect();
        proc.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        resolve(spoke);
      };
      proc.onaudioprocess = (e) => {
        const data = new Float32Array(e.inputBuffer.getChannelData(0));
        chunks.push(data);
        elapsed += block;
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        if (Math.sqrt(sum / data.length) > SPEECH_LEVEL) {
          spoken += block;
          silence = 0;
        } else {
          silence += block;
        }
        if (spoken > 0.2 && silence >= END_SILENCE) finish(true);
        else if (!spoken && elapsed >= NO_SPEECH) finish(false);
        else if (elapsed >= MAX_LENGTH) finish(true);
      };
      source.connect(proc);
      proc.connect(ctx.destination);
      if (stopRequested) finish(true); // stop() kam, bevor das Mikrofon bereit war
    });
    if (!recorded || !chunks.length) return [];

    opts.onProcessing?.();
    const wav = encodeWav(chunks, rate);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "audio/wav", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: wav,
    });
    if (!res.ok) throw new Error(`recognize-${res.status}`);
    const json = (await res.json()) as { alternatives: string[] };
    return json.alternatives;
  })();

  return { promise, stop };
}

/** Fügt die Blöcke zusammen, rechnet auf 16 kHz herunter und verpackt sie als 16-bit-WAV. */
function encodeWav(chunks: Float32Array[], rate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(total);
  let pos = 0;
  for (const c of chunks) {
    input.set(c, pos);
    pos += c.length;
  }
  const ratio = rate / TARGET_RATE;
  const length = Math.floor(total / ratio);
  const view = new DataView(new ArrayBuffer(44 + length * 2));
  const text = (at: number, s: string) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    // Mittelwert über das Fenster dient zugleich als einfacher Tiefpass
    const from = Math.floor(i * ratio);
    const to = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = from; j < to; j++) sum += input[j];
    const v = Math.max(-1, Math.min(1, sum / Math.max(1, to - from)));
    view.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
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
