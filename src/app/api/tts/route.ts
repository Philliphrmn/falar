import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase";

/**
 * Sprachausgabe über Azure Neural Voices (pt-PT) für Texte ohne vorab erzeugte
 * Aufnahme – damit nie die (oft englische) Gerätestimme einspringen muss.
 * Nur für angemeldete Nutzer, kurze Texte.
 */

const MAX_CHARS = 300;
const VOICES = { f: "pt-PT-RaquelNeural", m: "pt-PT-DuarteNeural" } as const;

const auth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(request: Request) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION ?? "westeurope";
  if (!key) return Response.json({ error: "not-configured" }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const { data } = token ? await auth.auth.getUser(token) : { data: { user: null } };
  if (!data.user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { text?: unknown; voice?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS) return Response.json({ error: "bad-text" }, { status: 400 });
  const voice = body?.voice === "m" ? VOICES.m : VOICES.f;

  // Einzelwörter etwas langsamer, wie bei den vorab erzeugten Aufnahmen
  const rate = text.includes(" ") ? "-5%" : "-12%";
  const ssml = `<speak version="1.0" xml:lang="pt-PT"><voice name="${voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "falar",
    },
    body: ssml,
  });
  if (!res.ok) {
    console.error("Azure TTS", res.status, await res.text());
    return Response.json({ error: "azure" }, { status: 502 });
  }
  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
  });
}
