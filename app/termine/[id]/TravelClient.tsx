"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type CarEquipment = { id: string; item: string };
type TravelResponse = {
  id: string;
  event_id: string;
  player_name: string;
  travel_type: "car" | "direct" | "needs_ride";
  car_seats: number | null;
  car_equipment: CarEquipment[];
};
type ChecklistItem = {
  id: string;
  item: string;
  checked: boolean;
  checked_by: string | null;
  sort_order: number;
};

// ── Equipment item list ───────────────────────────────────────────────────────

const EQUIPMENT_ITEMS = [
  "⚽ Bälle / Ballsack",
  "👕 Trikots (Heim)",
  "👕 Trikots (Auswärts)",
  "🍶 Trinkflaschen",
  "🩹 Erste-Hilfe-Kasten",
  "🔶 Hütchen / Pylonen",
  "🦺 Leibchen",
  "🪪 Spielerausweise",
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  players: { id: string; name: string }[];
  initialTravel: TravelResponse[];
  initialChecklist: ChecklistItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TravelClient({
  eventId,
  players,
  initialTravel,
  initialChecklist,
}: Props) {
  const router = useRouter();
  const [travel, setTravel] = useState<TravelResponse[]>(initialTravel);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);

  // Add-form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"car" | "direct" | "needs_ride">("car");
  const [formSeats, setFormSeats] = useState("4");
  const [saving, setSaving] = useState(false);

  // Checklist checker name
  const [checkerName, setCheckerName] = useState("");

  // ── Travel actions ─────────────────────────────────────────────────────────

  async function addResponse() {
    if (!formName.trim()) return;
    setSaving(true);
    const payload = {
      event_id: eventId,
      player_name: formName.trim(),
      travel_type: formType,
      car_seats: formType === "car" ? parseInt(formSeats) || null : null,
    };
    const { data, error } = await supabase
      .from("travel_responses")
      .upsert(payload, { onConflict: "event_id,player_name" })
      .select("*, car_equipment(*)")
      .single();
    setSaving(false);
    if (error || !data) return;
    setTravel(prev => {
      const idx = prev.findIndex(r => r.player_name === data.player_name);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = data as TravelResponse;
        return updated;
      }
      return [...prev, data as TravelResponse];
    });
    setShowForm(false);
    setFormName("");
  }

  async function deleteResponse(id: string) {
    await supabase.from("travel_responses").delete().eq("id", id);
    setTravel(prev => prev.filter(r => r.id !== id));
  }

  async function toggleEquipment(responseId: string, item: string) {
    const response = travel.find(r => r.id === responseId);
    if (!response) return;
    const existing = response.car_equipment.find(e => e.item === item);
    if (existing) {
      await supabase.from("car_equipment").delete().eq("id", existing.id);
      setTravel(prev =>
        prev.map(r =>
          r.id === responseId
            ? { ...r, car_equipment: r.car_equipment.filter(e => e.id !== existing.id) }
            : r,
        ),
      );
    } else {
      const { data } = await supabase
        .from("car_equipment")
        .insert({ travel_response_id: responseId, item })
        .select()
        .single();
      if (data) {
        setTravel(prev =>
          prev.map(r =>
            r.id === responseId
              ? { ...r, car_equipment: [...r.car_equipment, data as CarEquipment] }
              : r,
          ),
        );
      }
    }
  }

  // ── Checklist actions ──────────────────────────────────────────────────────

  async function toggleChecklist(item: ChecklistItem) {
    const newChecked = !item.checked;
    const { data } = await supabase
      .from("event_checklist")
      .update({ checked: newChecked, checked_by: newChecked ? checkerName || null : null })
      .eq("id", item.id)
      .select()
      .single();
    if (data) {
      setChecklist(prev =>
        prev.map(c => (c.id === item.id ? (data as ChecklistItem) : c)),
      );
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const cars = travel.filter(r => r.travel_type === "car");
  const direct = travel.filter(r => r.travel_type === "direct");
  const needsRide = travel.filter(r => r.travel_type === "needs_ride");
  const checkedCount = checklist.filter(c => c.checked).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Anreise ──────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">🚗 Anreise</h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            {showForm ? "Abbrechen" : "+ Eintragen"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                list="player-list"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Dein Name…"
                className="flex-1 min-w-32 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <datalist id="player-list">
                {players.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
              <div className="flex gap-1">
                {(["car", "direct", "needs_ride"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      formType === t
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white border-gray-300 text-gray-600"
                    }`}
                  >
                    {t === "car" ? "🚗 Auto" : t === "direct" ? "📍 Direkt" : "🙋 Mitfahrt"}
                  </button>
                ))}
              </div>
            </div>
            {formType === "car" && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Freie Sitzplätze:</label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={formSeats}
                  onChange={e => setFormSeats(e.target.value)}
                  className="w-16 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}
            <button
              onClick={addResponse}
              disabled={saving || !formName.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
            >
              {saving ? "Speichern…" : "Bestätigen"}
            </button>
          </div>
        )}

        {/* Status columns */}
        <div className="divide-y divide-gray-50">
          {/* Cars */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              🚗 Fahrer ({cars.length})
            </p>
            {cars.length === 0 ? (
              <p className="text-xs text-gray-300 italic">Noch niemand</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cars.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1"
                  >
                    <span className="text-sm font-medium text-green-800">{r.player_name}</span>
                    {r.car_seats && (
                      <span className="text-xs text-green-600 bg-green-100 rounded-full px-1.5">
                        {r.car_seats} Plätze
                      </span>
                    )}
                    <button
                      onClick={() => deleteResponse(r.id)}
                      className="text-green-400 hover:text-red-400 ml-1 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              📍 Direkt vor Ort ({direct.length})
            </p>
            {direct.length === 0 ? (
              <p className="text-xs text-gray-300 italic">Noch niemand</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {direct.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1"
                  >
                    <span className="text-sm font-medium text-gray-700">{r.player_name}</span>
                    <button
                      onClick={() => deleteResponse(r.id)}
                      className="text-gray-300 hover:text-red-400 ml-1 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Needs ride */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              🙋 Braucht Mitfahrt ({needsRide.length})
            </p>
            {needsRide.length === 0 ? (
              <p className="text-xs text-gray-300 italic">Noch niemand</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {needsRide.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1"
                  >
                    <span className="text-sm font-medium text-orange-800">{r.player_name}</span>
                    <button
                      onClick={() => deleteResponse(r.id)}
                      className="text-orange-300 hover:text-red-400 ml-1 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Equipment in Autos ───────────────────────────────────────── */}
      {cars.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">📦 Equipment in Autos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Tippe auf ein Item um es einem Auto zuzuweisen</p>
          </div>
          <div className="divide-y divide-gray-50">
            {cars.map(car => (
              <div key={car.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  🚗 {car.player_name}
                  {car.car_seats && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {car.car_seats} Sitzplätze
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_ITEMS.map(item => {
                    const assigned = car.car_equipment.some(e => e.item === item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggleEquipment(car.id, item)}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                          assigned
                            ? "bg-green-100 border-green-300 text-green-800"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-green-300"
                        }`}
                      >
                        {assigned ? "✓ " : ""}{item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Checkliste ───────────────────────────────────────────────── */}
      {checklist.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">✅ Checkliste</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {checkedCount}/{checklist.length} erledigt
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={checkerName}
                onChange={e => setCheckerName(e.target.value)}
                list="player-list-check"
                placeholder="Dein Name (optional)"
                className="text-xs border rounded-lg px-2 py-1.5 w-36 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <datalist id="player-list-check">
                {players.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {checklist.map(item => (
              <button
                key={item.id}
                onClick={() => toggleChecklist(item)}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 ${
                  item.checked ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    item.checked
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {item.checked && <span className="text-xs">✓</span>}
                </div>
                <span
                  className={`text-sm flex-1 ${
                    item.checked ? "line-through text-gray-400" : "text-gray-700 font-medium"
                  }`}
                >
                  {item.item}
                </span>
                {item.checked && item.checked_by && (
                  <span className="text-xs text-gray-400 shrink-0">{item.checked_by}</span>
                )}
              </button>
            ))}
          </div>
          {checkedCount === checklist.length && checklist.length > 0 && (
            <div className="px-4 py-3 bg-green-50 text-center">
              <p className="text-sm font-bold text-green-700">🎉 Alles eingepackt!</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
