"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Player, PlayerInsert } from "@/lib/database.types";
import { SIZES, POSITIONS } from "@/lib/database.types";

const EMPTY: PlayerInsert = { name: "", position: "", jersey_number: undefined, size: undefined, phone: "", email: "", active: true };

export default function SpielerClient({ players }: { players: Player[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [form, setForm] = useState<PlayerInsert>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof PlayerInsert, v: string | number | boolean | null | undefined) =>
    setForm(f => ({ ...f, [k]: v }));

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true); setErr(null); }
  function openEdit(p: Player) {
    setEditing(p);
    setForm({ name: p.name, position: p.position ?? "", jersey_number: p.jersey_number ?? undefined, size: p.size ?? undefined, phone: p.phone ?? "", email: p.email ?? "", active: p.active });
    setShowForm(true); setErr(null);
  }

  async function save() {
    setSaving(true); setErr(null);
    const payload = { ...form, jersey_number: form.jersey_number || null, size: form.size || null, position: form.position || null, phone: form.phone || null, email: form.email || null };
    const { error } = editing
      ? await supabase.from("players").update(payload).eq("id", editing.id)
      : await supabase.from("players").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowForm(false); router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Spieler wirklich löschen?")) return;
    await supabase.from("players").delete().eq("id", id);
    router.refresh();
  }

  const active = players.filter(p => p.active);
  const inactive = players.filter(p => !p.active);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Spieler ({active.length} aktiv)</h2>
        <button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Spieler hinzufügen</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 my-4">
            <h3 className="font-semibold text-lg mb-4">{editing ? "Spieler bearbeiten" : "Neuer Spieler"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Vorname Nachname" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Position</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.position ?? ""} onChange={e => set("position", e.target.value)}>
                    <option value="">–</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Größe</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.size ?? ""} onChange={e => set("size", e.target.value || undefined)}>
                    <option value="">–</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Trikotnummer</label>
                <input type="number" min="1" max="99" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.jersey_number ?? ""} onChange={e => set("jersey_number", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Telefon</label>
                <input type="tel" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">E-Mail</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.email ?? ""} onChange={e => set("email", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active ?? true} onChange={e => set("active", e.target.checked)} />
                <span>Aktiv im Kader</span>
              </label>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={save} disabled={saving || !form.name} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                {saving ? "Speichern..." : editing ? "Aktualisieren" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {active.length === 0 && <p className="text-gray-400 text-sm mb-4">Noch keine Spieler. Füge den ersten hinzu!</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {active.map(p => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm shrink-0">
              {p.jersey_number ?? p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="text-xs text-gray-400">{[p.position, p.size].filter(Boolean).join(" · ") || "–"}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => openEdit(p)} className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">Bearbeiten</button>
              <button onClick={() => del(p.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Löschen</button>
            </div>
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Inaktiv ({inactive.length})</h3>
          <div className="grid gap-2 sm:grid-cols-2 opacity-60">
            {inactive.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm shrink-0">
                  {p.jersey_number ?? p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{p.name}</p></div>
                <button onClick={() => openEdit(p)} className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">Bearbeiten</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
