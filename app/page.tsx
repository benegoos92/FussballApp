import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { LIGA_FIXTURES, LIGA_TABLE } from "@/lib/liga-data";
import { fetchTable, fetchFixtures } from "@/lib/fupa";

export const revalidate = 60;

const TYPE_GRADIENT: Record<string, string> = {
  Training: "from-blue-900 to-blue-700",
  Spiel:    "from-green-900 to-green-600",
  Event:    "from-purple-900 to-purple-700",
};
const TYPE_DOT: Record<string, string> = {
  Training: "bg-blue-400",
  Spiel:    "bg-green-400",
  Event:    "bg-purple-400",
};
const TYPE_LABEL: Record<string, string> = {
  Training: "🏃 Nächstes Training",
  Spiel:    "⚽ Nächstes Spiel",
  Event:    "📅 Nächster Termin",
};

function fmtDate(d: string, t?: string | null) {
  const date = new Date(d + "T00:00:00");
  const label = date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  return t ? `${label} · ${t} Uhr` : label;
}

function fmtShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short", day: "numeric", month: "short",
  });
}

async function fetchFupaData() {
  const [table, fixtures] = await Promise.all([fetchTable(), fetchFixtures()]);
  return {
    table: table ?? LIGA_TABLE,
    fixtures: fixtures ?? LIGA_FIXTURES,
  };
}

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [[{ data: events }, { data: players }, { data: attendances }], { table: ligaTable, fixtures: ligaFixtures }] =
    await Promise.all([
      Promise.all([
        supabase.from("events").select("*").gte("date", today).order("date").order("start_time").limit(5),
        supabase.from("players").select("id").eq("active", true),
        supabase.from("event_attendances").select("*"),
      ]),
      fetchFupaData(),
    ]);

  const upcoming = events ?? [];
  const next = upcoming[0] ?? null;
  const activeCount = players?.length ?? 0;
  const allAtt = attendances ?? [];

  const nextAtt = next ? allAtt.filter(a => a.event_id === next.id) : [];
  const zusagen = nextAtt.filter(a => a.status === "zusage").length;
  const absagen = nextAtt.filter(a => a.status === "absage").length;
  const pending = activeCount - zusagen - absagen;

  const ownEntry = ligaTable.find(e => e.isOwn);
  const ownPos = ownEntry?.pos ?? "–";

  return (
    <div className="space-y-6">

      {/* Hero: Next Event */}
      {next ? (
        <div className={`rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${TYPE_GRADIENT[next.type] ?? "from-gray-800 to-gray-600"}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
            {TYPE_LABEL[next.type] ?? "📅 Nächster Termin"}
          </p>
          <h2 className="text-xl sm:text-2xl font-black leading-tight mb-1">{next.title}</h2>
          <p className="text-sm text-white/80 mb-5">{fmtDate(next.date, next.start_time)}&ensp;·&ensp;{next.location}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-300 shrink-0" />
              <span><span className="font-bold">{zusagen}</span> Zusagen</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300 shrink-0" />
              <span><span className="font-bold">{absagen}</span> Absagen</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0" />
              <span className="text-white/60">{pending} ausstehend</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-8 bg-white border-2 border-dashed border-gray-200 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-gray-500">Keine bevorstehenden Termine</p>
          <Link href="/termine" className="mt-2 inline-block text-sm text-green-600 hover:underline">
            Termin erstellen →
          </Link>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-black text-gray-800">{activeCount}</p>
          <p className="text-xs text-gray-400 mt-1">Spieler</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-black text-green-600">{zusagen}</p>
          <p className="text-xs text-gray-400 mt-1">Zusagen</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-black text-green-700">{ownPos}.</p>
          <p className="text-xs text-gray-400 mt-1">Tabellenplatz</p>
        </div>
      </div>

      {/* Two-column: Upcoming + Liga Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Upcoming Events */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Nächste Termine</h3>
            <Link href="/termine" className="text-xs text-green-600 hover:underline font-medium">Alle →</Link>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <div className="text-sm text-gray-400 py-6 text-center bg-white rounded-xl border border-gray-200">
                Keine Termine geplant
              </div>
            )}
            {upcoming.map(ev => {
              const evZusagen = allAtt.filter(a => a.event_id === ev.id && a.status === "zusage").length;
              return (
                <div key={ev.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                  <div className={`w-1.5 h-10 rounded-full shrink-0 ${TYPE_DOT[ev.type] ?? "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-400">
                      {fmtShort(ev.date)}{ev.start_time ? ` · ${ev.start_time} Uhr` : ""}
                    </p>
                  </div>
                  {evZusagen > 0 && (
                    <span className="shrink-0 text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                      {evZusagen} ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Liga Table */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Ligatabelle</h3>
            <a
              href="https://www.fupa.net/league/kreisliga-a1-stuttgart-boeblingen/standing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:underline font-medium"
            >
              fupa.net ↗
            </a>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide">
                  <th className="py-2 pl-3 pr-1 text-left w-7">#</th>
                  <th className="py-2 px-1 text-left">Team</th>
                  <th className="py-2 px-1 text-right w-7">Sp</th>
                  <th className="py-2 px-1 text-right w-7 hidden sm:table-cell">S</th>
                  <th className="py-2 px-1 text-right w-7 hidden sm:table-cell">U</th>
                  <th className="py-2 px-1 text-right w-7 hidden sm:table-cell">N</th>
                  <th className="py-2 px-1 text-right w-14 hidden sm:table-cell">Tore</th>
                  <th className="py-2 pl-1 pr-3 text-right w-8 font-bold">Pkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ligaTable.map((row) => (
                  <tr
                    key={row.pos}
                    className={`${row.isOwn ? "bg-green-50" : "hover:bg-gray-50"} transition-colors`}
                  >
                    <td className={`py-2 pl-3 pr-1 font-bold ${row.isOwn ? "text-green-700" : "text-gray-400"}`}>
                      {row.pos}
                    </td>
                    <td className={`py-2 px-1 font-medium truncate max-w-[140px] ${row.isOwn ? "text-green-800 font-bold" : "text-gray-700"}`}>
                      {row.isOwn ? `⚽ ${row.team}` : row.team}
                    </td>
                    <td className="py-2 px-1 text-right text-gray-500">{row.sp}</td>
                    <td className="py-2 px-1 text-right text-gray-500 hidden sm:table-cell">{row.w}</td>
                    <td className="py-2 px-1 text-right text-gray-500 hidden sm:table-cell">{row.d}</td>
                    <td className="py-2 px-1 text-right text-gray-500 hidden sm:table-cell">{row.l}</td>
                    <td className="py-2 px-1 text-right text-gray-400 hidden sm:table-cell">{row.goals}</td>
                    <td className={`py-2 pl-1 pr-3 text-right font-black ${row.isOwn ? "text-green-700" : "text-gray-800"}`}>
                      {row.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Next Fixtures */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Nächste Ligaspiele</h3>
          <span className="text-xs text-gray-400">2025/26</span>
        </div>
        <div className="space-y-2">
          {ligaFixtures.map((fix, i) => (
            <div
              key={i}
              className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm ${
                fix.isHome ? "border-green-200" : "border-gray-200"
              }`}
            >
              <div className="shrink-0 w-20 sm:w-24">
                <p className="text-xs font-semibold text-gray-700">{fmtShort(fix.date)}</p>
                {fix.time && <p className="text-xs text-gray-400">{fix.time} Uhr</p>}
              </div>
              <div className="flex-1 flex items-center gap-2 text-sm overflow-hidden">
                <span className={`font-semibold truncate ${fix.isHome ? "text-green-700" : "text-gray-600"}`}>{fix.home}</span>
                <span className="text-gray-300 text-xs shrink-0">vs</span>
                <span className={`font-semibold truncate ${!fix.isHome ? "text-green-700" : "text-gray-600"}`}>{fix.away}</span>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${fix.isHome ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {fix.isHome ? "Heim" : "Auswärts"}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
