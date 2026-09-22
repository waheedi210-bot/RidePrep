import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OSM_TILE = "https://tile.openstreetmap.org";
const USER_AGENT =
  "RidePrep/0.1 (https://github.com/waheedi210-bot/RidePrep; pre-ride briefing)";
const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=86400";

function parseTileIndex(raw: string | null, max: number): number | null {
  if (raw === null || raw.trim() === "") {
    return null;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0 || value > max) {
    return null;
  }

  return value;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const zoom = parseTileIndex(params.get("z"), 18);

  if (zoom === null) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "z must be an integer 0–18." } },
      { status: 400 },
    );
  }

  const maxIndex = 2 ** zoom - 1;
  const x = parseTileIndex(params.get("x"), maxIndex);
  const y = parseTileIndex(params.get("y"), maxIndex);

  if (x === null || y === null) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "x and y must be tile indexes for that zoom." } },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${OSM_TILE}/${zoom}/${x}/${y}.png`, {
      headers: {
        Accept: "image/png",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 86_400 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "The map tile could not be loaded." } },
        { status: 502 },
      );
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "The map tile lookup failed." } },
      { status: 502 },
    );
  }
}
