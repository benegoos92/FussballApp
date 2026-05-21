import { NextResponse } from "next/server";
import { fetchTable, fetchFixtures } from "@/lib/fupa";

export async function GET() {
  const [table, fixtures] = await Promise.all([fetchTable(), fetchFixtures()]);

  if (!table && !fixtures) {
    return NextResponse.json({ error: "Both fupa sources failed" }, { status: 502 });
  }

  return NextResponse.json({
    table,
    fixtures,
    updatedAt: new Date().toISOString(),
  });
}
