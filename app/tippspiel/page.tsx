import { supabase } from "@/lib/supabase";
import TippspielClient from "./TippspielClient";

export const dynamic = "force-dynamic";

export default async function TippspielPage() {
  const [
    { data: teilnehmer },
    { data: spieltage },
    { data: spieler },
  ] = await Promise.all([
    supabase.from("tipp_teilnehmer").select("*").order("name"),
    supabase
      .from("tipp_spieltage")
      .select("*, tipp_spiele(*)")
      .order("spieltag"),
    supabase.from("players").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Bundesliga-Tippspiel</h1>
      <p className="text-sm text-gray-500 mb-5">Tippe die Bundesligaergebnisse und sammle Punkte.</p>
      <TippspielClient
        teilnehmer={teilnehmer ?? []}
        spieltage={spieltage ?? []}
        spieler={spieler ?? []}
      />
    </div>
  );
}
