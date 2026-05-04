import { NextRequest } from "next/server";

const RAILWAY_URL =
  process.env.RAILWAY_SCRAPER_URL ??
  "https://web-production-b032d.up.railway.app";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const railwayRes = await fetch(`${RAILWAY_URL}/run-scraper`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!railwayRes.ok) {
    return new Response(
      JSON.stringify({ error: "Scraper service unavailable" }),
      { status: 502 }
    );
  }

  return new Response(railwayRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

export const maxDuration = 300;
