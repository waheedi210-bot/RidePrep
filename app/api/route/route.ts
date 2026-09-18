import { NextResponse } from "next/server";

import { parseGpx } from "@/lib/gpx";
import {
  RouteUrlError,
  assertAllowedFetchUrl,
  resolveRouteUrl,
} from "@/lib/route-url";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_GPX_BYTES = 2_000_000;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");

  if (!raw) {
    return jsonError(400, "INVALID_URL", "url is required.");
  }

  try {
    const resolved = resolveRouteUrl(raw);

    if (resolved.provider === "strava") {
      return jsonError(400, "STRAVA_GPX_REQUIRED", resolved.stravaHint ?? "Export a Strava GPX.");
    }

    if (!resolved.fetchUrl) {
      return jsonError(400, "INVALID_URL", "Could not resolve that route link.");
    }

    const fetchUrl = assertAllowedFetchUrl(resolved.fetchUrl);
    const response = await fetch(fetchUrl, {
      headers: { Accept: "application/gpx+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) {
      return jsonError(
        502,
        "UPSTREAM_ERROR",
        "Ride with GPS did not return a GPX for that route. If it is private, export GPX and drop the file here.",
      );
    }

    const finalHost = new URL(response.url).hostname.toLowerCase();

    if (finalHost !== "ridewithgps.com" && finalHost !== "www.ridewithgps.com") {
      return jsonError(400, "UNSUPPORTED_HOST", "The route redirect left the allowlist.");
    }

    const xml = await response.text();

    if (xml.length > MAX_GPX_BYTES) {
      return jsonError(413, "GPX_TOO_LARGE", "That GPX file is too large to import.");
    }

    const parsed = parseGpx(xml);

    return NextResponse.json({
      name: parsed.name,
      lat: parsed.lat,
      lng: parsed.lng,
      distanceKm: parsed.distanceKm,
      elevationGainM: parsed.elevationGainM,
      movingHours: parsed.movingHours,
      outboundBearingDeg: parsed.outboundBearingDeg,
      points: parsed.points,
    });
  } catch (error) {
    if (error instanceof RouteUrlError) {
      return jsonError(error.status, error.code, error.message);
    }

    if (error instanceof Error && error.message.includes("usable track")) {
      return jsonError(400, "INVALID_GPX", error.message);
    }

    return jsonError(502, "UPSTREAM_ERROR", "Could not import that route.");
  }
}
