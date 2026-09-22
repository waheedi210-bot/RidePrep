import type { ReactNode } from "react";

import type { RouteSummary } from "@/lib/briefing";
import { SURFACE_LABELS } from "@/lib/briefing";
import { formatDuration, formatNumber, kmToMiles, kphToMph, metresToFeet } from "@/lib/units";

export function RouteHeader({
  route,
  children,
}: {
  route: RouteSummary;
  children?: ReactNode;
}) {
  const distanceMi = kmToMiles(route.distanceKm);
  const elevationFt = metresToFeet(route.elevationGainM);
  const avgMph = kphToMph(route.distanceKm / route.movingHours);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
      />

      <div className="bg-surface p-5 sm:p-6">
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
              {formatNumber(distanceMi, 1)}
              <span className="ml-1 text-xs font-medium text-muted">mi</span>
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
              Elevation
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
              {formatNumber(elevationFt)}
              <span className="ml-1 text-xs font-medium text-muted">ft</span>
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
              {formatNumber(avgMph, 1)} mph avg
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
