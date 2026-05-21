"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { DutyType, Duty } from "@/lib/database.types";

interface Props {
  dutyTypes: DutyType[];
  players: { id: string; name: string }[];
  duties: Duty[];
}

export default function DiensteClient({ dutyTypes, players, duties }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"plan" | "typen">("plan");
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", description: "", players_needed: "1", cycle_days: "7" });
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ type_id: "", start_date: "", weeks: "4" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function saveType() {
    setSaving(true); setErr(null);
    const { error } = await supabase.from("duty_types").insert({ name: typeForm.name, description: typeForm.description || null, players_needed: parseInt(typeForm.players_needed), cycle_days: parseInt(typeForm.cycle_days) });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowTypeForm(false); setTypeForm({ name: "", description: "", players_needed: "1", cycle_days: "7" }); router.refresh();
  }

  async function generatePlan() {
    setSaving(true); setErr(null);
    const type = dutyTypes.find(t => t.id === genForm.type_id);
    if (!type || players.length === 0) { setErr("Kein Diensttyp oder keine Spieler vorhanden."); setSaving(false); return; }

    const weeks = parseInt(genForm.weeks);
    const startDate = new Date(genForm.start_date + "T00:00:00");
    const inserts: { type_id: string; player_id: string; scheduled_date: string }[] = [];

    let playerIdx = 0;
    for (let w = 0; w < weeks; w++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * type.cycle_days);
      const dateStr = d.toISOString().slice(0, 10);
      for (let slot = 0; slot < type.players_needed; slot++) {
        inserts.push({ type_id: type.id, player_id: players[playerIdx % players.length].id, scheduled_date: dateStr });
        playerIdx++;
      }
    }

    const { error } = await supabase.from("duties").insert(inserts);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowGenerate(false); setGenForm({ type_id: "", start_date: "", weeks: "4" }); router.refresh();
  }

  async function deleteDuty(id: string) {
    await supabase.from("duties").delete().eq("id", id); router.refresh();
  }

  async function deleteType(id: string) {
    if (!confirm("Diensttyp und alle zugehörigen Dienste löschen?")) return;
    await supabase.from("duties").delete().eq("type_id", id);
    await supabase.from("duty_types").delete().eq("id", id); router.refresh();
  }

  const playerName = (id: string) => players.find(p => p.id === id)?.name ?? "?";
  const typeName = (id: string) => dutyTypes.find(t => t.id === id)?.name ?? "?";

  const upcomingDuties = duties.filter(d => d.scheduled_date >= new Date().toISOString().slice(0, 10)).slice(0, 30);

  return (
    <div>
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {(["plan", "typen"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "plan" ? "Dienstplan" : "Diensttypen"}
          </button>
        ))}
      </div>

      {tab === "typen" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Diensttypen</h3>
            <button onClick={() => setShowTypeForm(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg">+ Diensttyp</button>
          </div>
          {dutyTypes.length === 0 && <p className="text-sm text-gray-400">Noch keine Diensttypen.</p>}
          <div className="space-y-2">
            {dutyTypes.map(t => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.players_needed} Spieler · alle {t.cycle_days} Tage</p>
                  {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                </div>
                <button onClick={() => deleteType(t.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Löschen</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "plan" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Dienstplan</h3>
            <button onClick={() => setShowGenerate(true)} disabled={dutyTypes.length === 0 || players.length === 0} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg">Plan generieren</button>
          </div>
          {upcomingDuties.length === 0 && <p className="text-sm text-gray-400">Noch kein Dienstplan. Erst Diensttypen anlegen, dann Plan generieren.</p>}
          <div className="space-y-2">
            {upcomingDuties.map(d => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">{new Date(d.scheduled_date + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}</p>
                  <p className="font-medium text-sm">{typeName(d.type_id)}</p>
                  <p className="text-xs text-gray-500">{playerName(d.player_id)}</p>
                </div>
                <button onClick={() => deleteDuty(d.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Entfernen</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTypeForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">Neuer Diensttyp</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Trikotdienst" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Spieler benötigt</label><input type="number" min="1" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={typeForm.players_needed} onChange={e => setTypeForm(f => ({ ...f, players_needed: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Turnus (Tage)</label><input type="number" min="1" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={typeForm.cycle_days} onChange={e => setTypeForm(f => ({ ...f, cycle_days: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Beschreibung</label><textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={typeForm.description} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTypeForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={saveType} disabled={saving || !typeForm.name} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? "..." : "Erstellen"}</button>
            </div>
          </div>
        </div>
      )}

      {showGenerate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">Dienstplan generieren</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Diensttyp *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={genForm.type_id} onChange={e => setGenForm(f => ({ ...f, type_id: e.target.value }))}>
                  <option value="">Typ wählen</option>
                  {dutyTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Startdatum *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={genForm.start_date} onChange={e => setGenForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Anzahl Zyklen</label><input type="number" min="1" max="52" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={genForm.weeks} onChange={e => setGenForm(f => ({ ...f, weeks: e.target.value }))} /></div>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowGenerate(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={generatePlan} disabled={saving || !genForm.type_id || !genForm.start_date} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? "Generiere..." : "Generieren"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
