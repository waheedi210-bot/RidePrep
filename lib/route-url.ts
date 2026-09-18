const ALLOWED_HOSTS = new Set([
  "ridewithgps.com",
  "www.ridewithgps.com",
]);

export type RouteProvider = "rwgps" | "strava" | "gpx-url";

export interface ResolvedRouteUrl {
  provider: RouteProvider;
  fetchUrl?: string;
  jsonUrl?: string;
  stravaHint?: string;
}

export class RouteUrlError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "RouteUrlError";
    this.status = status;
    this.code = code;
  }
}

function hostnameOf(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

export function resolveRouteUrl(raw: string): ResolvedRouteUrl {
  let url: URL;

  try {
    url = new URL(raw.trim());
  } catch {
    throw new RouteUrlError(
      "Paste a full Ride with GPS or Strava route link, or drop a GPX file.",
      400,
      "INVALID_URL",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RouteUrlError("Only http and https route links are allowed.", 400, "INVALID_URL");
  }

  const host = hostnameOf(url);

  if (host === "strava.com") {
    return {
      provider: "strava",
      stravaHint:
        "Strava does not let us pull a route without a login. Export GPX from the route page and drop the file here.",
    };
  }

  const rwgps = /ridewithgps\.com$/i.test(url.hostname);

  if (rwgps) {
    const id = /\/routes\/(\d+)/.exec(url.pathname)?.[1];

    if (!id) {
      throw new RouteUrlError(
        "That Ride with GPS link does not include a route id.",
        400,
        "INVALID_URL",
      );
    }

    return {
      provider: "rwgps",
      fetchUrl: `https://ridewithgps.com/routes/${id}.gpx`,
      jsonUrl: `https://ridewithgps.com/routes/${id}.json`,
    };
  }

  if (url.pathname.toLowerCase().endsWith(".gpx") && ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    return { provider: "gpx-url", fetchUrl: url.toString() };
  }

  throw new RouteUrlError(
    "Use a Ride with GPS route link, or drop a GPX exported from Strava.",
    400,
    "UNSUPPORTED_HOST",
  );
}

export function assertAllowedFetchUrl(raw: string): URL {
  const url = new URL(raw);

  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new RouteUrlError(
      "That host is not on the route-import allowlist.",
      400,
      "UNSUPPORTED_HOST",
    );
  }

  return url;
}
