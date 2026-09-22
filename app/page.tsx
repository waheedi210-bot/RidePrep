"use client";

import { toPng } from "html-to-image";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";

import { ApparelPanel } from "@/components/apparel-panel";
import { BriefingTabs, type BriefingTab } from "@/components/briefing-tabs";
import { FuelingPanel } from "@/components/fueling-panel";
import { HealthPanel } from "@/components/health-panel";
import { InstallPanel } from "@/components/install-panel";
import { RouteHeader } from "@/components/route-header";
import { RouteInPanel } from "@/components/route-in-panel";
import { RouteWindMap } from "@/components/route-wind-map";
import { TemperatureBar } from "@/components/temperature-bar";
import { WindChart } from "@/components/wind-chart";
import { TirePressurePanel } from "@/components/tire-pressure-panel";
import { WindPanel } from "@/components/wind-panel";
import {
  recommendAirHealth,
  type AirObservation,
} from "@/lib/air-quality";
import {
  DEFAULT_START_TIME,
  defaultRider,
  type HourlyConditions,
  type RouteSummary,
} from "@/lib/briefing";
import {
  calculateFueling,
  calculateTirePressure,
  type TireSetup,
} from "@/lib/calculations";
import {
  fromZonedFields,
  readLocalTimeZone,
  toZonedDateInput,
  tomorrowAt,
  usableIanaTimeZone,
} from "@/lib/datetime";
import { observationsToHourly } from "@/lib/forecast";
import type { GeoPoint } from "@/lib/geo";
import { parseGpx } from "@/lib/gpx";
import { requestBriefingAirQuality } from "@/lib/live-air";
import { requestBriefingWeather } from "@/lib/live-weather";
import { describeWind, recommendApparel } from "@/lib/recommendations";
import {
  SHARE_TOAST,
  dataUrlToPngBlob,
  shareOrCopyPng,
} from "@/lib/share-briefing";
import { formatNumber, kmToMiles, metresToFeet } from "@/lib/units";

const TEMPO_WATTS = 210;
const TOAST_MS = 2800;
const BRIEFING_SURFACE = "#16203a";

function averageTempC(temps: number[]): number {
  if (temps.length === 0) {
    return 15;
  }

  return temps.reduce((total, temp) => total + temp, 0) / temps.length;
}

function briefingFileName(routeName: string): string {
  const slug = routeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `rideprep-${slug || "briefing"}.png`;
}

function ShareBriefingButton({
  targetRef,
  title,
  text,
}: {
  targetRef: RefObject<HTMLDivElement | null>;
  title: string;
  text: string;
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }

    setToast(message);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, TOAST_MS);
  };

  const onShare = async () => {
    const node = targetRef.current;

    if (!node || busy) {
      return;
    }

    setBusy(true);

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: BRIEFING_SURFACE,
      });
      const blob = dataUrlToPngBlob(dataUrl);
      const outcome = await shareOrCopyPng(blob, {
        fileName: briefingFileName(title),
        title: `${title} — RidePrep`,
        text,
        url: window.location.href,
      });

      if (outcome === "copied") {
        showToast(SHARE_TOAST);
      }
    } catch (error) {
      console.error("share briefing failed", error);
      showToast("Could not share this briefing. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        id="share-briefing"
        type="button"
        onClick={() => void onShare()}
        disabled={busy}
        aria-busy={busy}
        className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      >
        {busy ? "Preparing briefing…" : "Share Briefing to Group Chat"}
      </button>

      {toast ? (
        <p
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-xl border border-border-subtle bg-surface-raised px-4 py-3 text-center text-sm font-medium shadow-lg shadow-black/40"
        >
          {toast}
        </p>
      ) : null}
    </>
  );
}

function applyImportedRoute(
  imported: {
    name: string;
    region?: string;
    lat: number;
    lng: number;
    distanceKm: number;
    elevationGainM: number;
    movingHours: number;
    outboundBearingDeg: number;
    timezone?: string | null;
  },
  startTime: string,
  fallbackTimezone: string,
): RouteSummary {
  return {
    name: imported.name,
    region: imported.region ?? "Imported route",
    startTime,
    distanceKm: imported.distanceKm,
    elevationGainM: imported.elevationGainM,
    movingHours: imported.movingHours,
    surface: "road",
    outboundBearingDeg: imported.outboundBearingDeg,
    lat: imported.lat,
    lng: imported.lng,
    timezone: usableIanaTimeZone(imported.timezone) ?? fallbackTimezone,
  };
}

