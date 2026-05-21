export type TableEntry = {
  pos: number;
  team: string;
  sp: number;
  w: number;
  d: number;
  l: number;
  goals: string;
  pts: number;
  isOwn?: boolean;
};

export type Fixture = {
  date: string;
  home: string;
  away: string;
  isHome: boolean;
  time?: string;
};

// Kreisliga A1 Stuttgart/Böblingen – Stand: 21. Mai 2026
// Quelle: fupa.net (live-fetched, dies ist der statische Fallback)
export const LIGA_TABLE: TableEntry[] = [
  { pos: 1,  team: "OFK Beograd Stuttgart",      sp: 27, w: 22, d: 3, l: 2,  goals: "103:39",  pts: 69 },
  { pos: 2,  team: "Türkspor Stuttgart",          sp: 27, w: 19, d: 3, l: 5,  goals: "119:48",  pts: 60 },
  { pos: 3,  team: "SG Weilimdorf",               sp: 27, w: 18, d: 3, l: 6,  goals: "93:43",   pts: 57 },
  { pos: 4,  team: "TSVgg Stuttgart-Münster",     sp: 27, w: 17, d: 4, l: 6,  goals: "76:42",   pts: 55 },
  { pos: 5,  team: "Sportvg Feuerbach",           sp: 27, w: 13, d: 5, l: 9,  goals: "71:47",   pts: 44 },
  { pos: 6,  team: "TV89 Zuffenhausen",           sp: 27, w: 12, d: 5, l: 10, goals: "64:70",   pts: 41 },
  { pos: 7,  team: "SV Prag Stuttgart",           sp: 28, w: 11, d: 4, l: 13, goals: "75:67",   pts: 37 },
  { pos: 8,  team: "TSV Uhlbach",                 sp: 27, w: 12, d: 1, l: 14, goals: "79:91",   pts: 37 },
  { pos: 9,  team: "SSV Zuffenhausen",            sp: 27, w: 11, d: 3, l: 13, goals: "63:68",   pts: 36 },
  { pos: 10, team: "TSV Weilimdorf II",           sp: 28, w: 10, d: 5, l: 13, goals: "68:66",   pts: 35 },
  { pos: 11, team: "TV Zazenhausen",              sp: 27, w: 11, d: 2, l: 14, goals: "47:73",   pts: 35 },
  { pos: 12, team: "SG Stuttgart West",           sp: 27, w: 10, d: 4, l: 13, goals: "56:62",   pts: 34, isOwn: true },
  { pos: 13, team: "TSV Mühlhausen/Stuttgart",    sp: 27, w: 10, d: 3, l: 14, goals: "59:67",   pts: 33 },
  { pos: 14, team: "TB Untertürkheim",            sp: 27, w: 6,  d: 7, l: 14, goals: "48:79",   pts: 25 },
  { pos: 15, team: "SportKultur Stuttgart",       sp: 27, w: 3,  d: 3, l: 21, goals: "37:90",   pts: 12 },
  { pos: 16, team: "SC Stammheim",                sp: 27, w: 3,  d: 3, l: 21, goals: "56:162",  pts: 12 },
];

export const LIGA_FIXTURES: Fixture[] = [
  { date: "2026-05-25", home: "SG Stuttgart West", away: "TSV Strohgäu",       isHome: true,  time: "15:00" },
  { date: "2026-06-01", home: "VfR Korntal",        away: "SG Stuttgart West", isHome: false, time: "15:00" },
  { date: "2026-06-08", home: "SG Stuttgart West", away: "FC Ohlendorf",       isHome: true,  time: "15:00" },
];

export const LIGA_NAME = "Kreisliga A1 Stuttgart/Böblingen";
export const LIGA_SEASON = "2025/26";
export const FUSSBALL_DE_URL =
  "https://www.fussball.de/mannschaft/sg-stuttgart-west-sg-stuttgart-west-wuerttemberg/-/saison/2526/team-id/011MIA2RBG000000VTVG0001VTR8C1K7";
