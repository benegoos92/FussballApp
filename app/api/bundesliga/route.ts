import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OLDBMatch {
  matchID: number;
  matchDateTimeUTC: string;
  team1: { teamName: string; shortName: string };
  team2: { teamName: string; shortName: string };
  matchIsFinished: boolean;
  matchResults: { resultTypeID: number; pointsTeam1: number; pointsTeam2: number }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = parseInt(searchParams.get("spieltag") ?? "1");
  const saison = searchParams.get("saison") ?? "2025";

  const res = await fetch(
    `https://api.openligadb.de/getmatchdata/bl1/${saison}/${spieltag}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return NextResponse.json({ error: "OpenLigaDB fetch failed" }, { status: 502 });

  const matches: OLDBMatch[] = await res.json();

  // Upsert Spieltag
  const { data: spieltagRow, error: stErr } = await supabase
    .from("tipp_spieltage")
    .upsert({ spieltag, saison }, { onConflict: "spieltag,saison" })
    .select()
    .single();
  if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });

  // Upsert matches
  const spieleRows = matches.map((m) => {
    const finalResult = m.matchResults.find((r) => r.resultTypeID === 2);
    return {
      spieltag_id: spieltagRow.id,
      openligadb_id: m.matchID,
      heim_team: m.team1.teamName,
      gast_team: m.team2.teamName,
      kickoff: m.matchDateTimeUTC,
      heim_tore_result: m.matchIsFinished && finalResult ? finalResult.pointsTeam1 : null,
      gast_tore_result: m.matchIsFinished && finalResult ? finalResult.pointsTeam2 : null,
    };
  });

  await supabase.from("tipp_spiele").upsert(spieleRows, { onConflict: "openligadb_id" });

  // After syncing results, recalculate points for finished matches
  for (const spiel of spieleRows) {
    if (spiel.heim_tore_result === null) continue;
    const { data: spielRow } = await supabase
      .from("tipp_spiele")
      .select("id, heim_tore_result, gast_tore_result")
      .eq("openligadb_id", spiel.openligadb_id!)
      .single();
    if (!spielRow) continue;
    const { data: tippRows } = await supabase
      .from("tipps")
      .select("id, heim_tore, gast_tore")
      .eq("spiel_id", spielRow.id);
    if (!tippRows) continue;
    for (const tipp of tippRows) {
      const punkte = berechnePunkte(
        tipp.heim_tore, tipp.gast_tore,
        spielRow.heim_tore_result!, spielRow.gast_tore_result!
      );
      await supabase.from("tipps").update({ punkte }).eq("id", tipp.id);
    }
  }

  return NextResponse.json({ ok: true, spieltag: spieltagRow, count: matches.length });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { spieltag_id, spiel_id, heim_tore_result, gast_tore_result } = body;

  if (!spiel_id || heim_tore_result == null || gast_tore_result == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await supabase
    .from("tipp_spiele")
    .update({ heim_tore_result, gast_tore_result })
    .eq("id", spiel_id);

  // Recalculate points for all tipps on this match
  const { data: tippRows } = await supabase
    .from("tipps")
    .select("id, heim_tore, gast_tore")
    .eq("spiel_id", spiel_id);

  if (tippRows) {
    for (const tipp of tippRows) {
      const punkte = berechnePunkte(
        tipp.heim_tore, tipp.gast_tore,
        heim_tore_result, gast_tore_result
      );
      await supabase.from("tipps").update({ punkte, updated_at: new Date().toISOString() }).eq("id", tipp.id);
    }
  }

  void spieltag_id; // used by caller for context only
  return NextResponse.json({ ok: true });
}

function berechnePunkte(
  tippHeim: number, tippGast: number,
  resHeim: number, resGast: number
): number {
  if (tippHeim === resHeim && tippGast === resGast) return 3;
  const tippTendenz = Math.sign(tippHeim - tippGast);
  const resTendenz = Math.sign(resHeim - resGast);
  if (tippTendenz === resTendenz) return 1;
  return 0;
}
