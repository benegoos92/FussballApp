import { supabase } from "@/lib/supabase";
import TabNav from "@/components/TabNav";
export const revalidate = 0;
export default async function KassePage() {
  const [{ data: players }, { data: penalties }, { data: penaltyTypes }] = await Promise.all([
    supabase.from("players").select("id,name").eq("active", true).order("name"),
    supabase.from("penalties").select("*").order("created_at", { ascending: false }),
    supabase.from("penalty_types").select("id,name"),
  ]);

  const p = penalties ?? [];
  const totalOpen = p.filter(x => x.status === "offen").reduce((s, x) => s + Number(x.amount), 0);
  const totalPaid = p.filter(x => x.status === "bezahlt").reduce((s, x) => s + Number(x.amount), 0);

  const byPlayer = (players ?? []).map(pl => {
    const pp = p.filter(x => x.player_id === pl.id);
    const open = pp.filter(x => x.status === "offen").reduce((s, x) => s + Number(x.amount), 0);
    const paid = pp.filter(x => x.status === "bezahlt").reduce((s, x) => s + Number(x.amount), 0);
    return { ...pl, open, paid, total: open + paid, count: pp.length };
  }).filter(pl => pl.count > 0).sort((a, b) => b.open - a.open);

  return (
    <div>
      <TabNav />
      <h2 className="text-lg font-semibold mb-4">Mannschaftskasse</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Gesamt</p>
          <p className="text-xl font-bold">{(totalOpen + totalPaid).toFixed(2)} €</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-xs text-red-400 mb-1">Offen</p>
          <p className="text-xl font-bold text-red-600">{totalOpen.toFixed(2)} €</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-green-400 mb-1">Bezahlt</p>
          <p className="text-xl font-bold text-green-600">{totalPaid.toFixed(2)} €</p>
        </div>
      </div>

      {byPlayer.length === 0 && <p className="text-sm text-gray-400">Noch keine Strafen vergeben.</p>}

      <div className="space-y-2">
        {byPlayer.map(pl => (
          <div key={pl.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{pl.name}</p>
                <p className="text-xs text-gray-400">{pl.count} Strafe{pl.count !== 1 ? "n" : ""}</p>
              </div>
              <div className="text-right">
                {pl.open > 0 && <p className="text-sm font-bold text-red-600">{pl.open.toFixed(2)} € offen</p>}
                {pl.paid > 0 && <p className="text-xs text-green-600">{pl.paid.toFixed(2)} € bezahlt</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
