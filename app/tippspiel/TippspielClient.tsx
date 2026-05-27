"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Teilnehmer { id: string; name: string; player_id: string | null; created_at: string }
interface Spiel {
  id: string; spieltag_id: string; openligadb_id: number | null;
  heim_team: string; gast_team: string; kickoff: string | null;
  heim_tore_result: number | null; gast_tore_result: number | null; created_at: string;
}
interface Spieltag { id: string; spieltag: number; saison: string; deadline: string | null; created_at: string; tipp_spiele: Spiel[] }
interface Tipp { id: string; spiel_id: string; teilnehmer_id: string; heim_tore: number; gast_tore: number; punkte: number | null }

type Tab = "tipps" | "ergebnisse" | "tabelle";

function tendenz(heim: number, gast: number) {
  if (heim > gast) return "H";
  if (heim < gast) return "A";
  return "U";
}

function punkeFarbe(p: number | null) {
  if (p === null) return "text-gray-400";
  if (p === 3) return "text-green-600 font-bold";
  if (p === 1) return "text-yellow-500 font-semibold";
  return "text-red-500";
}

function formatKickoff(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function isLocked(kickoff: string | null) {
  if (!kickoff) return false;
  return new Date(kickoff) <= new Date();
}

interface Props {
  teilnehmer: Teilnehmer[];
  spieltage: Spieltag[];
  spieler: { id: string; name: string }[];
}

export default function TippspielClient({ teilnehmer: initialTeilnehmer, spieltage: initialSpieltage, spieler }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tipps");
  const [teilnehmer, setTeilnehmer] = useState(initialTeilnehmer);
  const [spieltage, setSpieltage] = useState(initialSpieltage);

  const [meinId, setMeinId] = useState<string | null>(null);
  const [showWerBistDu, setShowWerBistDu] = useState(false);
  const [neuerName, setNeuerName] = useState("");
  const [neuerPlayerId, setNeuerPlayerId] = useState("");
  const [savingTeilnehmer, setSavingTeilnehmer] = useState(false);

  const [aktiverSpieltag, setAktiverSpieltag] = useState<Spieltag | null>(
    initialSpieltage.length > 0 ? initialSpieltage[initialSpieltage.length - 1] : null
  );
  const [loadingSpiele, setLoadingSpiele] = useState(false);
  const [spieltageNr, setSpieltageNr] = useState(1);

  const [tipps, setTipps] = useState<Tipp[]>([]);
  const [tippInputs, setTippInputs] = useState<Record<string, { heim: string; gast: string }>>({});
  const [savingTipps, setSavingTipps] = useState(false);

  const [ergebnisInputs, setErgebnisInputs] = useState<Record<string, { heim: string; gast: string }>>({});
  const [savingErgebnis, setSavingErgebnis] = useState<string | null>(null);

  const [alleTipps, setAlleTipps] = useState<Tipp[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("tipp_ich");
    if (stored && initialTeilnehmer.some(t => t.id === stored)) {
      setMeinId(stored);
    } else {
      setShowWerBistDu(true);
    }
  }, [initialTeilnehmer]);

  const ladeTipps = useCallback(async (spieltagId: string) => {
    const { data } = await supabase
      .from("tipps")
      .select("*")
      .in("spiel_id", spieltage.find(s => s.id === spieltagId)?.tipp_spiele.map(s => s.id) ?? []);
    setTipps(data ?? []);
    // pre-fill my inputs
    if (meinId && data) {
      const inputs: Record<string, { heim: string; gast: string }> = {};
      for (const t of data.filter(t => t.teilnehmer_id === meinId)) {
        inputs[t.spiel_id] = { heim: String(t.heim_tore), gast: String(t.gast_tore) };
      }
      setTippInputs(inputs);
    }
  }, [spieltage, meinId]);

  const ladeAlleTipps = useCallback(async () => {
    const { data } = await supabase.from("tipps").select("*");
    setAlleTipps(data ?? []);
  }, []);

  useEffect(() => {
    if (aktiverSpieltag) ladeTipps(aktiverSpieltag.id);
  }, [aktiverSpieltag, ladeTipps]);

  useEffect(() => {
    if (tab === "tabelle") ladeAlleTipps();
  }, [tab, ladeAlleTipps]);

  async function waehleTeilnehmer(id: string) {
    setMeinId(id);
    localStorage.setItem("tipp_ich", id);
    setShowWerBistDu(false);
  }

  async function erstelleTeilnehmer() {
    if (!neuerName.trim()) return;
    setSavingTeilnehmer(true);
    const { data, error } = await supabase.from("tipp_teilnehmer").insert({
      name: neuerName.trim(),
      player_id: neuerPlayerId || null,
    }).select().single();
    setSavingTeilnehmer(false);
    if (error || !data) return;
    setTeilnehmer(prev => [...prev, data]);
    setNeuerName(""); setNeuerPlayerId("");
    waehleTeilnehmer(data.id);
  }

  async function ladeSpieltagVonApi() {
    setLoadingSpiele(true);
    await fetch(`/api/bundesliga?spieltag=${spieltageNr}&saison=2025`);
    setLoadingSpiele(false);
    router.refresh();
  }

  async function speichereTipps() {
    if (!meinId || !aktiverSpieltag) return;
    setSavingTipps(true);
    const rows = Object.entries(tippInputs)
      .filter(([, v]) => v.heim !== "" && v.gast !== "")
      .map(([spiel_id, v]) => ({
        spiel_id,
        teilnehmer_id: meinId,
        heim_tore: parseInt(v.heim),
        gast_tore: parseInt(v.gast),
        updated_at: new Date().toISOString(),
      }));
    await supabase.from("tipps").upsert(rows, { onConflict: "spiel_id,teilnehmer_id" });
    setSavingTipps(false);
    await ladeTipps(aktiverSpieltag.id);
  }

  async function speichereErgebnis(spielId: string) {
    const inp = ergebnisInputs[spielId];
    if (!inp || inp.heim === "" || inp.gast === "") return;
    setSavingErgebnis(spielId);
    await fetch("/api/bundesliga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spiel_id: spielId,
        spieltag_id: aktiverSpieltag?.id,
        heim_tore_result: parseInt(inp.heim),
        gast_tore_result: parseInt(inp.gast),
      }),
    });
    setSavingErgebnis(null);
    router.refresh();
  }

  const mein = teilnehmer.find(t => t.id === meinId);
  const spiele = aktiverSpieltag?.tipp_spiele ?? [];

  // Tabelle: sum points per participant
  const tabelle = teilnehmer.map(t => {
    const meineTipps = alleTipps.filter(tp => tp.teilnehmer_id === t.id && tp.punkte !== null);
    return {
      ...t,
      punkte: meineTipps.reduce((s, tp) => s + (tp.punkte ?? 0), 0),
      exakt: meineTipps.filter(tp => tp.punkte === 3).length,
      tendenz: meineTipps.filter(tp => tp.punkte === 1).length,
      gespielt: meineTipps.length,
    };
  }).sort((a, b) => b.punkte - a.punkte);

  return (
    <div>
      {/* Wer bist du Modal */}
      {showWerBistDu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-1">Wer bist du?</h2>
            <p className="text-sm text-gray-500 mb-4">Wähle deinen Namen oder lege einen neuen an.</p>
            {teilnehmer.length > 0 && (
              <div className="space-y-2 mb-4">
                {teilnehmer.map(t => (
                  <button key={t.id} onClick={() => waehleTeilnehmer(t.id)}
                    className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 font-medium text-gray-800 transition-colors">
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Neu anlegen</p>
              <input value={neuerName} onChange={e => setNeuerName(e.target.value)}
                placeholder="Dein Name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
              <select value={neuerPlayerId} onChange={e => setNeuerPlayerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Kein Spieler verknüpft</option>
                {spieler.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={erstelleTeilnehmer} disabled={savingTeilnehmer || !neuerName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {savingTeilnehmer ? "Speichern..." : "Erstellen & loslegen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {mein && (
            <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-1 rounded-full">
              <span className="font-semibold">{mein.name}</span>
              <button onClick={() => setShowWerBistDu(true)} className="text-green-500 hover:text-green-700 text-xs ml-1">wechseln</button>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-5 border-b border-gray-200">
        {(["tipps", "ergebnisse", "tabelle"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "tipps" ? "Meine Tipps" : t === "ergebnisse" ? "Ergebnisse" : "Tabelle"}
          </button>
        ))}
      </div>

      {/* Spieltag Auswahl (Tipps + Ergebnisse) */}
      {(tab === "tipps" || tab === "ergebnisse") && (
        <div className="mb-5">
          <div className="flex flex-wrap gap-2 items-center">
            {spieltage.map(st => (
              <button key={st.id} onClick={() => setAktiverSpieltag(st)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${aktiverSpieltag?.id === st.id ? "bg-green-600 text-white border-green-600" : "border-gray-300 text-gray-600 hover:border-green-400"}`}>
                {st.spieltag}. Spieltag
              </button>
            ))}
            {/* Load new matchday */}
            <div className="flex items-center gap-1">
              <input type="number" min={1} max={34} value={spieltageNr} onChange={e => setSpieltageNr(parseInt(e.target.value))}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button onClick={ladeSpieltagVonApi} disabled={loadingSpiele}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                {loadingSpiele ? "Laden..." : "Spieltag laden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEINE TIPPS */}
      {tab === "tipps" && aktiverSpieltag && (
        <div>
          {spiele.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Spiele geladen. Lade einen Spieltag oben.</p>
          ) : (
            <div className="space-y-3">
              {spiele.sort((a, b) => (a.kickoff ?? "").localeCompare(b.kickoff ?? "")).map(spiel => {
                const locked = isLocked(spiel.kickoff);
                const meinTipp = tipps.find(t => t.spiel_id === spiel.id && t.teilnehmer_id === meinId);
                const inp = tippInputs[spiel.id] ?? { heim: "", gast: "" };
                return (
                  <div key={spiel.id} className={`bg-white border rounded-xl p-4 ${locked ? "opacity-80" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 text-right">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{spiel.heim_team}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min={0} max={20} disabled={locked || !meinId}
                          value={inp.heim}
                          onChange={e => setTippInputs(prev => ({ ...prev, [spiel.id]: { ...prev[spiel.id], heim: e.target.value } }))}
                          className="w-10 text-center border border-gray-300 rounded-lg py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                        <span className="text-gray-400 font-bold">:</span>
                        <input type="number" min={0} max={20} disabled={locked || !meinId}
                          value={inp.gast}
                          onChange={e => setTippInputs(prev => ({ ...prev, [spiel.id]: { ...prev[spiel.id], gast: e.target.value } }))}
                          className="w-10 text-center border border-gray-300 rounded-lg py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{spiel.gast_team}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                      <span>{formatKickoff(spiel.kickoff)}</span>
                      {meinTipp && meinTipp.punkte !== null && (
                        <span className={`font-semibold ${punkeFarbe(meinTipp.punkte)}`}>
                          {meinTipp.punkte} Pkt.
                        </span>
                      )}
                      {locked && <span className="text-orange-500">Gesperrt</span>}
                    </div>
                  </div>
                );
              })}
              {!spiele.every(s => isLocked(s.kickoff)) && meinId && (
                <button onClick={speichereTipps} disabled={savingTipps}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                  {savingTipps ? "Speichern..." : "Tipps speichern"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ERGEBNISSE */}
      {tab === "ergebnisse" && aktiverSpieltag && (
        <div className="space-y-4">
          {spiele.length === 0 && <p className="text-sm text-gray-400">Keine Spiele für diesen Spieltag.</p>}
          {spiele.sort((a, b) => (a.kickoff ?? "").localeCompare(b.kickoff ?? "")).map(spiel => {
            const spielTipps = tipps.filter(t => t.spiel_id === spiel.id);
            const eingabe = ergebnisInputs[spiel.id] ?? {
              heim: spiel.heim_tore_result !== null ? String(spiel.heim_tore_result) : "",
              gast: spiel.gast_tore_result !== null ? String(spiel.gast_tore_result) : "",
            };
            return (
              <div key={spiel.id} className="bg-white border rounded-xl p-4">
                {/* Match header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-1 text-right font-semibold text-sm text-gray-900">{spiel.heim_team}</span>
                  <div className="flex items-center gap-1.5">
                    {spiel.heim_tore_result !== null ? (
                      <span className="text-lg font-bold text-gray-900 px-2">
                        {spiel.heim_tore_result} : {spiel.gast_tore_result}
                      </span>
                    ) : (
                      <>
                        <input type="number" min={0} max={20} value={eingabe.heim}
                          onChange={e => setErgebnisInputs(prev => ({ ...prev, [spiel.id]: { ...prev[spiel.id], heim: e.target.value } }))}
                          className="w-10 text-center border border-gray-300 rounded-lg py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500" />
                        <span className="text-gray-400 font-bold">:</span>
                        <input type="number" min={0} max={20} value={eingabe.gast}
                          onChange={e => setErgebnisInputs(prev => ({ ...prev, [spiel.id]: { ...prev[spiel.id], gast: e.target.value } }))}
                          className="w-10 text-center border border-gray-300 rounded-lg py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500" />
                        <button onClick={() => speichereErgebnis(spiel.id)}
                          disabled={savingErgebnis === spiel.id || eingabe.heim === "" || eingabe.gast === ""}
                          className="ml-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                          {savingErgebnis === spiel.id ? "..." : "OK"}
                        </button>
                      </>
                    )}
                  </div>
                  <span className="flex-1 font-semibold text-sm text-gray-900">{spiel.gast_team}</span>
                </div>
                {/* All predictions */}
                {spielTipps.length > 0 ? (
                  <div className="border-t pt-3 space-y-1.5">
                    {spielTipps.map(tipp => {
                      const tn = teilnehmer.find(t => t.id === tipp.teilnehmer_id);
                      return (
                        <div key={tipp.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{tn?.name ?? "?"}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-700">
                              {tipp.heim_tore} : {tipp.gast_tore}
                              <span className="ml-1 text-xs text-gray-400">({tendenz(tipp.heim_tore, tipp.gast_tore)})</span>
                            </span>
                            {tipp.punkte !== null ? (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${tipp.punkte === 3 ? "bg-green-100 text-green-700" : tipp.punkte === 1 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                                {tipp.punkte} Pkt
                              </span>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Noch keine Tipps abgegeben.</p>
                )}
                <p className="text-xs text-gray-400 mt-2">{formatKickoff(spiel.kickoff)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* TABELLE */}
      {tab === "tabelle" && (
        <div>
          {teilnehmer.length === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Teilnehmer.</p>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Name</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Pkt</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 hidden sm:table-cell">Exakt</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 hidden sm:table-cell">Tendenz</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 hidden sm:table-cell">Spiele</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tabelle.map((t, i) => (
                    <tr key={t.id} className={t.id === meinId ? "bg-green-50" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {t.name}
                        {t.id === meinId && <span className="ml-1.5 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full">du</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-gray-900">{t.punkte}</td>
                      <td className="px-3 py-3 text-center text-green-600 hidden sm:table-cell">{t.exakt}</td>
                      <td className="px-3 py-3 text-center text-yellow-500 hidden sm:table-cell">{t.tendenz}</td>
                      <td className="px-3 py-3 text-center text-gray-400 hidden sm:table-cell">{t.gespielt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400">
                Punkte: 3 = exaktes Ergebnis · 1 = richtige Tendenz · 0 = falsch
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
