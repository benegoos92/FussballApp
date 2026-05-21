"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Event, EventInsert, EventType, Player, Attendance, AttendanceStatus } from "@/lib/database.types";

const TYPE_COLORS: Record<EventType, string> = {
  Training: "bg-blue-100 text-blue-800 border-blue-200",
  Spiel: "bg-red-100 text-red-800 border-red-200",
  Event: "bg-purple-100 text-purple-800 border-purple-200",
};
const TYPE_BORDER: Record<EventType, string> = {
  Training: "border-l-blue-500",
  Spiel: "border-l-red-500",
  Event: "border-l-purple-500",
};

const EMPTY: EventInsert = { type: "Training", title: "", date: "", start_time: "", location: "", description: "" };

interface Props {
  events: Event[];
  players: { id: string; name: string }[];
  attendances: Attendance[];
}

export default function TermineClient({ events, players, attendances }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventInsert>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rsvpPlayer, setRsvpPlayer] = useState<string>("");
  const [rsvpStatus, setRsvpStatus] = useState<AttendanceStatus>("zusage");
  const [rsvpReason, setRsvpReason] = useState("");

  const set = (k: keyof EventInsert, v: string) => setForm(f => ({ ...f, [k]: v }));

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true); setErr(null); }
  function openEdit(e: Event) { setEditing(e); setForm({ type: e.type, title: e.title, date: e.date, start_time: e.start_time, location: e.location, description: e.description ?? "" }); setShowForm(true); setErr(null); }

  async function save() {
    setSaving(true); setErr(null);
    const { error } = editing
      ? await supabase.from("events").update(form).eq("id", editing.id)
      : await supabase.from("events").insert(form);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowForm(false);
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("Termin wirklich löschen?")) return;
    await supabase.from("events").delete().eq("id", id);
    router.refresh();
  }

  async function submitRsvp(eventId: string) {
    if (!rsvpPlayer) return;
    await supabase.from("event_attendances").upsert({ event_id: eventId, player_id: rsvpPlayer, status: rsvpStatus, reason: rsvpReason || null }, { onConflict: "event_id,player_id" });
    setRsvpPlayer(""); setRsvpReason(""); setExpandedId(null);
    router.refresh();
  }

  const byDate = events.reduce<Record<string, Event[]>>((acc, e) => { (acc[e.date] ??= []).push(e); return acc; }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Termine</h2>
        <button onClick={openCreate} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg">+ Neuer Termin</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-4">{editing ? "Termin bearbeiten" : "Neuer Termin"}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Typ *</label>
                <div className="flex gap-2">
                  {(["Training","Spiel","Event"] as EventType[]).map(t => (
                    <button key={t} type="button" onClick={() => set("type", t)}
                      className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all ${form.type === t ? TYPE_COLORS[t] + " ring-2 ring-offset-1 ring-current" : "bg-white border-gray-300 text-gray-600"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Titel *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.title} onChange={e => set("title", e.target.value)} placeholder="z.B. Training Dienstag" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Datum *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.date} onChange={e => set("date", e.target.value)} /></div>
                <div><label className="text-sm font-medium block mb-1">Uhrzeit *</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.start_time} onChange={e => set("start_time", e.target.value)} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Ort *</label><input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.location} onChange={e => set("location", e.target.value)} placeholder="z.B. Sportplatz Musterstadt" /></div>
              <div><label className="text-sm font-medium block mb-1">Beschreibung</label><textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={form.description ?? ""} onChange={e => set("description", e.target.value)} /></div>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={save} disabled={saving || !form.title || !form.date || !form.start_time || !form.location} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                {saving ? "Speichern..." : editing ? "Aktualisieren" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dates.length === 0 && <p className="text-gray-400 text-sm">Noch keine Termine. Erstelle den ersten!</p>}

      {dates.map(date => (
        <div key={date} className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {new Date(date + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h3>
          <div className="space-y-2">
            {byDate[date].map(event => {
              const evAtt = attendances.filter(a => a.event_id === event.id);
              const zusagen = evAtt.filter(a => a.status === "zusage").length;
              const absagen = evAtt.filter(a => a.status === "absage").length;
              const isExpanded = expandedId === event.id;

              return (
                <div key={event.id} className={`bg-white border border-l-4 ${TYPE_BORDER[event.type]} rounded-lg overflow-hidden`}>
                  <div className="px-4 py-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[event.type]}`}>{event.type}</span>
                        <span className="text-xs text-gray-400">{event.start_time.slice(0,5)} Uhr</span>
                      </div>
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">📍 {event.location}</p>
                      {evAtt.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">✅ {zusagen} Zusagen · ❌ {absagen} Absagen</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : event.id)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                        {isExpanded ? "Schließen" : "Rückmeldung"}
                      </button>
                      <button onClick={() => openEdit(event)} className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">Bearbeiten</button>
                      <button onClick={() => del(event.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Löschen</button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Rückmeldung eintragen</p>
                      <div className="flex flex-wrap gap-2 items-end">
                        <select value={rsvpPlayer} onChange={e => setRsvpPlayer(e.target.value)} className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="">Spieler wählen</option>
                          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="flex gap-1">
                          {(["zusage","absage"] as AttendanceStatus[]).map(s => (
                            <button key={s} onClick={() => setRsvpStatus(s)}
                              className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${rsvpStatus === s ? (s === "zusage" ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300") : "bg-white border-gray-300 text-gray-600"}`}>
                              {s === "zusage" ? "✅ Zusage" : "❌ Absage"}
                            </button>
                          ))}
                        </div>
                        <input placeholder="Begründung (optional)" value={rsvpReason} onChange={e => setRsvpReason(e.target.value)} className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-32" />
                        <button onClick={() => submitRsvp(event.id)} disabled={!rsvpPlayer} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-medium">Speichern</button>
                      </div>
                      {evAtt.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {evAtt.map(a => {
                            const p = players.find(pl => pl.id === a.player_id);
                            return (
                              <p key={a.id} className="text-xs text-gray-500">
                                {a.status === "zusage" ? "✅" : "❌"} {p?.name ?? "Unbekannt"} {a.reason ? `– ${a.reason}` : ""}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
