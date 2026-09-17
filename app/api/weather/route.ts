import { NextResponse } from "next/server";

import { fetchOpenMeteoForecast, OpenMeteoError } from "@/lib/open-meteo";
import {
  FORECAST_HOURS,
  observeCurrent,
  parseWeatherQuery,
  sliceHourlyFromStart,
  type QueryIssue,
  type WeatherPayload,
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

  const { lat, lng, startTime } = parsed.query;

  try {
    const forecast = await fetchOpenMeteoForecast(lat, lng);
    const current = observeCurrent(forecast.current);

    if (!current) {
      return jsonError(
        502,
        "UPSTREAM_ERROR",
        "Open-Meteo omitted the current observation.",
      );
    }

    const windowStart = startTime ?? new Date(current.time);
    const sliced = sliceHourlyFromStart(
      forecast.hourly,
      windowStart,
      FORECAST_HOURS,
    );

    if ("error" in sliced) {
      return jsonError(400, "START_OUT_OF_RANGE", sliced.error, [
        { param: "startTime", message: sliced.error },
      ]);
    }

    const payload: WeatherPayload = {
      location: {
        lat: forecast.latitude,
        lng: forecast.longitude,
        elevationM: forecast.elevation,
        timezone: forecast.timezone,
      },
      query: {
        lat,
        lng,
        startTime: windowStart.toISOString(),
      },
      current,
      hours: sliced.hours,
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      return jsonError(error.status, error.code, error.message);
    }

    return jsonError(
      502,
      "UPSTREAM_ERROR",
      "The weather lookup failed unexpectedly.",
    );
  }
}
