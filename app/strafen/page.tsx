import { supabase } from "@/lib/supabase";
import TabNav from "@/components/TabNav";
import StrafenClient from "./StrafenClient";

export const revalidate = 0;

export default async function StrafenPage() {
  const [{ data: penaltyTypes }, { data: players }, { data: penalties }] = await Promise.all([
    supabase.from("penalty_types").select("*").order("name"),
    supabase.from("players").select("id,name").eq("active", true).order("name"),
    supabase.from("penalties").select("*").order("created_at", { ascending: false }),
  ]);
  return (
    <div>
      <TabNav />
      <StrafenClient penaltyTypes={penaltyTypes ?? []} players={players ?? []} penalties={penalties ?? []} />
    </div>
  );
}
