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

// Kreisliga A1 Stuttgart/Böblingen – Stand: Mai 2026
// Quelle: fussball.de (manuell gepflegt)
export const LIGA_TABLE: TableEntry[] = [
  { pos: 1,  team: "TSV Münchingen",           sp: 24, w: 17, d: 2, l: 5,  goals: "63:28", pts: 53 },
  { pos: 2,  team: "SV Yesilyurt Stuttgart",   sp: 24, w: 15, d: 5, l: 4,  goals: "58:31", pts: 50 },
  { pos: 3,  team: "TSV Weilimdorf",           sp: 24, w: 14, d: 4, l: 6,  goals: "52:32", pts: 46 },
  { pos: 4,  team: "FK Srbija Stuttgart",      sp: 24, w: 13, d: 5, l: 6,  goals: "49:35", pts: 44 },
  { pos: 5,  team: "SpVgg Feuerbach",          sp: 24, w: 12, d: 6, l: 6,  goals: "45:34", pts: 42 },
  { pos: 6,  team: "FC Wangen Stuttgart",      sp: 24, w: 10, d: 7, l: 7,  goals: "41:38", pts: 37 },
  { pos: 7,  team: "VfR Korntal",              sp: 24, w: 10, d: 4, l: 10, goals: "40:42", pts: 34 },
  { pos: 8,  team: "SV Rohracker",             sp: 24, w: 7,  d: 5, l: 12, goals: "35:46", pts: 26 },
  { pos: 9,  team: "SG Stuttgart West",        sp: 24, w: 6,  d: 4, l: 14, goals: "32:52", pts: 22, isOwn: true },
  { pos: 10, team: "TSV Strohgäu",             sp: 24, w: 5,  d: 6, l: 13, goals: "28:50", pts: 21 },
  { pos: 11, team: "FC Ohlendorf",             sp: 24, w: 4,  d: 5, l: 15, goals: "26:58", pts: 17 },
  { pos: 12, team: "SV Türkgücü Stuttgart",    sp: 24, w: 4,  d: 3, l: 17, goals: "22:65", pts: 15 },
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
