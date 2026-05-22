"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { JerseySet, Jersey, JerseyStatus } from "@/lib/database.types";
import { SIZES } from "@/lib/database.types";

const STATUS_COLORS: Record<JerseyStatus, string> = {
  "verfügbar": "bg-green-100 text-green-700",
  "vergeben":  "bg-blue-100 text-blue-700",
  "beschädigt":"bg-red-100 text-red-700",
};

type ImageSlot = "jersey" | "shorts" | "socks";
const IMAGE_SLOTS: { key: ImageSlot; label: string; emoji: string }[] = [
  { key: "jersey", label: "Trikot",   emoji: "👕" },
  { key: "shorts", label: "Hose",     emoji: "🩳" },
  { key: "socks",  label: "Stutzen",  emoji: "🧦" },
];

type ImageFiles = Record<ImageSlot, File | null>;
const EMPTY_FILES: ImageFiles = { jersey: null, shorts: null, socks: null };

interface Props {
  sets: JerseySet[];
  jerseys: Jersey[];
  players: { id: string; name: string; size: string | null }[];
}

export default function TrikotsClient({ sets, jerseys, players }: Props) {
  const router = useRouter();

  // ── Set state ──────────────────────────────────────────────────────────────
  const [selectedSet, setSelectedSet] = useState<string | null>(sets[0]?.id ?? null);
  const [showSetForm, setShowSetForm] = useState(false);
  const [editingSet, setEditingSet] = useState<JerseySet | null>(null);
  const [setName, setSetName] = useState("");
  const [imageFiles, setImageFiles] = useState<ImageFiles>(EMPTY_FILES);
  const [previews, setPreviews] = useState<Record<ImageSlot, string | null>>({ jersey: null, shorts: null, socks: null });
  const fileRefs = {
    jersey: useRef<HTMLInputElement>(null),
    shorts: useRef<HTMLInputElement>(null),
    socks:  useRef<HTMLInputElement>(null),
  };

  // ── Jersey state ───────────────────────────────────────────────────────────
  const [filterSize, setFilterSize] = useState("");
  const [filterStatus, setFilterStatus] = useState<JerseyStatus | "">("");
  const [showJerseyForm, setShowJerseyForm] = useState(false);
  const [jerseyForm, setJerseyForm] = useState({ number: "", size: "M", status: "verfügbar" as JerseyStatus });
  const [editingJersey, setEditingJersey] = useState<Jersey | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function pickFile(slot: ImageSlot, file: File) {
    setImageFiles(prev => ({ ...prev, [slot]: file }));
    const url = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [slot]: url }));
  }

  async function uploadImages(setId: string, files: ImageFiles) {
    const updates: Partial<Record<`${ImageSlot}_image_url`, string>> = {};
    for (const { key } of IMAGE_SLOTS) {
      const file = files[key];
      if (!file) continue;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${setId}/${key}.${ext}`;
      const { error } = await supabase.storage
        .from("jersey-images")
        .upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("jersey-images").getPublicUrl(path);
        updates[`${key}_image_url`] = data.publicUrl;
      }
    }
    return updates;
  }

  function openCreateSet() {
    setEditingSet(null);
    setSetName("");
    setImageFiles(EMPTY_FILES);
    setPreviews({ jersey: null, shorts: null, socks: null });
    setErr(null);
    setShowSetForm(true);
  }

  function openEditSet(set: JerseySet) {
    setEditingSet(set);
    setSetName(set.name);
    setImageFiles(EMPTY_FILES);
    setPreviews({
      jersey: set.jersey_image_url ?? null,
      shorts: set.shorts_image_url ?? null,
      socks:  set.socks_image_url  ?? null,
    });
    setErr(null);
    setShowSetForm(true);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function saveSet() {
    if (!setName.trim()) return;
    setSaving(true); setErr(null);

    if (editingSet) {
      // Update existing set
      const imageUrls = await uploadImages(editingSet.id, imageFiles);
      const { error } = await supabase
        .from("jersey_sets")
        .update({ name: setName.trim(), ...imageUrls })
        .eq("id", editingSet.id);
      setSaving(false);
      if (error) { setErr(error.message); return; }
    } else {
      // Create new set, then upload images
      const { data: newSet, error } = await supabase
        .from("jersey_sets")
        .insert({ name: setName.trim() })
        .select()
        .single();
      if (error || !newSet) { setSaving(false); setErr(error?.message ?? "Fehler"); return; }

      const imageUrls = await uploadImages(newSet.id, imageFiles);
      if (Object.keys(imageUrls).length > 0) {
        await supabase.from("jersey_sets").update(imageUrls).eq("id", newSet.id);
      }
      setSaving(false);
      setSelectedSet(newSet.id);
    }

    setShowSetForm(false);
    router.refresh();
  }

  async function saveJersey() {
    if (!selectedSet) return;
    setSaving(true); setErr(null);
    const payload = {
      set_id: selectedSet,
      number: parseInt(jerseyForm.number),
      size: jerseyForm.size,
      status: jerseyForm.status,
    };
    const { error } = editingJersey
      ? await supabase.from("jerseys").update({ size: jerseyForm.size, status: jerseyForm.status }).eq("id", editingJersey.id)
      : await supabase.from("jerseys").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowJerseyForm(false);
    setEditingJersey(null);
    setJerseyForm({ number: "", size: "M", status: "verfügbar" });
    router.refresh();
  }

  async function deleteJersey(id: string) {
    await supabase.from("jerseys").delete().eq("id", id);
    router.refresh();
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const currentJerseys = jerseys
    .filter(j => j.set_id === selectedSet)
    .filter(j => !filterSize   || j.size   === filterSize)
    .filter(j => !filterStatus || j.status === filterStatus);

  const stats = {
    verfügbar: currentJerseys.filter(j => j.status === "verfügbar").length,
    vergeben:  currentJerseys.filter(j => j.status === "vergeben").length,
    beschädigt:currentJerseys.filter(j => j.status === "beschädigt").length,
  };

  const activeSet = sets.find(s => s.id === selectedSet) ?? null;
  const hasImages = activeSet && (activeSet.jersey_image_url || activeSet.shorts_image_url || activeSet.socks_image_url);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Trikotverwaltung</h2>
        <button
          onClick={openCreateSet}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          + Trikotsatz
        </button>
      </div>

      {sets.length === 0 && (
        <p className="text-sm text-gray-400">Noch kein Trikotsatz. Erstelle zuerst einen (z.B. "Heimtrikot").</p>
      )}

      {sets.length > 0 && (
        <>
          {/* Set tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {sets.map(s => (
              <div key={s.id} className="relative group shrink-0">
                <button
                  onClick={() => setSelectedSet(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selectedSet === s.id
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-white border-gray-300 text-gray-600"
                  }`}
                >
                  {s.name}
                </button>
                <button
                  onClick={() => openEditSet(s)}
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 bg-gray-600 text-white rounded-full text-xs items-center justify-center"
                  title="Satz bearbeiten"
                >
                  ✎
                </button>
              </div>
            ))}
          </div>

          {/* Set image preview */}
          {hasImages && (
            <div className="flex gap-4 mb-5 p-4 bg-gray-50 rounded-2xl">
              {IMAGE_SLOTS.map(({ key, label, emoji }) => {
                const url = activeSet![`${key}_image_url`];
                if (!url) return null;
                return (
                  <div key={key} className="text-center">
                    <img
                      src={url}
                      alt={label}
                      className="w-24 h-24 object-cover rounded-xl shadow-sm border border-gray-200"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">{emoji} {label}</p>
                  </div>
                );
              })}
            </div>
          )}

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
                <span className="text-xs text-gray-400 ml-auto">
                  {stats.verfügbar} verfügbar · {stats.vergeben} vergeben · {stats.beschädigt} beschädigt
                </span>
                <button
                  onClick={() => { setEditingJersey(null); setJerseyForm({ number: "", size: "M", status: "verfügbar" }); setShowJerseyForm(true); setErr(null); }}
                  className="bg-gray-800 hover:bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg"
                >
                  + Trikot
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {currentJerseys.map(j => (
                  <div key={j.id} className="bg-white border border-gray-200 rounded-lg p-3 text-center relative group">
                    <p className="text-2xl font-bold text-gray-800">#{j.number}</p>
                    <p className="text-xs text-gray-500">{j.size}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[j.status]}`}>{j.status}</span>
                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                      <button
                        onClick={() => { setEditingJersey(j); setJerseyForm({ number: String(j.number), size: j.size, status: j.status }); setShowJerseyForm(true); setErr(null); }}
                        className="text-xs p-1 bg-gray-100 hover:bg-gray-200 rounded"
                      >✎</button>
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

      {/* ── Set form modal ──────────────────────────────────────────────────── */}
      {showSetForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4">
              {editingSet ? "Trikotsatz bearbeiten" : "Neuer Trikotsatz"}
            </h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium block mb-1">Name *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={setName}
                  onChange={e => setSetName(e.target.value)}
                  placeholder="z.B. Heimtrikot"
                />
              </div>

              {/* Image uploads */}
              <div>
                <label className="text-sm font-medium block mb-2">Bilder (optional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_SLOTS.map(({ key, label, emoji }) => (
                    <div key={key}>
                      <button
                        type="button"
                        onClick={() => fileRefs[key].current?.click()}
                        className="w-full border-2 border-dashed border-gray-200 rounded-xl overflow-hidden hover:border-green-400 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {previews[key] ? (
                          <img
                            src={previews[key]!}
                            alt={label}
                            className="w-full h-20 object-cover"
                          />
                        ) : (
                          <div className="h-20 flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl">{emoji}</span>
                            <span className="text-xs text-gray-400">{label}</span>
                          </div>
                        )}
                      </button>
                      {previews[key] && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageFiles(prev => ({ ...prev, [key]: null }));
                            setPreviews(prev => ({ ...prev, [key]: editingSet ? editingSet[`${key}_image_url`] ?? null : null }));
                          }}
                          className="w-full text-xs text-gray-400 hover:text-red-500 mt-0.5 text-center"
                        >
                          ✕ entfernen
                        </button>
                      )}
                      <input
                        ref={fileRefs[key]}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) pickFile(key, f);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Antippen zum Hochladen · JPG, PNG, WebP</p>
              </div>
            </div>

            {err && <p className="text-red-600 text-sm mt-3">{err}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowSetForm(false); setEditingSet(null); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={saveSet}
                disabled={saving || !setName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
              >
                {saving ? "Speichern…" : editingSet ? "Aktualisieren" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Jersey form modal ───────────────────────────────────────────────── */}
      {showJerseyForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">{editingJersey ? "Trikot bearbeiten" : "Trikot hinzufügen"}</h3>
            <div className="space-y-3">
              {!editingJersey && (
                <div>
                  <label className="text-sm font-medium block mb-1">Nummer *</label>
                  <input type="number" min="1" max="99" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={jerseyForm.number} onChange={e => setJerseyForm(f => ({ ...f, number: e.target.value }))} />
                </div>
              )}
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
