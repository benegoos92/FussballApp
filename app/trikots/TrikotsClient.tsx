"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { JerseySet, Jersey, JerseyStatus } from "@/lib/database.types";
import { SIZES } from "@/lib/database.types";

const STATUS_COLORS: Record<JerseyStatus, string> = {
  "verfügbar": "bg-green-100 text-green-700",
  "vergeben": "bg-blue-100 text-blue-700",
  "beschädigt": "bg-red-100 text-red-700",
};

interface Props {
  sets: JerseySet[];
  jerseys: Jersey[];
  players: { id: string; name: string; size: string | null }[];
}

export default function TrikotsClient({ sets, jerseys, players }: Props) {
  const router = useRouter();
  const [selectedSet, setSelectedSet] = useState<string | null>(sets[0]?.id ?? null);
  const [filterSize, setFilterSize] = useState("");
  const [filterStatus, setFilterStatus] = useState<JerseyStatus | "">("");
  const [showSetForm, setShowSetForm] = useState(false);
  const [setName, setSetName] = useState("");
  const [showJerseyForm, setShowJerseyForm] = useState(false);
  const [jerseyForm, setJerseyForm] = useState({ number: "", size: "M", status: "verfügbar" as JerseyStatus });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingJersey, setEditingJersey] = useState<Jersey | null>(null);

  const currentJerseys = jerseys
    .filter(j => j.set_id === selectedSet)
    .filter(j => !filterSize || j.size === filterSize)
    .filter(j => !filterStatus || j.status === filterStatus);

  async function saveSet() {
    if (!setName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("jersey_sets").insert({ name: setName.trim() });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowSetForm(false); setSetName(""); router.refresh();
  }

  async function saveJersey() {
    if (!selectedSet) return;
    setSaving(true); setErr(null);
    const payload = { set_id: selectedSet, number: parseInt(jerseyForm.number), size: jerseyForm.size, status: jerseyForm.status };
    const { error } = editingJersey
      ? await supabase.from("jerseys").update({ size: jerseyForm.size, status: jerseyForm.status }).eq("id", editingJersey.id)
      : await supabase.from("jerseys").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowJerseyForm(false); setEditingJersey(null); setJerseyForm({ number: "", size: "M", status: "verfügbar" }); router.refresh();
  }

  async function deleteJersey(id: string) {
    await supabase.from("jerseys").delete().eq("id", id); router.refresh();
  }

  const stats = {
    verfügbar: currentJerseys.filter(j => j.status === "verfügbar").length,
    vergeben: currentJerseys.filter(j => j.status === "vergeben").length,
    beschädigt: currentJerseys.filter(j => j.status === "beschädigt").length,
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Trikotverwaltung</h2>
        <button onClick={() => setShowSetForm(true)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg">+ Trikotsatz</button>
      </div>

      {sets.length === 0 && <p className="text-sm text-gray-400">Noch kein Trikotsatz. Erstelle zuerst einen Satz (z.B. "Heimtrikot").</p>}

      {sets.length > 0 && (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {sets.map(s => (
              <button key={s.id} onClick={() => setSelectedSet(s.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-all ${selectedSet === s.id ? "bg-green-100 text-green-700 border-green-300" : "bg-white border-gray-300 text-gray-600"}`}>{s.name}</button>
            ))}
          </div>

          {selectedSet && (
            <>
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <select value={filterSize} onChange={e => setFilterSize(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Alle Größen</option>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as JerseyStatus | "")} className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Alle Status</option>
                  <option value="verfügbar">Verfügbar</option>
                  <option value="vergeben">Vergeben</option>
                  <option value="beschädigt">Beschädigt</option>
                </select>
                <span className="text-xs text-gray-400 ml-auto">{stats.verfügbar} verfügbar · {stats.vergeben} vergeben · {stats.beschädigt} beschädigt</span>
                <button onClick={() => { setEditingJersey(null); setJerseyForm({ number: "", size: "M", status: "verfügbar" }); setShowJerseyForm(true); setErr(null); }} className="bg-gray-800 hover:bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg">+ Trikot</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {currentJerseys.map(j => (
                  <div key={j.id} className="bg-white border border-gray-200 rounded-lg p-3 text-center relative group">
                    <p className="text-2xl font-bold text-gray-800">#{j.number}</p>
                    <p className="text-xs text-gray-500">{j.size}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[j.status]}`}>{j.status}</span>
                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                      <button onClick={() => { setEditingJersey(j); setJerseyForm({ number: String(j.number), size: j.size, status: j.status }); setShowJerseyForm(true); setErr(null); }} className="text-xs p-1 bg-gray-100 hover:bg-gray-200 rounded">✎</button>
                      <button onClick={() => deleteJersey(j.id)} className="text-xs p-1 bg-red-50 hover:bg-red-100 rounded text-red-600">×</button>
                    </div>
                  </div>
                ))}
              </div>
              {currentJerseys.length === 0 && <p className="text-sm text-gray-400 mt-2">Keine Trikots gefunden.</p>}
            </>
          )}
        </>
      )}

      {showSetForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">Neuer Trikotsatz</h3>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4" value={setName} onChange={e => setSetName(e.target.value)} placeholder="z.B. Heimtrikot" />
            {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowSetForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={saveSet} disabled={saving || !setName.trim()} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? "..." : "Erstellen"}</button>
            </div>
          </div>
        </div>
      )}

      {showJerseyForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">{editingJersey ? "Trikot bearbeiten" : "Trikot hinzufügen"}</h3>
            <div className="space-y-3">
              {!editingJersey && <div><label className="text-sm font-medium block mb-1">Nummer *</label><input type="number" min="1" max="99" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={jerseyForm.number} onChange={e => setJerseyForm(f => ({ ...f, number: e.target.value }))} /></div>}
              <div>
                <label className="text-sm font-medium block mb-1">Größe *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={jerseyForm.size} onChange={e => setJerseyForm(f => ({ ...f, size: e.target.value }))}>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={jerseyForm.status} onChange={e => setJerseyForm(f => ({ ...f, status: e.target.value as JerseyStatus }))}>
                  <option value="verfügbar">Verfügbar</option>
                  <option value="vergeben">Vergeben</option>
                  <option value="beschädigt">Beschädigt</option>
                </select>
              </div>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowJerseyForm(false); setEditingJersey(null); }} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={saveJersey} disabled={saving || (!editingJersey && !jerseyForm.number)} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">{saving ? "..." : editingJersey ? "Aktualisieren" : "Erstellen"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
