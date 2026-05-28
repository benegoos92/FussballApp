import { supabase } from "@/lib/supabase";
import TippspielClient from "./TippspielClient";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type RawSpieltag = Database["public"]["Tables"]["tipp_spieltage"]["Row"];
type RawSpiel = Database["public"]["Tables"]["tipp_spiele"]["Row"];

export type Spieltag = RawSpieltag & { tipp_spiele: RawSpiel[] };

export default async function TippspielPage() {
  const [
    { data: teilnehmer },
    { data: rawSpieltage },
    { data: allSpiele },
    { data: spieler },
  ] = await Promise.all([
    supabase.from("tipp_teilnehmer").select("*").order("name"),
    supabase.from("tipp_spieltage").select("*").order("spieltag"),
    supabase.from("tipp_spiele").select("*").order("kickoff"),
    supabase.from("players").select("id, name").eq("active", true).order("name"),
  ]);

  const spieltage: Spieltag[] = (rawSpieltage ?? []).map(st => ({
    ...st,
    tipp_spiele: (allSpiele ?? []).filter(s => s.spieltag_id === st.id),
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Bundesliga-Tippspiel</h1>
      <p className="text-sm text-gray-500 mb-5">Tippe die Bundesligaergebnisse und sammle Punkte.</p>
      <TippspielClient
        teilnehmer={teilnehmer ?? []}
        spieltage={spieltage}
        spieler={spieler ?? []}
      />
    </div>
  );
}
