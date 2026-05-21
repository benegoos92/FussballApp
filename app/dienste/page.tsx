import { supabase } from "@/lib/supabase";
import TabNav from "@/components/TabNav";
import DiensteClient from "./DiensteClient";

export const revalidate = 0;

export default async function DienstePage() {
  const [{ data: dutyTypes }, { data: players }, { data: duties }] = await Promise.all([
    supabase.from("duty_types").select("*").order("name"),
    supabase.from("players").select("id,name").eq("active", true).order("name"),
    supabase.from("duties").select("*").order("scheduled_date"),
  ]);
  return (
    <div>
      <TabNav />
      <DiensteClient dutyTypes={dutyTypes ?? []} players={players ?? []} duties={duties ?? []} />
    </div>
  );
}
