"use client";

import { useRef, useState } from "react";

export function RouteInPanel({
  timezone,
  dateYmd,
  timeHm,
  onDateYmd,
  onTimeHm,
  onGpxFile,
  onRouteUrl,
  onClear,
  busy,
  message,
}: {
  timezone: string;
  dateYmd: string;
  timeHm: string;
  onDateYmd: (value: string) => void;
  onTimeHm: (value: string) => void;
  onGpxFile: (file: File) => void;
  onRouteUrl: (url: string) => void;
  onClear?: () => void;
  busy: boolean;
  message: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6">
      <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-accent">
        Route in
      </h2>
      <p className="mt-2 text-sm text-muted">
        Drop a GPX, or paste a Ride with GPS link. Strava routes need a GPX
        export. Roll-out is {timezone.replace(/_/g, " ")}.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Date
          </span>
          <input
            type="date"
            value={dateYmd}
            onChange={(event) => onDateYmd(event.target.value)}
            className="rounded-xl border border-border-subtle bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Roll-out
          </span>
          <input
            type="time"
            value={timeHm}
            onChange={(event) => onTimeHm(event.target.value)}
            className="rounded-xl border border-border-subtle bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          ref={fileRef}
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onGpxFile(file);
              event.target.value = "";
            }
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          Upload GPX
        </button>
        {onClear ? (
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            Clear
          </button>
        ) : null}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (url.trim()) {
            onRouteUrl(url.trim());
          }
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://ridewithgps.com/routes/…"
          className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
        >
          Load
        </button>
      </form>

      {message ? (
        <p className="mt-3 text-xs leading-relaxed text-muted" role="status">
          {busy ? "Working…" : message}
        </p>
      ) : null}
    </section>
  );
}
