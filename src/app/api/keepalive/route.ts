import { supabase } from "@/lib/supabase";

/**
 * Hält das Supabase-Projekt wach: Im kostenlosen Tarif pausiert Supabase Projekte nach
 * rund einer Woche ohne Aktivität – dann klappt kein Login mehr. Vercel ruft diese Route
 * täglich auf (vercel.json → crons) und stellt dafür eine kleine Anfrage an die Datenbank.
 * Dank Row Level Security liefert sie ohne Login keine Daten, läuft aber trotzdem.
 */
export async function GET() {
  const { error } = await supabase.from("activity_days").select("day", { head: true, count: "exact" });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 502 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
