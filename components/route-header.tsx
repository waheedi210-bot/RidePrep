import type { ReactNode, Ref } from "react";

import type { RouteSummary } from "@/lib/briefing";
import { SURFACE_LABELS } from "@/lib/briefing";
import { formatDuration, formatNumber, kmToMiles, metresToFeet } from "@/lib/units";

export function RouteHeader({
  route,
  captureRef,
  children,
}: {
  route: RouteSummary;
  captureRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
      />

      <div ref={captureRef} className="bg-surface p-5 sm:p-6">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-accent">
          Pre-ride briefing · {route.startTime} roll-out
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
          {route.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {route.region} · {SURFACE_LABELS[route.surface]}
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4">
          <div>
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
              Distance
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
              {formatNumber(route.distanceKm, 1)}
              <span className="ml-1 text-xs font-medium text-muted">km</span>
            </dd>
            <dd className="text-xs tabular-nums text-muted">
              {formatNumber(kmToMiles(route.distanceKm), 1)} mi
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
              Elevation
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
              {formatNumber(route.elevationGainM)}
              <span className="ml-1 text-xs font-medium text-muted">m</span>
            </dd>
            <dd className="text-xs tabular-nums text-muted">
              {formatNumber(metresToFeet(route.elevationGainM))} ft
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
              Moving
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
              {formatDuration(route.movingHours)}
            </dd>
            <dd className="text-xs tabular-nums text-muted">
              {formatNumber(route.distanceKm / route.movingHours, 1)} km/h avg
            </dd>
          </div>
        </dl>
      </div>

      {children ? (
        <div className="border-t border-border-subtle px-5 py-4 sm:px-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}
