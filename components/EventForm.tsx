"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EventInsert, EventType } from "@/lib/database.types";

const EVENT_TYPES: EventType[] = ["Training", "Spiel", "Event"];

const TYPE_COLORS: Record<EventType, string> = {
  Training: "bg-blue-100 text-blue-800",
  Spiel: "bg-red-100 text-red-800",
  Event: "bg-purple-100 text-purple-800",
};

interface Props {
  initial?: Partial<EventInsert> & { id?: string };
  onSaved?: () => void;
}

export default function EventForm({ initial, onSaved }: Props) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<EventInsert>({
    type: initial?.type ?? "Training",
    title: initial?.title ?? "",
    date: initial?.date ?? "",
    start_time: initial?.start_time ?? "",
    location: initial?.location ?? "",
    description: initial?.description ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (field: keyof EventInsert, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: err } = isEdit
      ? await supabase.from("events").update(form).eq("id", initial!.id!)
      : await supabase.from("events").insert(form);

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      if (!isEdit) {
        setForm({ type: "Training", title: "", date: "", start_time: "", location: "", description: "" });
      }
      onSaved?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">Typ *</label>
        <div className="flex gap-2 flex-wrap">
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                form.type === t
                  ? `${TYPE_COLORS[t]} border-transparent ring-2 ring-offset-1 ring-current`
                  : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">
          Titel *
        </label>
        <input
          id="title"
          type="text"
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="z.B. Training Dienstag"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="date">
            Datum *
          </label>
          <input
            id="date"
            type="date"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="start_time">
            Uhrzeit *
          </label>
          <input
            id="start_time"
            type="time"
            required
            value={form.start_time}
            onChange={(e) => set("start_time", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="location">
          Ort *
        </label>
        <input
          id="location"
          type="text"
          required
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="z.B. Sportplatz Musterstadt"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="description">
          Beschreibung
        </label>
        <textarea
          id="description"
          rows={3}
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optionale Hinweise..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && (
        <p className="text-green-600 text-sm">
          {isEdit ? "Termin aktualisiert." : "Termin gespeichert."}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Speichern..." : isEdit ? "Aktualisieren" : "Termin speichern"}
      </button>
    </form>
  );
}
