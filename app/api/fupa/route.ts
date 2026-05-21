import { NextResponse } from "next/server";

const FUPA_URL =
  "https://www.fupa.net/league/kreisliga-a1-stuttgart-boeblingen/standing";

const OWN_TEAM_SLUG = "sg-stuttgart-west-m1-2025-26";

export async function GET() {
  try {
    const res = await fetch(FUPA_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FussballApp/1.0; +https://fussballapp.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      next: { tags: ["fupa-table"], revalidate: false },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `fupa returned ${res.status}` }, { status: 502 });
    }

    const html = await res.text();

    const marker = "window.REDUX_DATA = ";
    const start = html.indexOf(marker);
    if (start === -1) {
      return NextResponse.json({ error: "REDUX_DATA not found" }, { status: 502 });
    }

    // Find the closing </script> after the JSON assignment
    const jsonStart = start + marker.length;
    const end = html.indexOf("</script>", jsonStart);
    if (end === -1) {
      return NextResponse.json({ error: "Could not find end of REDUX_DATA" }, { status: 502 });
    }

    // Strip trailing semicolon if present
    let jsonStr = html.slice(jsonStart, end).trim();
    if (jsonStr.endsWith(";")) jsonStr = jsonStr.slice(0, -1);

    const redux = JSON.parse(jsonStr);

    const standings: unknown[] =
      redux?.dataHistory?.[0]?.LeagueStandingPage?.total?.data?.standings ?? [];

    const table = standings.map((s: unknown) => {
      const entry = s as Record<string, unknown>;
      const team = entry.team as Record<string, unknown>;
      const teamName = team?.name as Record<string, string> | undefined;
      const slug = team?.slug as string | undefined;
      const goals = `${entry.ownGoals}:${entry.againstGoals}`;
      return {
        pos: entry.rank,
        team: teamName?.full ?? slug ?? "?",
        sp: entry.matches,
        w: entry.wins,
        d: entry.draws,
        l: entry.defeats,
        goals,
        pts: entry.points,
        isOwn: slug === OWN_TEAM_SLUG,
      };
    });

    return NextResponse.json({ table, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("fupa fetch error", err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
