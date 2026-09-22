import { NextResponse } from "next/server";

import { loadAirQuality } from "@/lib/air-quality";
import { OpenMeteoError } from "@/lib/open-meteo";
import { parseWeatherQuery, type QueryIssue } from "@/lib/weather";

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
      "The air-quality query is invalid.",
      parsed.issues,
    );
  }

  const { lat, lng, startTime, hours } = parsed.query;

  try {
    const payload = await loadAirQuality({
      lat,
      lng,
      startTime: startTime ?? new Date(),
      hours,
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      return jsonError(error.status, error.code, error.message);
    }

    if (
      error instanceof Error &&
      /startTime is after|No complete hourly/.test(error.message)
    ) {
      return jsonError(400, "START_OUT_OF_RANGE", error.message, [
        { param: "startTime", message: error.message },
      ]);
    }

    return jsonError(
      502,
      "UPSTREAM_ERROR",
      "The air-quality lookup failed unexpectedly.",
    );
  }
}
