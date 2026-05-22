"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { JerseySet, Jersey, JerseyStatus } from "@/lib/database.types";
import { SIZES } from "@/lib/database.types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "jersey" | "shorts" | "socks";
type ImageSlot = Category;

const CATEGORIES: { key: Category; label: string; emoji: string; imgKey: `${ImageSlot}_image_url` }[] = [
  { key: "jersey",  label: "Trikots",  emoji: "👕", imgKey: "jersey_image_url"  },
  { key: "shorts",  label: "Hosen",    emoji: "🩳", imgKey: "shorts_image_url"  },
  { key: "socks",   label: "Stutzen",  emoji: "🧦", imgKey: "socks_image_url"   },
];

const STATUS_COLORS: Record<JerseyStatus, string> = {
  "verfügbar":  "bg-green-100 text-green-700",
  "vergeben":   "bg-blue-100 text-blue-700",
  "beschädigt": "bg-red-100 text-red-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sizeBreakdown(items: Jersey[]) {
  const map: Record<string, Record<JerseyStatus, number>> = {};
  for (const j of items) {
    map[j.size] ??= { verfügbar: 0, vergeben: 0, beschädigt: 0 };
    map[j.size][j.status]++;
  }
  return SIZES
    .filter(s => map[s])
    .map(s => ({ size: s, ...map[s], total: map[s].verfügbar + map[s].vergeben + map[s].beschädigt }));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sets: JerseySet[];
  jerseys: Jersey[];
  players: { id: string; name: string; size: string | null }[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrikotsClient({ sets, jerseys, players }: Props) {
  const router = useRouter();

  // view: 'gallery' shows set cards, 'detail' shows selected set
  const [view, setView] = useState<"gallery" | "detail">("gallery");
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("jersey");

  // Set form
  const [showSetForm, setShowSetForm] = useState(false);
  const [editingSet, setEditingSet] = useState<JerseySet | null>(null);
  const [setName, setSetName] = useState("");
  const [imageFiles, setImageFiles] = useState<Record<ImageSlot, File | null>>({ jersey: null, shorts: null, socks: null });
  const [previews, setPreviews] = useState<Record<ImageSlot, string | null>>({ jersey: null, shorts: null, socks: null });
  const fileRefs = { jersey: useRef<HTMLInputElement>(null), shorts: useRef<HTMLInputElement>(null), socks: useRef<HTMLInputElement>(null) };

  // Jersey form
  const [showJerseyForm, setShowJerseyForm] = useState(false);
  const [editingJersey, setEditingJersey] = useState<Jersey | null>(null);
  const [jerseyForm, setJerseyForm] = useState({ number: "", size: "M", status: "verfügbar" as JerseyStatus, category: "jersey" as Category });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ── Image helpers ──────────────────────────────────────────────────────────

  function pickFile(slot: ImageSlot, file: File) {
    setImageFiles(p => ({ ...p, [slot]: file }));
    setPreviews(p => ({ ...p, [slot]: URL.createObjectURL(file) }));
  }

  async function uploadImages(setId: string) {
    const updates: { jersey_image_url?: string; shorts_image_url?: string; socks_image_url?: string } = {};
    for (const { key, imgKey } of CATEGORIES) {
      const file = imageFiles[key];
      if (!file) continue;
      const ext = file.name.split(".").pop() ?? "jpg";
      const { error } = await supabase.storage.from("jersey-images").upload(`${setId}/${key}.${ext}`, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("jersey-images").getPublicUrl(`${setId}/${key}.${ext}`);
        updates[imgKey] = `${data.publicUrl}?t=${Date.now()}`;
      }
    }
    return updates;
  }

  // ── Set actions ────────────────────────────────────────────────────────────

  function openCreateSet() {
    setEditingSet(null); setSetName("");
    setImageFiles({ jersey: null, shorts: null, socks: null });
    setPreviews({ jersey: null, shorts: null, socks: null });
    setErr(null); setShowSetForm(true);
  }

  function openEditSet(set: JerseySet) {
    setEditingSet(set); setSetName(set.name);
    setImageFiles({ jersey: null, shorts: null, socks: null });
    setPreviews({ jersey: set.jersey_image_url ?? null, shorts: set.shorts_image_url ?? null, socks: set.socks_image_url ?? null });
    setErr(null); setShowSetForm(true);
  }

  async function saveSet() {
    if (!setName.trim()) return;
    setSaving(true); setErr(null);
    if (editingSet) {
      const urls = await uploadImages(editingSet.id);
      const { error } = await supabase.from("jersey_sets").update({ name: setName.trim(), ...urls }).eq("id", editingSet.id);
      setSaving(false);
      if (error) { setErr(error.message); return; }
    } else {
      const { data: newSet, error } = await supabase.from("jersey_sets").insert({ name: setName.trim() }).select().single();
      if (error || !newSet) { setSaving(false); setErr(error?.message ?? "Fehler"); return; }
      const urls = await uploadImages(newSet.id);
      if (Object.keys(urls).length) await supabase.from("jersey_sets").update(urls).eq("id", newSet.id);
      setSaving(false);
    }
    setShowSetForm(false);
    router.refresh();
  }

  // ── Jersey actions ─────────────────────────────────────────────────────────

  function openAddJersey(category: Category) {
    setEditingJersey(null);
    setJerseyForm({ number: "", size: "M", status: "verfügbar", category });
    setErr(null); setShowJerseyForm(true);
  }

  function openEditJersey(j: Jersey) {
    setEditingJersey(j);
    setJerseyForm({ number: j.number != null ? String(j.number) : "", size: j.size, status: j.status, category: j.category });
    setErr(null); setShowJerseyForm(true);
  }

  async function saveJersey() {
    if (!selectedSetId) return;
    setSaving(true); setErr(null);
    const needsNumber = jerseyForm.category === "jersey";
    const payload = {
      set_id: selectedSetId,
      number: needsNumber ? (parseInt(jerseyForm.number) || null) : null,
      size: jerseyForm.size,
      status: jerseyForm.status,
      category: jerseyForm.category,
    };
    const { error } = editingJersey
      ? await supabase.from("jerseys").update({ size: jerseyForm.size, status: jerseyForm.status, category: jerseyForm.category, number: payload.number }).eq("id", editingJersey.id)
      : await supabase.from("jerseys").insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowJerseyForm(false); setEditingJersey(null);
    router.refresh();
  }

  async function deleteJersey(id: string) {
    await supabase.from("jerseys").delete().eq("id", id);
    router.refresh();
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeSet = sets.find(s => s.id === selectedSetId) ?? null;
  const setJerseys = jerseys.filter(j => j.set_id === selectedSetId);

  function itemsOf(cat: Category) { return setJerseys.filter(j => j.category === cat); }
  function availableOf(cat: Category) { return itemsOf(cat).filter(j => j.status === "verfügbar").length; }

  // ── Render: Gallery ────────────────────────────────────────────────────────

  if (view === "gallery") {
    return (
      <div>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold">Trikotverwaltung</h2>
          <button onClick={openCreateSet} className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg">
            + Trikotsatz
          </button>
        </div>

        {sets.length === 0 && (
          <p className="text-sm text-gray-400">Noch kein Trikotsatz. Erstelle zuerst einen (z.B. "Heimtrikot").</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {sets.map(set => {
            const total = jerseys.filter(j => j.set_id === set.id && j.category === "jersey").length;
            return (
              <div key={set.id} className="relative group">
                <button
                  onClick={() => { setSelectedSetId(set.id); setActiveCategory("jersey"); setView("detail"); }}
                  className="w-full text-left bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {set.jersey_image_url ? (
                    <div className="bg-gray-50 p-3">
                      <img src={set.jersey_image_url} alt={set.name} className="w-full h-40 object-contain drop-shadow-sm" />
                    </div>
                  ) : (
                    <div className="w-full h-44 bg-gray-50 flex items-center justify-center">
                      <span className="text-6xl opacity-30">👕</span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-bold text-gray-800">{set.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{total} Trikot{total !== 1 ? "s" : ""} erfasst</p>
                  </div>
                </button>
                <button
                  onClick={() => openEditSet(set)}
                  className="absolute top-2 right-2 hidden group-hover:flex w-7 h-7 bg-white/90 shadow text-gray-600 rounded-full text-xs items-center justify-center hover:bg-white"
                >
                  ✎
                </button>
              </div>
            );
          })}
        </div>

        {/* Set form modal */}
        {showSetForm && <SetFormModal
          editingSet={editingSet} setName={setName} setSetName={setSetName}
          previews={previews} fileRefs={fileRefs} pickFile={pickFile}
          setPreviews={setPreviews} setImageFiles={setImageFiles}
          saving={saving} err={err}
          onClose={() => setShowSetForm(false)} onSave={saveSet}
        />}
      </div>
    );
  }

  // ── Render: Detail ─────────────────────────────────────────────────────────

  const catItems = itemsOf(activeCategory);
  const breakdown = sizeBreakdown(catItems);
  const jerseyItems = itemsOf("jersey").filter(j => j.number != null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setView("gallery")} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
          ← Zurück
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1">{activeSet?.name}</h2>
        <button onClick={() => activeSet && openEditSet(activeSet)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg">
          ✎ Bearbeiten
        </button>
      </div>

      {/* Category stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {CATEGORIES.map(({ key, label, emoji, imgKey }) => {
          const avail = availableOf(key);
          const total = itemsOf(key).length;
          const img = activeSet?.[imgKey];
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`rounded-2xl overflow-hidden border-2 text-left transition-all ${
                activeCategory === key ? "border-green-400 shadow-md" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {img ? (
                <div className="bg-gray-50 px-2 pt-2">
                  <img src={img} alt={label} className="w-full h-20 object-contain drop-shadow-sm" />
                </div>
              ) : (
                <div className="w-full h-24 bg-gray-50 flex items-center justify-center">
                  <span className="text-4xl opacity-40">{emoji}</span>
                </div>
              )}
              <div className="p-2 bg-white">
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <p className="text-xl font-black text-green-700 leading-tight">{avail}</p>
                <p className="text-xs text-gray-400">verfügbar / {total}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add button for active category */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => openAddJersey(activeCategory)}
          className="bg-gray-800 hover:bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          + {CATEGORIES.find(c => c.key === activeCategory)?.label.slice(0, -1) ?? ""}
        </button>
      </div>

      {/* Size breakdown table */}
      {breakdown.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {CATEGORIES.find(c => c.key === activeCategory)?.emoji} Größenübersicht
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="px-4 py-2 text-left">Größe</th>
                <th className="px-4 py-2 text-right text-green-600">Verfügbar</th>
                <th className="px-4 py-2 text-right text-blue-600">Vergeben</th>
                <th className="px-4 py-2 text-right text-red-500">Beschädigt</th>
                <th className="px-4 py-2 text-right text-gray-400">Gesamt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {breakdown.map(row => (
                <tr key={row.size} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-gray-700">{row.size}</td>
                  <td className="px-4 py-2 text-right font-bold text-green-700">{row.verfügbar}</td>
                  <td className="px-4 py-2 text-right text-blue-600">{row.vergeben}</td>
                  <td className="px-4 py-2 text-right text-red-500">{row.beschädigt}</td>
                  <td className="px-4 py-2 text-right text-gray-400">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {breakdown.length === 0 && (
        <div className="text-sm text-gray-400 text-center py-6 bg-white border border-dashed border-gray-200 rounded-2xl mb-4">
          Noch keine {CATEGORIES.find(c => c.key === activeCategory)?.label} erfasst
        </div>
      )}

      {/* Jersey number grid (only for jerseys with numbers) */}
      {activeCategory === "jersey" && jerseyItems.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {jerseyItems.sort((a, b) => (a.number ?? 0) - (b.number ?? 0)).map(j => (
            <div key={j.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden relative group">
              {activeSet?.jersey_image_url ? (
                <div className="relative">
                  <img src={activeSet.jersey_image_url} alt={`#${j.number}`} className="w-full h-20 object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    #{j.number}
                  </span>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center bg-gray-50">
                  <span className="text-xl font-bold text-gray-800">#{j.number}</span>
                </div>
              )}
              <div className="px-2 py-1 flex items-center justify-between gap-1">
                <span className="text-xs text-gray-500">{j.size}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[j.status]}`}>{j.status}</span>
              </div>
              <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                <button onClick={() => openEditJersey(j)} className="text-xs p-1 bg-white/80 hover:bg-white rounded shadow">✎</button>
                <button onClick={() => deleteJersey(j.id)} className="text-xs p-1 bg-white/80 hover:bg-red-100 rounded shadow text-red-600">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Non-jersey items list (shorts/socks have no number) */}
      {activeCategory !== "jersey" && catItems.length > 0 && (
        <div className="space-y-1.5">
          {catItems.map(j => (
            <div key={j.id} className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-3 group">
              <span className="text-sm font-semibold text-gray-700 w-8">{j.size}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[j.status]}`}>{j.status}</span>
              <div className="ml-auto hidden group-hover:flex gap-1">
                <button onClick={() => openEditJersey(j)} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">✎</button>
                <button onClick={() => deleteJersey(j.id)} className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-red-600">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set form modal */}
      {showSetForm && <SetFormModal
        editingSet={editingSet} setName={setName} setSetName={setSetName}
        previews={previews} fileRefs={fileRefs} pickFile={pickFile}
        setPreviews={setPreviews} setImageFiles={setImageFiles}
        saving={saving} err={err}
        onClose={() => setShowSetForm(false)} onSave={saveSet}
      />}

      {/* Jersey form modal */}
      {showJerseyForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold mb-4">
              {editingJersey ? "Bearbeiten" : `${CATEGORIES.find(c => c.key === jerseyForm.category)?.label.slice(0,-1)} hinzufügen`}
            </h3>
            <div className="space-y-3">
              {/* Category selector */}
              {!editingJersey && (
                <div>
                  <label className="text-sm font-medium block mb-1">Typ</label>
                  <div className="flex gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.key} type="button" onClick={() => setJerseyForm(f => ({ ...f, category: c.key, number: "" }))}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${jerseyForm.category === c.key ? "bg-green-600 text-white border-green-600" : "bg-white border-gray-300 text-gray-600"}`}>
                        {c.emoji} {c.label.slice(0, -1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Number (only for jerseys) */}
              {jerseyForm.category === "jersey" && (
                <div>
                  <label className="text-sm font-medium block mb-1">Nummer *</label>
                  <input type="number" min="1" max="99" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={jerseyForm.number} onChange={e => setJerseyForm(f => ({ ...f, number: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Größe</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={jerseyForm.size} onChange={e => setJerseyForm(f => ({ ...f, size: e.target.value }))}>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={jerseyForm.status} onChange={e => setJerseyForm(f => ({ ...f, status: e.target.value as JerseyStatus }))}>
                  <option value="verfügbar">Verfügbar</option>
                  <option value="vergeben">Vergeben</option>
                  <option value="beschädigt">Beschädigt</option>
                </select>
              </div>
            </div>
            {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowJerseyForm(false); setEditingJersey(null); }} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
              <button onClick={saveJersey} disabled={saving || (jerseyForm.category === "jersey" && !editingJersey && !jerseyForm.number)}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                {saving ? "..." : editingJersey ? "Aktualisieren" : "Hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Set form modal (extracted to keep main component readable) ────────────────

function SetFormModal({ editingSet, setName, setSetName, previews, fileRefs, pickFile, setPreviews, setImageFiles, saving, err, onClose, onSave }: {
  editingSet: JerseySet | null;
  setName: string; setSetName: (v: string) => void;
  previews: Record<ImageSlot, string | null>;
  fileRefs: Record<ImageSlot, React.RefObject<HTMLInputElement | null>>;
  pickFile: (slot: ImageSlot, f: File) => void;
  setPreviews: React.Dispatch<React.SetStateAction<Record<ImageSlot, string | null>>>;
  setImageFiles: React.Dispatch<React.SetStateAction<Record<ImageSlot, File | null>>>;
  saving: boolean; err: string | null;
  onClose: () => void; onSave: () => void;
}) {
  const slots = CATEGORIES;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-lg mb-4">{editingSet ? "Trikotsatz bearbeiten" : "Neuer Trikotsatz"}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={setName} onChange={e => setSetName(e.target.value)} placeholder="z.B. Heimtrikot" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Bilder (optional)</label>
            <div className="grid grid-cols-3 gap-2">
              {slots.map(({ key, label, emoji }) => (
                <div key={key}>
                  <button type="button" onClick={() => fileRefs[key].current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl overflow-hidden hover:border-green-400 transition-colors">
                    {previews[key] ? (
                      <img src={previews[key]!} alt={label} className="w-full h-20 object-cover" />
                    ) : (
                      <div className="h-20 flex flex-col items-center justify-center gap-1">
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-xs text-gray-400">{label}</span>
                      </div>
                    )}
                  </button>
                  {previews[key] && (
                    <button type="button" onClick={() => { setImageFiles(p => ({ ...p, [key]: null })); setPreviews(p => ({ ...p, [key]: editingSet?.[`${key}_image_url` as keyof JerseySet] as string ?? null })); }}
                      className="w-full text-xs text-gray-400 hover:text-red-500 mt-0.5 text-center">✕</button>
                  )}
                  <input ref={fileRefs[key]} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(key, f); }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Abbrechen</button>
          <button onClick={onSave} disabled={saving || !setName.trim()} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
            {saving ? "Speichern…" : editingSet ? "Aktualisieren" : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
