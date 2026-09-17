import Image from "next/image";

import { ApparelPanel } from "@/components/apparel-panel";
import { BriefingTabs, type BriefingTab } from "@/components/briefing-tabs";
import { FuelingPanel } from "@/components/fueling-panel";
import { InstallPanel } from "@/components/install-panel";
import { RouteHeader } from "@/components/route-header";
import { TemperatureBar } from "@/components/temperature-bar";
import { TyreWindPanel } from "@/components/tyre-wind-panel";
import { defaultBriefing } from "@/lib/briefing";
import {
  describeWind,
  recommendApparel,
  recommendFueling,
  recommendTyrePressure,
} from "@/lib/recommendations";

export default function Home() {
  // Swap this for the route/forecast API response and the whole briefing
  // follows; nothing below reads anything else.
  const briefing = defaultBriefing;

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
          tyres={recommendTyrePressure(briefing)}
          wind={describeWind(briefing)}
          rider={briefing.rider}
          route={briefing.route}
        />
      ),
    },
    {
      id: "fueling",
      label: "Fueling Targets",
      shortLabel: "Fueling",
      panel: (
        <FuelingPanel
          fueling={recommendFueling(briefing)}
          rider={briefing.rider}
          route={briefing.route}
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
        Every number is derived from the placeholder briefing in{" "}
        <code className="font-mono text-foreground">lib/briefing.ts</code> —
        route, hourly forecast and rider profile — so the UI renders complete
        before any API is connected.
      </footer>
    </main>
  );
}
