import { NextResponse } from "next/server";

import { parseGpx } from "@/lib/gpx";
import { fetchIanaTimezone } from "@/lib/open-meteo";
import {
  RouteUrlError,
  assertAllowedFetchUrl,
  resolveRouteUrl,
} from "@/lib/route-url";
import { parseRwgpsJson } from "@/lib/rwgps";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function fetchAllowed(rawUrl: string, accept: string) {
  const fetchUrl = assertAllowedFetchUrl(rawUrl);
  const response = await fetch(fetchUrl, {
    headers: { Accept: accept },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("UPSTREAM_ERROR");
  }

  const finalHost = new URL(response.url).hostname.toLowerCase();

  if (finalHost !== "ridewithgps.com" && finalHost !== "www.ridewithgps.com") {
    throw new RouteUrlError(
      "The route redirect left the allowlist.",
      400,
      "UNSUPPORTED_HOST",
    );
  }

  return response;
}

async function jsonFromGpx(xml: string) {
  if (xml.length > MAX_BYTES) {
    throw new RouteUrlError(
      "That GPX file is too large to import.",
      413,
      "GPX_TOO_LARGE",
    );
  }

  const parsed = parseGpx(xml);
  const timezone = await fetchIanaTimezone(parsed.lat, parsed.lng);

  return {
    name: parsed.name,
    region: "Imported route",
    lat: parsed.lat,
    lng: parsed.lng,
    distanceKm: parsed.distanceKm,
    elevationGainM: parsed.elevationGainM,
    movingHours: parsed.movingHours,
    outboundBearingDeg: parsed.outboundBearingDeg,
    timezone,
    points: parsed.points,
  };
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

    if (resolved.jsonUrl) {
      try {
        const response = await fetchAllowed(
          resolved.jsonUrl,
          "application/json, */*",
        );
        const text = await response.text();

        if (text.length > MAX_BYTES) {
          return jsonError(413, "GPX_TOO_LARGE", "That route file is too large to import.");
        }

        const parsed = parseRwgpsJson(JSON.parse(text));
        const timezone = await fetchIanaTimezone(parsed.lat, parsed.lng);

        return NextResponse.json({ ...parsed, timezone });
      } catch (error) {
        if (error instanceof RouteUrlError) {
          throw error;
        }
        // Unlisted routes or a JSON shape we do not recognise still have GPX.
      }
    }

    if (!resolved.fetchUrl) {
      return jsonError(400, "INVALID_URL", "Could not resolve that route link.");
    }

    const response = await fetchAllowed(
      resolved.fetchUrl,
      "application/gpx+xml, application/xml, text/xml, */*",
    );
    const xml = await response.text();

    return NextResponse.json(await jsonFromGpx(xml));
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
