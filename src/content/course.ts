import type { UnitDef } from "./types";
import { u1 } from "./units/u1";
import { u2 } from "./units/u2";
import { u3 } from "./units/u3";
import { u4 } from "./units/u4";

/**
 * Kursinhalt – europäisches Portugiesisch (pt-PT), Niveau A0–A1.
 * Jede Unit steht in einer eigenen Datei unter units/. IDs von Vokabeln/Sätzen
 * werden automatisch aus dem portugiesischen Text abgeleitet – deshalb den
 * portugiesischen Text bestehender Einträge nicht ändern, sonst geht der
 * Lernfortschritt dazu verloren.
 */
export const course: UnitDef[] = [u1, u2, u3, u4];
