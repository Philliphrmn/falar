# falar.

Europäisches Portugiesisch (pt-PT) lernen – ruhig, strukturiert, ohne Maskottchen.

- **13 Lektionen in 3 Units** (A0–A1): Begrüßung, Vorstellen, Herkunft, Zahlen, Café, Essen, Familie, ser/estar, Wege, Verkehr, Einkaufen, Uhrzeit, Wochentage
- **Übungsformen:** Auswahl (PT↔DE), Hören, Paare finden, Sätze aus Bausteinen bauen, Übersetzen per Tastatur (mit Akzent-Leiste und Tippfehler-Toleranz), Diktat, Lückentext, Sprechen (Spracherkennung)
- **Grammatik** kurz und sachlich vor jeder Lektion, gesammelt unter `/grammatik`
- **Wiederholung** mit Leitner-Boxen: Jede Vokabel und jeder Satz kommt nach 1, 2, 4, 8, 16, 32 Tagen wieder; Fehler setzen zurück
- **Dezente Statistik:** Tagesziel, Streak, XP der letzten 7 Tage
- Fortschritt geräteübergreifend in **Supabase**

## Lokal starten

```bash
cp .env.example .env.local   # Werte aus dem Supabase-Dashboard (Project Settings → API)
npm install
npm run dev
```

Dann http://localhost:3000 öffnen und registrieren.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/content/course.ts` | Alle Lektionen: Wörter, Sätze, Grammatik. Neue Lektionen einfach ergänzen. |
| `src/lib/exercises.ts` | Erzeugt aus einer Lektion automatisch die Übungsfolge |
| `src/lib/answer.ts` | Antwortprüfung (Akzente, Tippfehler, optionale Pronomen) |
| `src/lib/srs.ts` | Wiederholungs-Logik (Leitner) |
| `src/lib/speech.ts` | Sprachausgabe und -erkennung über die Web Speech API (pt-PT) |
| `supabase/migrations/` | Datenbankschema mit Row Level Security |

## Hinweise

- **Aussprache:** Die App nutzt die Stimmen deines Geräts. Für echtes europäisches Portugiesisch in den Systemeinstellungen eine Stimme „Portugiesisch (Portugal)“ installieren – die Einstellungsseite zeigt an, welche Stimme verwendet wird.
- **Sprechübungen** brauchen Chrome, Edge oder Safari (Firefox unterstützt keine Spracherkennung). Sie lassen sich pro Sitzung abschalten.
- **Deployment (z. B. Vercel):** Die beiden `NEXT_PUBLIC_SUPABASE_*`-Variablen setzen und in Supabase unter *Authentication → URL Configuration* die Site-URL auf die echte Adresse stellen, sonst führen die Bestätigungs-Mails nach `localhost`.
