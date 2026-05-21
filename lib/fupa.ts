import type { TableEntry, Fixture } from "./liga-data";

const STANDING_URL =
  "https://www.fupa.net/league/kreisliga-a1-stuttgart-boeblingen/standing";
const ICS_URL =
  "https://api.fupa.net/v1/teams/sg-stuttgart-west-m1-2025-26/matches.ics";
const OWN_TEAM_SLUG = "sg-stuttgart-west-m1-2025-26";
const OWN_TEAM_NAME = "Stuttgart West";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; FussballApp/1.0)",
  "Accept-Language": "de-DE,de;q=0.9",
};

// ── Table ─────────────────────────────────────────────────────────────────────

export async function fetchTable(): Promise<TableEntry[] | null> {
  try {
    const res = await fetch(STANDING_URL, {
      headers: { ...HEADERS, Accept: "text/html" },
      next: { tags: ["fupa-table"], revalidate: false },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const marker = "window.REDUX_DATA = ";
    const start = html.indexOf(marker);
    if (start === -1) return null;
    const jsonStart = start + marker.length;
    const end = html.indexOf("</script>", jsonStart);
    if (end === -1) return null;

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
        pos: e.rank as number,
        team: name?.full ?? slug ?? "?",
        sp: e.matches as number,
        w: e.wins as number,
        d: e.draws as number,
        l: e.defeats as number,
        goals: `${e.ownGoals}:${e.againstGoals}`,
        pts: e.points as number,
        isOwn: slug === OWN_TEAM_SLUG,
      };
    });
  } catch {
    return null;
  }
}

// ── Fixtures (ICS) ────────────────────────────────────────────────────────────

export async function fetchFixtures(): Promise<Fixture[] | null> {
  try {
    const res = await fetch(ICS_URL, {
      headers: HEADERS,
      next: { tags: ["fupa-table"], revalidate: false },
    });
    if (!res.ok) return null;
    const raw = await res.text();
    return parseICS(raw);
  } catch {
    return null;
  }
}

function parseICS(raw: string): Fixture[] {
  const today = new Date().toISOString().slice(0, 10);
  const ics = raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const fixtures: Fixture[] = [];

  for (const block of ics.split("BEGIN:VEVENT").slice(1)) {
    const summaryM = block.match(/\nSUMMARY:(.+)/);
    if (!summaryM) continue;
    const summary = summaryM[1].trim();

    const dtM = block.match(/\nDTSTART(?:;[^\n:]*)?:(\d{8})(?:T(\d{2})(\d{2})\d{2}(Z?))?/);
    if (!dtM) continue;

    const rawDate = dtM[1];
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    if (date < today) continue;

    let time: string | undefined;
    if (dtM[2]) {
      if (dtM[4] === "Z") {
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

    const sep = summary.indexOf(" - ");
    if (sep === -1) continue;
    const home = summary.slice(0, sep).trim();
    const away = summary.slice(sep + 3).trim();
    const isHome = home.includes(OWN_TEAM_NAME);

    fixtures.push({ date, home, away, isHome, time });
  }

  return fixtures.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
}
