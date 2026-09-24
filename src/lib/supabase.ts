import { createClient } from "@supabase/supabase-js";

// Öffentliche Werte des Supabase-Projekts „falar“. Der Publishable Key ist für
// den Browser gedacht; der Zugriff ist über Row Level Security abgesichert.
// Umgebungsvariablen (siehe .env.example) haben Vorrang.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://becklwpbvwaldvkssmcw.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_VVAM5HLHQPBAqC9qRIQBQg_bruW79pA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
