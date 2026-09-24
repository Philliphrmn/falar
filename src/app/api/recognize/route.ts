import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase";

/**
 * Spracherkennung über Azure Speech-to-Text (pt-PT). Der Browser schickt eine
 * WAV-Aufnahme (16 kHz, mono), wir reichen sie mit dem geheimen Key an Azure
 * weiter und liefern die erkannten Varianten zurück. Nur für angemeldete Nutzer.
 */

const MAX_BYTES = 1_000_000; // ≈ 30 s bei 16 kHz/16 bit

const auth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type AzureResult = {
  RecognitionStatus: string;
  NBest?: { Display: string; Lexical: string }[];
};

export async function POST(request: Request) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION ?? "westeurope";
  if (!key) return Response.json({ error: "not-configured" }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const { data } = token ? await auth.auth.getUser(token) : { data: { user: null } };
  if (!data.user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const audio = await request.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > MAX_BYTES) {
    return Response.json({ error: "bad-audio" }, { status: 400 });
  }

  const res = await fetch(
    `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=pt-PT&format=detailed`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        Accept: "application/json",
      },
      body: audio,
    },
  );
  if (!res.ok) {
    console.error("Azure STT", res.status, await res.text());
    return Response.json({ error: "azure" }, { status: 502 });
  }

  const result = (await res.json()) as AzureResult;
  const alternatives =
    result.RecognitionStatus === "Success"
      ? [...new Set(result.NBest?.flatMap((n) => [n.Display, n.Lexical]) ?? [])].filter(Boolean)
      : [];
  return Response.json({ alternatives });
}
