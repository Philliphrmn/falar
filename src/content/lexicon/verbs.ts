import type { VerbDef } from "../types";

/**
 * Konjugationstabellen aller Verben des Kurses (Präsens + weitere Formen, die im
 * Kurs vorkommen). Welche Lektion ein Verb einführt, ergibt sich aus den
 * Vokabeln, die im Lexikon per `verb` darauf verweisen.
 */
export const verbList: VerbDef[] = [
  {
    inf: "desculpar",
    de: "entschuldigen",
    present: ["desculpo", "desculpas", "desculpa", "desculpamos", "desculpam"],
    extra: [
      { label: "Imperativ (Sie)", forms: [["desculpe", "entschuldigen Sie / Entschuldigung"]] },
    ],
    note: "regelmäßig – „Desculpe“ ist die höfliche Aufforderung (Sie)",
    sound: "dschkulPAR",
  },
  {
    inf: "perceber",
    de: "verstehen",
    present: ["percebo", "percebes", "percebe", "percebemos", "percebem"],
    note: "regelmäßig – in Portugal das übliche Wort für „verstehen“",
  },
  {
    inf: "ser",
    de: "sein",
    present: ["sou", "és", "é", "somos", "são"],
    extra: [
      { label: "Vergangenheit (Pretérito)", forms: [["foi", "war"]] },
    ],
    note: "unregelmäßig – für Herkunft, Beruf, Eigenschaften, Uhrzeit",
  },
  {
    inf: "chamar-se",
    de: "heißen",
    present: ["chamo-me", "chamas-te", "chama-se", "chamamo-nos", "chamam-se"],
    extra: [
      { label: "Nach não / Fragewort", forms: [["te chamas", "du heißt"]] },
    ],
    note: "reflexiv: das me steht in Portugal hinter dem Verb, nach Fragewörtern davor",
  },
  {
    inf: "morar",
    de: "wohnen",
    present: ["moro", "moras", "mora", "moramos", "moram"],
    note: "regelmäßig auf -ar",
  },
  {
    inf: "ter",
    de: "haben",
    present: ["tenho", "tens", "tem", "temos", "têm"],
    note: "unregelmäßig – auch für das Alter: „Tenho vinte anos“; eles têm mit Zirkumflex",
  },
  {
    inf: "querer",
    de: "wollen",
    present: ["quero", "queres", "quer", "queremos", "querem"],
    extra: [
      { label: "Höfliche Bitte (Imperfeito)", forms: [["queria", "ich hätte gern / ich möchte"]] },
    ],
    note: "unregelmäßig",
  },
  {
    inf: "fazer",
    de: "machen, tun",
    present: ["faço", "fazes", "faz", "fazemos", "fazem"],
    note: "unregelmäßig – „se faz favor“ heißt wörtlich „wenn Sie die Güte haben“",
    sound: "faSER",
  },
  {
    inf: "desejar",
    de: "wünschen",
    present: ["desejo", "desejas", "deseja", "desejamos", "desejam"],
    note: "regelmäßig – „O que deseja?“ = Was darf es sein?",
  },
  {
    inf: "comer",
    de: "essen",
    present: ["como", "comes", "come", "comemos", "comem"],
    note: "regelmäßig auf -er",
  },
  {
    inf: "beber",
    de: "trinken",
    present: ["bebo", "bebes", "bebe", "bebemos", "bebem"],
    note: "regelmäßig auf -er",
  },
  {
    inf: "gostar",
    de: "mögen, gernhaben",
    present: ["gosto", "gostas", "gosta", "gostamos", "gostam"],
    note: "regelmäßig – immer mit de: „gosto de peixe“",
  },
  {
    inf: "estar",
    de: "sein (Zustand, Ort)",
    present: ["estou", "estás", "está", "estamos", "estão"],
    note: "unregelmäßig – für Befinden und Aufenthaltsort; estar a + Infinitiv = gerade etwas tun",
  },
  {
    inf: "trabalhar",
    de: "arbeiten",
    present: ["trabalho", "trabalhas", "trabalha", "trabalhamos", "trabalham"],
    note: "regelmäßig auf -ar",
  },
  {
    inf: "ficar",
    de: "liegen, sich befinden; bleiben",
    present: ["fico", "ficas", "fica", "ficamos", "ficam"],
    note: "regelmäßig – für die Lage von Orten: „Onde fica …?“",
  },
  {
    inf: "seguir",
    de: "folgen, weitergehen",
    present: ["sigo", "segues", "segue", "seguimos", "seguem"],
    extra: [
      { label: "Imperativ (Sie)", forms: [["siga", "gehen Sie (weiter)"]] },
    ],
    note: "unregelmäßig (eu sigo)",
    sound: "ßGIR",
  },
  {
    inf: "ir",
    de: "gehen, fahren",
    present: ["vou", "vais", "vai", "vamos", "vão"],
    note: "unregelmäßig – ir + Infinitiv drückt Pläne aus: „Vou jantar fora“",
  },
  {
    inf: "apanhar",
    de: "nehmen (Bus, Zug), erwischen",
    present: ["apanho", "apanhas", "apanha", "apanhamos", "apanham"],
    note: "regelmäßig – in Portugal statt brasilianisch „pegar“",
  },
  {
    inf: "partir",
    de: "abfahren, abreisen",
    present: ["parto", "partes", "parte", "partimos", "partem"],
    note: "regelmäßig auf -ir – „Quando parte o comboio?“",
  },
  {
    inf: "custar",
    de: "kosten",
    present: ["custo", "custas", "custa", "custamos", "custam"],
    note: "regelmäßig – meist nur 3. Person: custa / custam",
  },
  {
    inf: "pagar",
    de: "bezahlen",
    present: ["pago", "pagas", "paga", "pagamos", "pagam"],
    note: "regelmäßig auf -ar",
  },
  {
    inf: "poder",
    de: "können, dürfen",
    present: ["posso", "podes", "pode", "podemos", "podem"],
    note: "unregelmäßig – mit Infinitiv: „Posso pagar?“, „Pode repetir?“",
  },
  {
    inf: "abrir",
    de: "öffnen, aufmachen",
    present: ["abro", "abres", "abre", "abrimos", "abrem"],
    note: "regelmäßig auf -ir",
  },
  {
    inf: "chegar",
    de: "ankommen",
    present: ["chego", "chegas", "chega", "chegamos", "chegam"],
    note: "regelmäßig – eu chego mit g",
    sound: "schGAR",
  },
  {
    inf: "falar",
    de: "sprechen",
    present: ["falo", "falas", "fala", "falamos", "falam"],
    note: "regelmäßig auf -ar – nach falar meist kein Artikel: „Falo português“",
  },
  {
    inf: "estudar",
    de: "lernen, studieren",
    present: ["estudo", "estudas", "estuda", "estudamos", "estudam"],
    note: "regelmäßig auf -ar",
  },
  {
    inf: "dizer",
    de: "sagen",
    present: ["digo", "dizes", "diz", "dizemos", "dizem"],
    extra: [
      { label: "Unpersönlich (man)", forms: [["se diz", "sagt man"]] },
    ],
    note: "unregelmäßig (eu digo)",
    sound: "diSER",
  },
  {
    inf: "saber",
    de: "wissen",
    present: ["sei", "sabes", "sabe", "sabemos", "sabem"],
    note: "unregelmäßig (eu sei) – „Sabe onde fica …?“ = Wissen Sie, wo …?",
  },
  {
    inf: "repetir",
    de: "wiederholen",
    present: ["repito", "repetes", "repete", "repetimos", "repetem"],
    note: "unregelmäßig (eu repito) – „Pode repetir?“",
  },
  {
    inf: "acordar",
    de: "aufwachen",
    present: ["acordo", "acordas", "acorda", "acordamos", "acordam"],
    note: "regelmäßig auf -ar",
  },
  {
    inf: "levantar-se",
    de: "aufstehen",
    present: ["levanto-me", "levantas-te", "levanta-se", "levantamo-nos", "levantam-se"],
    extra: [
      { label: "Nach não / Fragewort", forms: [["me levanto", "ich stehe (nicht) auf"], ["te levantas", "du stehst auf"]] },
    ],
    note: "reflexiv: das me steht in Portugal hinter dem Verb, nach não und Fragewörtern davor",
  },
  {
    inf: "deitar-se",
    de: "ins Bett gehen, sich hinlegen",
    present: ["deito-me", "deitas-te", "deita-se", "deitamo-nos", "deitam-se"],
    note: "reflexiv: das me steht in Portugal hinter dem Verb",
  },
  {
    inf: "tomar",
    de: "nehmen; trinken, essen",
    present: ["tomo", "tomas", "toma", "tomamos", "tomam"],
    note: "regelmäßig – „tomar duche“ = duschen",
  },
  {
    inf: "sair",
    de: "hinausgehen, ausgehen, losgehen",
    present: ["saio", "sais", "sai", "saímos", "saem"],
    note: "unregelmäßig (eu saio)",
    sound: "ßaIR",
  },
  {
    inf: "visitar",
    de: "besuchen",
    present: ["visito", "visitas", "visita", "visitamos", "visitam"],
    note: "regelmäßig auf -ar",
  },
  {
    inf: "jantar",
    de: "zu Abend essen",
    present: ["janto", "jantas", "janta", "jantamos", "jantam"],
    note: "regelmäßig – auch Nomen: o jantar = das Abendessen; „jantar fora“ = auswärts essen",
  },
  {
    inf: "descansar",
    de: "sich ausruhen",
    present: ["descanso", "descansas", "descansa", "descansamos", "descansam"],
    note: "regelmäßig auf -ar",
  },
];
