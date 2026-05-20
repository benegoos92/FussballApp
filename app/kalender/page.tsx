import { supabase } from "@/lib/supabase";
import TabNav from "@/components/TabNav";
import MonthCalendar from "@/components/MonthCalendar";

export const revalidate = 0;

export default async function KalenderPage() {
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <div>
      <TabNav />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          Fehler beim Laden: {error.message}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <MonthCalendar events={events ?? []} />
      </div>
    </div>
  );
}
