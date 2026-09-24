/**
 * Vertont alle portugiesischen Texte des Kurses mit Azure Neural Voices (pt-PT)
 * und legt sie als MP3 unter public/audio/ ab. Die Zuordnung Text → Datei steht
 * in src/content/audio.json; die App spielt diese Dateien statt der Gerätestimme.
 *
 * Aufruf:
 *   AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=westeurope npm run audio
 *
 * Bereits vorhandene Dateien werden übersprungen – nach neuen Lektionen einfach
 * erneut ausführen. Mit --prune werden nicht mehr benötigte Dateien gelöscht.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { course } from "../src/content/course";

const VOICES = { f: "pt-PT-RaquelNeural", m: "pt-PT-DuarteNeural" } as const;
type Voice = keyof typeof VOICES;

const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION ?? "westeurope";
if (!key) {
  console.error("AZURE_SPEECH_KEY fehlt.");
  process.exit(1);
}

const root = join(import.meta.dirname, "..");
const outDir = join(root, "public", "audio");
const manifestPath = join(root, "src", "content", "audio.json");
mkdirSync(outDir, { recursive: true });

// Alle Texte einsammeln, die die App vorlesen kann
const wanted: Record<Voice, Set<string>> = { f: new Set(), m: new Set() };
const add = (text: string, voice: Voice = "f") => wanted[voice].add(text);
for (const unit of course) {
  for (const l of unit.lessons) {
    l.words.forEach(([pt]) => add(pt));
    l.sentences.forEach(([pt]) => add(pt));
    l.grammar?.examples?.forEach((e) => add(e.pt));
    l.sound?.examples?.forEach((e) => add(e.pt));
    // Deine Rolle im Dialog spricht die Männerstimme
    l.dialogue?.lines.forEach(([who, pt]) => add(pt, who === "b" ? "m" : "f"));
  }
  unit.speaking?.forEach((t) => t.model.forEach((m) => add(m.pt)));
}
add("Olá! Bom dia, como estás?"); // Stimmtest in den Einstellungen

const fileName = (text: string, voice: Voice) =>
  `${voice}-${createHash("sha1").update(`${VOICES[voice]}|${text}`).digest("hex").slice(0, 16)}.mp3`;

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function synthesize(text: string, voice: Voice): Promise<Buffer> {
  // Einzelwörter etwas langsamer, damit man sie gut nachsprechen kann
  const rate = text.includes(" ") ? "-5%" : "-12%";
  const ssml = `<speak version="1.0" xml:lang="pt-PT"><voice name="${VOICES[voice]}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "falar-audio",
      },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    throw new Error(`Azure ${res.status}: ${await res.text()}`);
  }
}

const manifest: Record<Voice, Record<string, string>> = { f: {}, m: {} };
let created = 0;
for (const voice of Object.keys(wanted) as Voice[]) {
  for (const text of [...wanted[voice]].sort()) {
    const file = fileName(text, voice);
    if (!existsSync(join(outDir, file))) {
      writeFileSync(join(outDir, file), await synthesize(text, voice));
      created++;
      process.stdout.write(`\r${created} neu vertont …`);
    }
    manifest[voice][text] = file;
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(`\n${created} neue Dateien, ${wanted.f.size + wanted.m.size} insgesamt.`);

if (process.argv.includes("--prune")) {
  const used = new Set([...Object.values(manifest.f), ...Object.values(manifest.m)]);
  for (const f of readdirSync(outDir)) if (!used.has(f)) unlinkSync(join(outDir, f));
}
