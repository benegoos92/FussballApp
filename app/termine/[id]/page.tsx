import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import TravelClient from "./TravelClient";

export const revalidate = 0;

const CHECKLIST_DEFAULTS = [
  { item: "⚽ Bälle / Ballsack",      sort_order: 0 },
  { item: "👕 Trikots (Heim)",         sort_order: 1 },
  { item: "👕 Trikots (Auswärts)",     sort_order: 2 },
  { item: "🍶 Trinkflaschen",          sort_order: 3 },
  { item: "🩹 Erste-Hilfe-Kasten",    sort_order: 4 },
  { item: "🔶 Hütchen / Pylonen",      sort_order: 5 },
  { item: "🦺 Leibchen",              sort_order: 6 },
  { item: "🪪 Spielerausweise",        sort_order: 7 },
  { item: "⏱️ Stoppuhr",              sort_order: 8 },
];

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: event }, { data: players }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.from("players").select("id,name").eq("active", true).order("name"),
  ]);

  if (!event) notFound();

  const { data: travelResponses } = await supabase
    .from("travel_responses")
    .select("*, car_equipment(*)")
    .eq("event_id", id)
    .order("created_at");

  let { data: checklist } = await supabase
    .from("event_checklist")
    .select("*")
    .eq("event_id", id)
    .order("sort_order");

  if (!checklist?.length) {
    const { data: seeded } = await supabase
      .from("event_checklist")
      .insert(CHECKLIST_DEFAULTS.map(d => ({ ...d, event_id: id })))
      .select("*");
    checklist = seeded ?? [];
  }

  const dateLabel = new Date(event.date + "T00:00:00").toLocaleDateString(
    "de-DE",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/termine"
          className="text-sm text-gray-400 hover:text-gray-600 mb-3 inline-flex items-center gap-1"
        >
          ← Termine
        </Link>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border mr-2 ${
                event.type === "Spiel"
                  ? "bg-red-100 text-red-800 border-red-200"
                  : event.type === "Training"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-purple-100 text-purple-800 border-purple-200"
              }`}
            >
              {event.type}
            </span>
            <h1 className="text-xl font-black text-gray-900 mt-1">{event.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {dateLabel}
              {event.start_time ? ` · ${event.start_time.slice(0, 5)} Uhr` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
        </div>
      </div>

      <TravelClient
        eventId={id}
        players={players ?? []}
        initialTravel={travelResponses ?? []}
        initialChecklist={checklist ?? []}
      />
    </div>
  );
}
