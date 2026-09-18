"use client";

import { toPng } from "html-to-image";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { ApparelPanel } from "@/components/apparel-panel";
import { BriefingTabs, type BriefingTab } from "@/components/briefing-tabs";
import { FuelingPanel } from "@/components/fueling-panel";
import { InstallPanel } from "@/components/install-panel";
import { RouteHeader } from "@/components/route-header";
import { RouteInPanel } from "@/components/route-in-panel";
import { TemperatureBar } from "@/components/temperature-bar";
import { TirePressurePanel } from "@/components/tire-pressure-panel";
import { WindPanel } from "@/components/wind-panel";
import { defaultBriefing, type RouteSummary } from "@/lib/briefing";
import {
  calculateFueling,
  calculateTirePressure,
  type TireSetup,
} from "@/lib/calculations";
import {
  fromZonedFields,
  toZonedDateInput,
  tomorrowAt,
  usableIanaTimeZone,
} from "@/lib/datetime";
import { observationsToHourly } from "@/lib/forecast";
import type { GeoPoint } from "@/lib/geo";
import { parseGpx } from "@/lib/gpx";
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
  current: RouteSummary,
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
): RouteSummary {
  return {
    ...current,
    name: imported.name,
    region: imported.region ?? "Imported route",
    startTime,
    distanceKm: imported.distanceKm,
    elevationGainM: imported.elevationGainM,
    movingHours: imported.movingHours,
    outboundBearingDeg: imported.outboundBearingDeg,
    lat: imported.lat,
    lng: imported.lng,
    timezone: usableIanaTimeZone(imported.timezone) ?? current.timezone,
  };
}

export default function Home() {
  const [route, setRoute] = useState(defaultBriefing.route);
  const [hourly, setHourly] = useState(defaultBriefing.hourly);
  const [track, setTrack] = useState<GeoPoint[] | undefined>(undefined);
  const [dateYmd, setDateYmd] = useState(() =>
    toZonedDateInput(
      tomorrowAt(defaultBriefing.route.startTime, defaultBriefing.route.timezone),
      defaultBriefing.route.timezone,
    ),
  );
  const [timeHm, setTimeHm] = useState(defaultBriefing.route.startTime);
  const [forecastSource, setForecastSource] = useState("Sample forecast");
  const [routeMessage, setRouteMessage] = useState<string | null>(
    "Live Open-Meteo loads for tomorrow’s roll-out.",
  );
  const [busy, setBusy] = useState(false);

  const [riderWeightKg, setRiderWeightKg] = useState(defaultBriefing.rider.weightKg);
  const [bikeWeightKg, setBikeWeightKg] = useState(defaultBriefing.rider.bikeWeightKg);
  const [tireWidthMm, setTireWidthMm] = useState(defaultBriefing.rider.tyreWidthMm);
  const [rimInnerWidthMm, setRimInnerWidthMm] = useState(21);
  const [setup, setSetup] = useState<TireSetup>("tubeless");
  const [isGravel, setIsGravel] = useState(defaultBriefing.route.surface === "gravel");
  const [durationHours, setDurationHours] = useState(defaultBriefing.route.movingHours);
  const [temperatureC, setTemperatureC] = useState(
    Math.round(averageTempC(defaultBriefing.hourly.map((hour) => hour.tempC)) * 10) / 10,
  );
  const [targetWatts, setTargetWatts] = useState(TEMPO_WATTS);
  const [giTolerance, setGiTolerance] = useState(1);
  const briefingRef = useRef<HTMLDivElement>(null);

  const startInstant = useMemo(
    () => fromZonedFields(dateYmd, timeHm, route.timezone),
    [dateYmd, timeHm, route.timezone],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      if (Number.isNaN(startInstant.getTime())) {
        return;
      }

      try {
        const payload = await requestBriefingWeather({
          lat: route.lat,
          lng: route.lng,
          startTime: startInstant,
          movingHours: route.movingHours,
          points: track,
          signal: controller.signal,
        });
        const zone =
          usableIanaTimeZone(payload.location.timezone) ?? route.timezone;
        const nextHourly = observationsToHourly(payload.hours, zone);

        if (!controller.signal.aborted && nextHourly.length > 0) {
          if (zone !== route.timezone) {
            setRoute((current) => ({ ...current, timezone: zone }));
          }
          setHourly(nextHourly);
          setTemperatureC(
            Math.round(averageTempC(nextHourly.map((hour) => hour.tempC)) * 10) / 10,
          );
          setForecastSource("Live Open-Meteo");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setForecastSource("Sample forecast (live lookup failed)");
        setRouteMessage(
          error instanceof Error ? error.message : "Could not load the forecast.",
        );
      }
    }

    void load();

    return () => controller.abort();
  }, [route.lat, route.lng, route.movingHours, route.timezone, startInstant, track]);

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
        sweatRate: defaultBriefing.rider.sweatRate,
      }),
    [durationHours, temperatureC, targetWatts, dewPointC, giTolerance],
  );

  const briefing = useMemo(
    () => ({
      route: {
        ...route,
        startTime: timeHm,
        surface: isGravel ? ("gravel" as const) : ("road" as const),
      },
      hourly,
      rider: defaultBriefing.rider,
    }),
    [route, hourly, isGravel, timeHm],
  );

  const wettestHour = hourly.reduce((wettest, hour) =>
    hour.precipChance > wettest.precipChance ? hour : wettest,
  );
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
      setRoute((current) => applyImportedRoute(current, parsed, timeHm));
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
      setRoute((current) => applyImportedRoute(current, body, timeHm));
      setRouteMessage(`Loaded ${body.name} from Ride with GPS.`);
    } catch (error) {
      setRouteMessage(
        error instanceof Error ? error.message : "Could not import that route.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onReset = () => {
    setTrack(undefined);
    setRoute(defaultBriefing.route);
    setHourly(defaultBriefing.hourly);
    setDurationHours(defaultBriefing.route.movingHours);
    setIsGravel(false);
    setTimeHm(defaultBriefing.route.startTime);
    setDateYmd(
      toZonedDateInput(
        tomorrowAt(defaultBriefing.route.startTime, defaultBriefing.route.timezone),
        defaultBriefing.route.timezone,
      ),
    );
    setRouteMessage("Back to the Winnats Pass sample route.");
  };

  const tabs: BriefingTab[] = [
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
      shortLabel: "Fueling",
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
  ];

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
        route={route}
        dateYmd={dateYmd}
        timeHm={timeHm}
        onDateYmd={setDateYmd}
        onTimeHm={setTimeHm}
        onGpxFile={(file) => void onGpxFile(file)}
        onRouteUrl={(url) => void onRouteUrl(url)}
        onReset={onReset}
        busy={busy}
        message={routeMessage}
      />

      <RouteHeader route={briefing.route} captureRef={briefingRef}>
        <ShareBriefingButton
          targetRef={briefingRef}
          title={briefing.route.name}
          text={`${briefing.route.name} · ${formatNumber(kmToMiles(briefing.route.distanceKm), 1)} mi · ${formatNumber(metresToFeet(briefing.route.elevationGainM))} ft`}
        />
      </RouteHeader>
      <TemperatureBar hourly={hourly} source={forecastSource} />
      <BriefingTabs tabs={tabs} />
      <InstallPanel />

      <footer className="pt-2 text-xs leading-relaxed text-muted">
        Forecast is live Open-Meteo along the route. Tire pressure uses Silca /
        SRAM plus rim and tubeless setup. Fueling follows ACSM/ISSN 30–90 g/hr
        with dew-point sweat and a GI-tolerance slider.
      </footer>
    </main>
  );
}
