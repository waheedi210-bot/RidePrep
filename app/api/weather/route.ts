import { NextResponse } from "next/server";

import { loadForecast, loadForecastAlongRoute } from "@/lib/forecast";
import { OpenMeteoError } from "@/lib/open-meteo";
import {
  parseStartTime,
  parseWeatherQuery,
  type QueryIssue,
} from "@/lib/weather";

export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=300";

interface ErrorBody {
  error: {
    code: string;
    message: string;
    issues?: QueryIssue[];
  };
}

function jsonError(
  status: number,
  code: string,
  message: string,
  issues?: QueryIssue[],
) {
  const body: ErrorBody = { error: { code, message } };

  if (issues && issues.length > 0) {
    body.error.issues = issues;
  }

  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  const parsed = parseWeatherQuery(new URL(request.url).searchParams);

  if ("issues" in parsed) {
    return jsonError(
      400,
      "INVALID_QUERY",
      "The weather query is invalid.",
      parsed.issues,
    );
  }

  const { lat, lng, startTime, hours } = parsed.query;

  try {
    const windowStart = startTime ?? new Date();
    const payload = await loadForecast({
      lat,
      lng,
      startTime: windowStart,
      hours,
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      return jsonError(error.status, error.code, error.message);
    }

    if (error instanceof Error && /startTime is after|No complete hourly/.test(error.message)) {
      return jsonError(400, "START_OUT_OF_RANGE", error.message, [
        { param: "startTime", message: error.message },
      ]);
    }

    return jsonError(
      502,
      "UPSTREAM_ERROR",
      "The weather lookup failed unexpectedly.",
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_QUERY", "JSON body is required.");
  }

  if (typeof body !== "object" || body === null) {
    return jsonError(400, "INVALID_QUERY", "JSON body is required.");
  }

  const record = body as Record<string, unknown>;
  const issues: QueryIssue[] = [];
  const startTime = parseStartTime(
    typeof record.startTime === "string" ? record.startTime : null,
    issues,
  );
  const hours =
    typeof record.hours === "number" && Number.isInteger(record.hours)
      ? record.hours
      : 4;
  const rawSamples = record.samples;

  if (!Array.isArray(rawSamples) || rawSamples.length === 0) {
    issues.push({ param: "samples", message: "samples must be a non-empty array." });
  }

  if (issues.length > 0 || !startTime || !Array.isArray(rawSamples)) {
    return jsonError(400, "INVALID_QUERY", "The weather query is invalid.", issues);
  }

  const samples = rawSamples.flatMap((sample) => {
    if (typeof sample !== "object" || sample === null) {
      return [];
    }

    const point = sample as Record<string, unknown>;
    const lat = Number(point.lat);
    const lng = Number(point.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }

    return [{ lat, lng }];
  });

  if (samples.length === 0) {
    return jsonError(400, "INVALID_QUERY", "samples must include lat and lng.");
  }

  try {
    const payload = await loadForecastAlongRoute({
      samples,
      startTime,
      hours: Math.min(12, Math.max(1, hours)),
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      return jsonError(error.status, error.code, error.message);
    }

    if (error instanceof Error && /startTime is after|No complete hourly/.test(error.message)) {
      return jsonError(400, "START_OUT_OF_RANGE", error.message, [
        { param: "startTime", message: error.message },
      ]);
    }

    return jsonError(
      502,
      "UPSTREAM_ERROR",
      "The weather lookup failed unexpectedly.",
    );
  }
}
