import { NextResponse } from "next/server";
import type { Fixture } from "@/lib/liga-data";

const STANDING_URL =
  "https://www.fupa.net/league/kreisliga-a1-stuttgart-boeblingen/standing";
const ICS_URL =
  "https://api.fupa.net/v1/teams/sg-stuttgart-west-m1-2025-26/matches.ics";
const OWN_TEAM_SLUG = "sg-stuttgart-west-m1-2025-26";
const OWN_TEAM_NAME = "Stuttgart West";

const FETCH_OPTS = {
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; FussballApp/1.0)",
    "Accept-Language": "de-DE,de;q=0.9",
  },
  next: { tags: ["fupa-table"], revalidate: false } as RequestInit["next"],
};

// ── ICS parser ────────────────────────────────────────────────────────────────

function parseICS(raw: string): Fixture[] {
  const today = new Date().toISOString().slice(0, 10);
  const ics = raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); // unfold long lines

  const fixtures: Fixture[] = [];

  for (const block of ics.split("BEGIN:VEVENT").slice(1)) {
    const summaryM = block.match(/\nSUMMARY:(.+)/);
    if (!summaryM) continue;
    const summary = summaryM[1].trim();

    // DTSTART;TZID=Europe/Berlin:20260525T150000  or  DTSTART:20260525T130000Z
    const dtM = block.match(/\nDTSTART(?:;[^\n:]*)?:(\d{8})(?:T(\d{2})(\d{2})\d{2}(Z?))?/);
    if (!dtM) continue;

    const rawDate = dtM[1];
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    if (date < today) continue;

    let time: string | undefined;
    if (dtM[2]) {
      if (dtM[4] === "Z") {
        // UTC → Europe/Berlin
        const utc = new Date(`${date}T${dtM[2]}:${dtM[3]}:00Z`);
        time = utc.toLocaleTimeString("de-DE", {
          timeZone: "Europe/Berlin",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        time = `${dtM[2]}:${dtM[3]}`;
      }
    }

    // "Home Team - Away Team"
    const sep = summary.indexOf(" - ");
    if (sep === -1) continue;
    const home = summary.slice(0, sep).trim();
    const away = summary.slice(sep + 3).trim();
    const isHome = home.includes(OWN_TEAM_NAME);

    fixtures.push({ date, home, away, isHome, time });
  }

  return fixtures.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
}

// ── Table parser ──────────────────────────────────────────────────────────────

function parseTable(html: string) {
  const marker = "window.REDUX_DATA = ";
  const start = html.indexOf(marker);
  if (start === -1) throw new Error("REDUX_DATA not found");

  const jsonStart = start + marker.length;
  const end = html.indexOf("</script>", jsonStart);
  if (end === -1) throw new Error("end of REDUX_DATA not found");

  let jsonStr = html.slice(jsonStart, end).trim();
  if (jsonStr.endsWith(";")) jsonStr = jsonStr.slice(0, -1);

  const redux = JSON.parse(jsonStr);
  const standings: unknown[] =
    redux?.dataHistory?.[0]?.LeagueStandingPage?.total?.data?.standings ?? [];

  return standings.map((s: unknown) => {
    const e = s as Record<string, unknown>;
    const team = e.team as Record<string, unknown>;
    const name = team?.name as Record<string, string> | undefined;
    const slug = team?.slug as string | undefined;
    return {
      pos: e.rank,
      team: name?.full ?? slug ?? "?",
      sp: e.matches,
      w: e.wins,
      d: e.draws,
      l: e.defeats,
      goals: `${e.ownGoals}:${e.againstGoals}`,
      pts: e.points,
      isOwn: slug === OWN_TEAM_SLUG,
    };
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const [tableRes, icsRes] = await Promise.allSettled([
    fetch(STANDING_URL, { ...FETCH_OPTS, headers: { ...FETCH_OPTS.headers, Accept: "text/html" } }),
    fetch(ICS_URL, FETCH_OPTS),
  ]);

  let table: ReturnType<typeof parseTable> | null = null;
  let fixtures: Fixture[] | null = null;
  const errors: string[] = [];

  if (tableRes.status === "fulfilled" && tableRes.value.ok) {
    try {
      table = parseTable(await tableRes.value.text());
    } catch (e) {
      errors.push(`table: ${e}`);
    }
  } else {
    errors.push(`table fetch: ${tableRes.status === "rejected" ? tableRes.reason : tableRes.value.status}`);
  }

  if (icsRes.status === "fulfilled" && icsRes.value.ok) {
    try {
      fixtures = parseICS(await icsRes.value.text());
    } catch (e) {
      errors.push(`ics: ${e}`);
    }
  } else {
    errors.push(`ics fetch: ${icsRes.status === "rejected" ? icsRes.reason : icsRes.value.status}`);
  }

  if (!table && !fixtures) {
    return NextResponse.json({ errors }, { status: 502 });
  }

  return NextResponse.json({
    table,
    fixtures,
    updatedAt: new Date().toISOString(),
    ...(errors.length ? { errors } : {}),
  });
}