function useLocalTimeZone(): string {
  return useSyncExternalStore(
    () => () => undefined,
    readLocalTimeZone,
    () => "UTC",
  );
}

export default function Home() {
  const localTimeZone = useLocalTimeZone();
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [hourly, setHourly] = useState<HourlyConditions[]>([]);
  const [airHours, setAirHours] = useState<AirObservation[]>([]);
  const [track, setTrack] = useState<GeoPoint[] | undefined>(undefined);
  const [dateYmd, setDateYmd] = useState(() =>
    toZonedDateInput(
      tomorrowAt(DEFAULT_START_TIME, "UTC"),
      "UTC",
    ),
  );
  const [timeHm, setTimeHm] = useState(DEFAULT_START_TIME);
  const [forecastSource, setForecastSource] = useState<string | undefined>();
  const [routeMessage, setRouteMessage] = useState<string | null>(
    "Drop a GPX or paste a Ride with GPS link to build the briefing.",
  );
  const [busy, setBusy] = useState(false);

  const [riderWeightKg, setRiderWeightKg] = useState(defaultRider.weightKg);
  const [bikeWeightKg, setBikeWeightKg] = useState(defaultRider.bikeWeightKg);
  const [tireWidthMm, setTireWidthMm] = useState(defaultRider.tyreWidthMm);
  const [rimInnerWidthMm, setRimInnerWidthMm] = useState(21);
  const [setup, setSetup] = useState<TireSetup>("tubeless");
  const [isGravel, setIsGravel] = useState(false);
  const [durationHours, setDurationHours] = useState(3);
  const [temperatureC, setTemperatureC] = useState(15);
  const [targetWatts, setTargetWatts] = useState(TEMPO_WATTS);
  const [giTolerance, setGiTolerance] = useState(1);
  const briefingRef = useRef<HTMLDivElement>(null);

  const briefingTimeZone = route?.timezone ?? localTimeZone;
  const startInstant = useMemo(
    () => fromZonedFields(dateYmd, timeHm, briefingTimeZone),
    [dateYmd, timeHm, briefingTimeZone],
  );

  useEffect(() => {
    if (!route) {
      return;
    }

    const loadedRoute = route;
    const controller = new AbortController();

    async function load() {
      if (Number.isNaN(startInstant.getTime())) {
        return;
      }

      try {
        const weatherRequest = requestBriefingWeather({
          lat: loadedRoute.lat,
          lng: loadedRoute.lng,
          startTime: startInstant,
          movingHours: loadedRoute.movingHours,
          points: track,
          signal: controller.signal,
        });
        const airRequest = requestBriefingAirQuality({
          lat: loadedRoute.lat,
          lng: loadedRoute.lng,
          startTime: startInstant,
          movingHours: loadedRoute.movingHours,
          signal: controller.signal,
        });
        const [weatherResult, airResult] = await Promise.allSettled([
          weatherRequest,
          airRequest,
        ]);

        if (controller.signal.aborted) {
          return;
        }

        if (weatherResult.status === "fulfilled") {
          const payload = weatherResult.value;
          const zone =
            usableIanaTimeZone(payload.location.timezone) ?? loadedRoute.timezone;
          const nextHourly = observationsToHourly(payload.hours, zone);

          if (nextHourly.length > 0) {
            if (zone !== loadedRoute.timezone) {
              setRoute((current) =>
                current ? { ...current, timezone: zone } : current,
              );
            }
            setHourly(nextHourly);
            setTemperatureC(
              Math.round(averageTempC(nextHourly.map((hour) => hour.tempC)) * 10) / 10,
            );
            setForecastSource("Live Open-Meteo");
          }
        } else {
          setForecastSource(undefined);
          setRouteMessage(
            weatherResult.reason instanceof Error
              ? weatherResult.reason.message
              : "Could not load the forecast.",
          );
        }

        if (airResult.status === "fulfilled") {
          setAirHours(airResult.value.hours);
        } else if (!controller.signal.aborted) {
          setAirHours([]);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setForecastSource(undefined);
        setRouteMessage(
          error instanceof Error ? error.message : "Could not load the forecast.",
        );
      }
    }

    void load();

    return () => controller.abort();
  }, [route, startInstant, track]);

  const dewPointC = useMemo(
    () => averageTempC(hourly.map((hour) => hour.dewPointC)),
    [hourly],
  );

  const pressure = useMemo(
    () =>
      calculateTirePressure({
        riderWeightKg,
        bikeWeightKg,
        tireWidthMm,
        isGravel,
        rimInnerWidthMm,
        setup,
      }),
    [riderWeightKg, bikeWeightKg, tireWidthMm, isGravel, rimInnerWidthMm, setup],
  );

  const fueling = useMemo(
    () =>
      calculateFueling({
        durationHours,
        temperatureC,
        targetWatts,
        dewPointC,
        giTolerance,
        sweatRate: defaultRider.sweatRate,
      }),
    [durationHours, temperatureC, targetWatts, dewPointC, giTolerance],
  );

  const briefing = useMemo(() => {
    if (!route) {
      return null;
    }

    return {
      route: {
        ...route,
        startTime: timeHm,
        surface: isGravel ? ("gravel" as const) : ("road" as const),
      },
      hourly,
      rider: defaultRider,
    };
  }, [route, hourly, isGravel, timeHm]);

  const airAdvice = useMemo(
    () => (airHours.length > 0 ? recommendAirHealth(airHours, briefingTimeZone) : null),
    [airHours, briefingTimeZone],
  );

  const wettestHour = hourly[0]
    ? hourly.reduce((wettest, hour) =>
        hour.precipChance > wettest.precipChance ? hour : wettest,
      )
    : null;
  const wetHint =
    wettestHour && wettestHour.precipChance >= 30
      ? `${wettestHour.precipChance}% chance of rain at ${wettestHour.time} — take 4 psi out of each tyre for grip on the descents.`
      : null;

  const onGpxFile = async (file: File) => {
    setBusy(true);
    setRouteMessage(null);

    try {
      const xml = await file.text();
      const parsed = parseGpx(xml, file.name.replace(/\.gpx$/i, ""));
      setTrack(parsed.points);
      setDurationHours(parsed.movingHours);
      setIsGravel(/gravel/i.test(parsed.name));
      setRoute(applyImportedRoute(parsed, timeHm, briefingTimeZone));
      setRouteMessage(`Loaded ${parsed.name} from GPX.`);
    } catch (error) {
      setRouteMessage(
        error instanceof Error ? error.message : "Could not parse that GPX file.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onRouteUrl = async (url: string) => {
    setBusy(true);
    setRouteMessage(null);

    try {
      const response = await fetch(`/api/route?url=${encodeURIComponent(url)}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json()) as
        | {
            name: string;
            region?: string;
            lat: number;
            lng: number;
            distanceKm: number;
            elevationGainM: number;
            movingHours: number;
            outboundBearingDeg: number;
            timezone?: string | null;
            points: GeoPoint[];
          }
        | { error?: { message?: string } };

      if (!response.ok || !("points" in body)) {
        const message =
          "error" in body && body.error?.message
            ? body.error.message
            : "Could not import that route.";
        throw new Error(message);
      }

      setTrack(body.points);
      setDurationHours(body.movingHours);
      setRoute(applyImportedRoute(body, timeHm, briefingTimeZone));
      setRouteMessage(`Loaded ${body.name} from Ride with GPS.`);
    } catch (error) {
      setRouteMessage(
        error instanceof Error ? error.message : "Could not import that route.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onClear = () => {
    setTrack(undefined);
    setRoute(null);
    setHourly([]);
    setAirHours([]);
    setDurationHours(3);
    setIsGravel(false);
    setForecastSource(undefined);
    setTimeHm(DEFAULT_START_TIME);
    setDateYmd(
      toZonedDateInput(
        tomorrowAt(DEFAULT_START_TIME, localTimeZone),
        localTimeZone,
      ),
    );
    setRouteMessage("Drop a GPX or paste a Ride with GPS link to build the briefing.");
  };

  const tabs: BriefingTab[] =
    briefing && hourly.length > 0
      ? [
          {
            id: "apparel",
            label: "Apparel",
            shortLabel: "Apparel",
            panel: <ApparelPanel advice={recommendApparel(briefing)} />,
          },
          {
            id: "tyres",
            label: "Tire Pressure",
            shortLabel: "Tires",
            panel: (
              <TirePressurePanel
                riderWeightKg={riderWeightKg}
                bikeWeightKg={bikeWeightKg}
                tireWidthMm={tireWidthMm}
                rimInnerWidthMm={rimInnerWidthMm}
                setup={setup}
                isGravel={isGravel}
                onRiderWeightKg={setRiderWeightKg}
                onBikeWeightKg={setBikeWeightKg}
                onTireWidthMm={setTireWidthMm}
                onRimInnerWidthMm={setRimInnerWidthMm}
                onSetup={setSetup}
                onIsGravel={setIsGravel}
                pressure={pressure}
                wetHint={wetHint}
              />
            ),
          },
          {
            id: "wind",
            label: "Wind",
            shortLabel: "Wind",
            panel: <WindPanel wind={describeWind(briefing)} />,
          },
          {
            id: "fueling",
            label: "Fueling",
            shortLabel: "Fuel",
            panel: (
              <FuelingPanel
                durationHours={durationHours}
                temperatureC={temperatureC}
                targetWatts={targetWatts}
                giTolerance={giTolerance}
                onDurationHours={setDurationHours}
                onTemperatureC={setTemperatureC}
                onTargetWatts={setTargetWatts}
                onGiTolerance={setGiTolerance}
                fueling={fueling}
                dewPointC={Math.round(dewPointC * 10) / 10}
              />
            ),
          },
          ...(airAdvice
            ? [
                {
                  id: "health",
                  label: "Air Quality",
                  shortLabel: "Air",
                  panel: <HealthPanel advice={airAdvice} />,
                } satisfies BriefingTab,
              ]
            : []),
        ]
      : [];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pb-12 pt-6 sm:gap-5 sm:px-6 sm:pt-8">
      <div className="flex items-center gap-3">
        <Image
          src="/icons/icon.svg"
          alt=""
          width={36}
          height={36}
          priority
          className="rounded-lg"
        />
        <p className="text-sm font-semibold tracking-tight">RidePrep</p>
      </div>

      <RouteInPanel
        timezone={briefingTimeZone}
        dateYmd={dateYmd}
        timeHm={timeHm}
        onDateYmd={setDateYmd}
        onTimeHm={setTimeHm}
        onGpxFile={(file) => void onGpxFile(file)}
        onRouteUrl={(url) => void onRouteUrl(url)}
        onClear={route ? onClear : undefined}
        busy={busy}
        message={routeMessage}
      />

      {briefing ? (
        <>
          <RouteHeader route={briefing.route} captureRef={briefingRef}>
            <ShareBriefingButton
              targetRef={briefingRef}
              title={briefing.route.name}
              text={`${briefing.route.name} · ${formatNumber(kmToMiles(briefing.route.distanceKm), 1)} mi · ${formatNumber(metresToFeet(briefing.route.elevationGainM))} ft`}
            />
          </RouteHeader>
          <TemperatureBar hourly={hourly} source={forecastSource} />
          <RouteWindMap
            points={
              track && track.length > 0
                ? track
                : [{ lat: briefing.route.lat, lng: briefing.route.lng }]
            }
            hourly={hourly}
            movingHours={briefing.route.movingHours}
          />
          <WindChart hourly={hourly} />
          {airAdvice &&
          (airAdvice.severity === "caution" || airAdvice.severity === "stop") ? (
            <p
              role="status"
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                airAdvice.severity === "stop"
                  ? "border border-accent/30 bg-accent/10 text-accent"
                  : "border border-caution/25 bg-caution/10 text-caution"
              }`}
            >
              {airAdvice.headline}
            </p>
          ) : null}
          {tabs.length > 0 ? <BriefingTabs tabs={tabs} /> : null}
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-border-subtle bg-surface px-5 py-8 text-center sm:px-6">
          <p className="text-sm font-semibold">No route yet</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Import a Ride with GPS link or a GPX and the briefing will fill in
            distance, elevation, forecast, tires, fueling and air quality.
          </p>
        </section>
      )}
      <InstallPanel />

      <footer className="pt-2 text-xs leading-relaxed text-muted">
        Forecast is live Open-Meteo along the route. Air quality uses CAMS US
        AQI (pollen where Europe has it). Tire pressure uses Silca / SRAM plus
        rim and tubeless setup. Fueling follows ACSM/ISSN 30–90 g/hr with
        dew-point sweat and a GI-tolerance slider.
      </footer>
    </main>
  );
}
