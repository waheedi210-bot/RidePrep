"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { ApparelPanel } from "@/components/apparel-panel";
import { BriefingTabs, type BriefingTab } from "@/components/briefing-tabs";
import { FuelingPanel } from "@/components/fueling-panel";
import { InstallPanel } from "@/components/install-panel";
import { RouteHeader } from "@/components/route-header";
import { TemperatureBar } from "@/components/temperature-bar";
import { TyreWindPanel } from "@/components/tyre-wind-panel";
import { defaultBriefing } from "@/lib/briefing";
import { calculateFueling, calculateTirePressure } from "@/lib/calculations";
import { describeWind, recommendApparel } from "@/lib/recommendations";

const TEMPO_WATTS = 210;

function averageTempC(temps: number[]): number {
  return temps.reduce((total, temp) => total + temp, 0) / temps.length;
}

export default function Home() {
  const briefing = defaultBriefing;
  const forecastTempC = averageTempC(briefing.hourly.map((hour) => hour.tempC));

  const [riderWeightKg, setRiderWeightKg] = useState(briefing.rider.weightKg);
  const [bikeWeightKg, setBikeWeightKg] = useState(briefing.rider.bikeWeightKg);
  const [tireWidthMm, setTireWidthMm] = useState(briefing.rider.tyreWidthMm);
  const [isGravel, setIsGravel] = useState(briefing.route.surface === "gravel");
  const [durationHours, setDurationHours] = useState(briefing.route.movingHours);
  const [temperatureC, setTemperatureC] = useState(
    Math.round(forecastTempC * 10) / 10,
  );
  const [targetWatts, setTargetWatts] = useState(TEMPO_WATTS);

  const pressure = useMemo(
    () =>
      calculateTirePressure({
        riderWeightKg,
        bikeWeightKg,
        tireWidthMm,
        isGravel,
      }),
    [riderWeightKg, bikeWeightKg, tireWidthMm, isGravel],
  );

  const fueling = useMemo(
    () =>
      calculateFueling({
        durationHours,
        temperatureC,
        targetWatts,
      }),
    [durationHours, temperatureC, targetWatts],
  );

  const wettestHour = briefing.hourly.reduce((wettest, hour) =>
    hour.precipChance > wettest.precipChance ? hour : wettest,
  );
  const wetHint =
    wettestHour.precipChance >= 30
      ? `${wettestHour.precipChance}% chance of rain at ${wettestHour.time} — take 4 psi out of each tyre for grip on the descents.`
      : null;

  const tabs: BriefingTab[] = [
    {
      id: "apparel",
      label: "Apparel Layering",
      shortLabel: "Apparel",
      panel: <ApparelPanel advice={recommendApparel(briefing)} />,
    },
    {
      id: "tyres",
      label: "Tire Pressure & Wind",
      shortLabel: "Tires & Wind",
      panel: (
        <TyreWindPanel
          riderWeightKg={riderWeightKg}
          bikeWeightKg={bikeWeightKg}
          tireWidthMm={tireWidthMm}
          isGravel={isGravel}
          onRiderWeightKg={setRiderWeightKg}
          onBikeWeightKg={setBikeWeightKg}
          onTireWidthMm={setTireWidthMm}
          onIsGravel={setIsGravel}
          pressure={pressure}
          wetHint={wetHint}
          wind={describeWind(briefing)}
        />
      ),
    },
    {
      id: "fueling",
      label: "Fueling Targets",
      shortLabel: "Fueling",
      panel: (
        <FuelingPanel
          durationHours={durationHours}
          temperatureC={temperatureC}
          targetWatts={targetWatts}
          onDurationHours={setDurationHours}
          onTemperatureC={setTemperatureC}
          onTargetWatts={setTargetWatts}
          fueling={fueling}
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

      <RouteHeader route={briefing.route} />
      <TemperatureBar hourly={briefing.hourly} />
      <BriefingTabs tabs={tabs} />
      <InstallPanel />

      <footer className="pt-2 text-xs leading-relaxed text-muted">
        Tire pressure and fuelling numbers come from{" "}
        <code className="font-mono text-foreground">lib/calculations.ts</code>{" "}
        as you edit the inputs. The route and forecast still come from{" "}
        <code className="font-mono text-foreground">lib/briefing.ts</code> until
        the weather API is wired in.
      </footer>
    </main>
  );
}
