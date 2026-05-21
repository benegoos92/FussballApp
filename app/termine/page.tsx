import { supabase } from "@/lib/supabase";
import TabNav from "@/components/TabNav";
import TermineClient from "./TermineClient";

export const revalidate = 0;

export default async function TerminePage() {
  const [{ data: events }, { data: players }] = await Promise.all([
    supabase.from("events").select("*").order("date").order("start_time"),
    supabase.from("players").select("id,name").eq("active", true).order("name"),
  ]);
  const { data: attendances } = await supabase
    .from("event_attendances")
    .select("*");

  return (
    <div>
      <TabNav />
      <TermineClient
        events={events ?? []}
        players={players ?? []}
        attendances={attendances ?? []}
      />
    </div>
  );
}
