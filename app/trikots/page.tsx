import { supabase } from "@/lib/supabase";
import TabNav from "@/components/TabNav";
import TrikotsClient from "./TrikotsClient";

export const revalidate = 0;

export default async function TrikotsPage() {
  const [{ data: sets }, { data: jerseys }, { data: players }] = await Promise.all([
    supabase.from("jersey_sets").select("*").order("name"),
    supabase.from("jerseys").select("*").order("number"),
    supabase.from("players").select("id,name,size").eq("active", true).order("name"),
  ]);
  return (
    <div>
      <TabNav />
      <TrikotsClient sets={sets ?? []} jerseys={jerseys ?? []} players={players ?? []} />
    </div>
  );
}
