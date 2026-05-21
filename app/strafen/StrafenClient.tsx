"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PenaltyType, Penalty, Player } from "@/lib/database.types";

interface Props {
  penaltyTypes: PenaltyType[];
  players: { id: string; name: string }[];
  penalties: Penalty[];
}

export default function StrafenClient({ penaltyTypes, players, penalties }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"katalog" | "vergeben">("vergeben");
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", description: "", amount: "" });
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ player_id: "", type_id: "", reason: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function saveType() {
    setSaving(true); setErr(null);
    const { error } = await supabase.from("penalty_types").insert({ name: typeForm.name, description: typeForm.description || null, amount: parseFloat(typeForm.amount) });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowTypeForm(false); setTypeForm({ name: "", description: "", amount: "" }); router.refresh();
  }

  async function deleteType(id: string) {
    if (!confirm("Strafentyp löschen?")) return;
    await supabase.from("penalty_types").delete().eq("id", id); router.refresh();
  }

  async function assignPenalty() {
    setSaving(true); setErr(null);
    const type = penaltyTypes.find(t => t.id === assignForm.type_id);
    if (!type) return;
    const { error } = await supabase.from("penalties").insert({ player_id: assignForm.player_id, type_id: assignForm.type_id, amount: type.amount, due_date: assignForm.due_date, reason: assignForm.reason || null });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowAssign(false); setAssignForm({ player_id: "", type_id: "", reason: "", due_date: "" }); router.refresh();
  }

  async function markPaid(id: string) {
    await supabase.from("penalties").update({ status: "bezahlt", paid_at: new Date().toISOString() }).eq("id", id); router.refresh();
  }

  async function markOpen(id: string) {
    await supabase.from("penalties").update({ status: "offen", paid_at: null }).eq("id", id); router.refresh();
  }

  async function doubleAmount(id: string, currentAmount: number) {
    await supabase.from("penalties").update({ amount: currentAmount * 2, doubled: true }).eq("id", id); router.refresh();
  }

  const playerName = (id: string) => players.find(p => p.id === id)?.name ?? "?";
  const typeName = (id: string) => penaltyTypes.find(t => t.id === id)?.name ?? "?";

  return (
    <div>
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {(["vergeben", "katalog"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "vergeben" ? "Strafen" : "Strafenkatalog"}
          </button>
        ))}
      </div>

      {tab === "katalog" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Strafenkatalog</h3>
            <button onClick={() => setShowTypeForm(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg">+ Strafentyp</button>
          </div>
          {penaltyTypes.length === 0 && <p className="text-sm text-gray-400">Noch keine Strafentypen angelegt.</p>}
          <div className="space-y-2">
            {penaltyTypes.map(t => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-600">{t.amount.toFixed(2)} €</span>
                  <button onClick={() => deleteType(t.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Löschen</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "vergeben" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Strafen</h3>
            <button onClick={() => setShowAssign(true)} className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg">+ Strafe vergeben</button>
          </div>
          {penalties.length === 0 && <p className="text-sm text-gray-400">Noch keine Strafen vergeben.</p>}
          <div className="space-y-2">
            {penalties.map(p => (
              <div key={p.id} className={`bg-white border rounded-lg px-4 py-3 ${p.status === "bezahlt" ? "border-green-200 opacity-70" : p.doubled ? "border-orange-300" : "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{playerName(p.player_id)}</span>
                      {p.doubled && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">x2</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.status === "bezahlt" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{p.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{typeName(p.type_id)}{p.reason ? ` – ${p.reason}` : ""}</p>
                    <p className="text-xs text-gray-400">Fällig: {new Date(p.due_date + "T00:00:00").toLocaleDateString("de-DE")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-red-600">{p.amount.toFixed(2)} €</span>
                    <div className="flex gap-1">
                      {p.status === "offen" && !p.doubled && (
                        <button onClick={() => doubleAmount(p.id, p.amount)} className="text-xs px-2 py-0.5 text-orange-600 hover:bg-orange-50 rounded">x2</button>
                      )}
                      {p.status === "offen"
                        ? <button onClick={() => markPaid(p.id)} className="text-xs px-2 py-0.5 text-green-600 hover:bg-green-50 rounded">Bezahlt</button>
                        : <button onClick={() => markOpen(p.id)} className="text-xs px-2 py-0.5 text-gray-500 hover:bg-gray-100 rounded">Rückbuchen</button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTypeForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">Neuer Strafentyp</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Zu spät zum Training" /></div>
              <div><label className="text-sm font-medium block mb-1">Betrag (€) *</label><input type="number" step="0.50" min="0" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={typeForm.amount} onChange={e => setTypeForm(f => ({ ...f, amount: e.target.value }))} placeholder="5.00" /></div>
              <div><label className="text-sm font-medium block mb-1">Beschreibung</label><textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={typeForm.description} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTypeForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={saveType} disabled={saving || !typeForm.name || !typeForm.amount} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? "..." : "Erstellen"}</button>
            </div>
          </div>
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">Strafe vergeben</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Spieler *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={assignForm.player_id} onChange={e => setAssignForm(f => ({ ...f, player_id: e.target.value }))}>
                  <option value="">Spieler wählen</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Strafentyp *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={assignForm.type_id} onChange={e => setAssignForm(f => ({ ...f, type_id: e.target.value }))}>
                  <option value="">Typ wählen</option>
                  {penaltyTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.amount.toFixed(2)} €)</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Fälligkeitsdatum *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={assignForm.due_date} onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Begründung</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={assignForm.reason} onChange={e => setAssignForm(f => ({ ...f, reason: e.target.value }))} /></div>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAssign(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={assignPenalty} disabled={saving || !assignForm.player_id || !assignForm.type_id || !assignForm.due_date} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? "..." : "Vergeben"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
