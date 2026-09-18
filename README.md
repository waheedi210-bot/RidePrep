# RidePrep

A mobile-first pre-ride briefing, built on the Next.js App Router in TypeScript
and Tailwind CSS, and installable as a Progressive Web App with
[`@ducanh2912/next-pwa`][next-pwa].

The route, forecast and rider profile are placeholder data. The PWA plumbing
and the recommendation logic that reads that data are real.

## Stack

| Piece            | Version                                  |
| ---------------- | ---------------------------------------- |
| Next.js          | 16 (App Router)                          |
| React            | 19                                       |
| Tailwind CSS     | 4 (via `@tailwindcss/postcss`)           |
| Service worker   | `@ducanh2912/next-pwa` 10 (Workbox 7)    |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

The service worker is **disabled in development**. Workbox precaches build
output, so a live service worker in `next dev` would keep serving stale assets
instead of your edits. To exercise the installable app, run a production build:

```bash
npm run build
npm start
```

Then open `http://localhost:3000`. The panel below the briefing reports the
current display mode, service worker state and network status, and offers an
**Add to Home Screen** button on browsers that support the install prompt.

### Scripts

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Dev server on Turbopack, service worker off               |
| `npm run build`     | Production build on webpack, emits `public/sw.js`          |
| `npm start`         | Serves the production build                                |
| `npm run lint`      | ESLint (`eslint-config-next`)                              |
| `npm run typecheck` | Generates route types, then `tsc --noEmit`                 |
| `npm test`          | Node's test runner against weather, wind-chill and ride calculators |
| `npm run icons`     | Re-renders the PNG icons and favicon from the SVG sources   |

## The briefing page

`app/page.tsx` is a single mobile-first column, capped at `max-w-xl`, on a
`#0f172a` background with `#fc4c02` accents. Top to bottom:

1. **Route header** — name, region, distance in km and mi, elevation gain in m
   and ft, and moving time with an average speed.
2. **Temperature bar** — a CSS gradient interpolated through a cold-to-hot
   colour scale from each hour's air temperature, with the hourly values below
   it and the largest wind-chill delta called out.
3. **Four tabs** — apparel layering, tyre pressure, wind, and fuelling.
   Full labels at `sm` and up, short ones below that so four tabs fit a 320 px
   screen. Arrow keys, Home and End move between them, with a roving
   `tabindex` and the usual `role="tablist"` wiring.

Above the route card, **Route in** takes a GPX upload or a Ride with GPS
link, plus a roll-out date and time. The temperature bar then loads a live
[Open-Meteo](https://open-meteo.com) forecast for that start. Strava route
URLs cannot be fetched without a login — export GPX from Strava and drop the
file instead.

The route header card has a **Share Briefing to Group Chat** button. It runs
`toPng` from `html-to-image` (`cacheBust: true`, `pixelRatio: 2`) against a
`useRef` on the card body, then offers the PNG through `navigator.share` /
`navigator.canShare({ files })` on mobile. Desktop browsers that cannot share
files get the image (or the page URL) on the clipboard and a toast:
"Briefing copied to clipboard!".

### Where the numbers come from

`lib/briefing.ts` holds the types and one `defaultBriefing` object — the
Winnats Pass Loop geometry and rider profile. The hourly series is replaced
on the client by `GET /api/weather` (or `POST` with sampled track points when
the GPX spans more than 25 km).

```ts
const briefing = defaultBriefing;
```

`lib/recommendations.ts` turns the forecast into apparel and the Wind tab, and
`lib/calculations.ts` is what the Tire Pressure and Fueling tabs call as you
edit the inputs:

```ts
const pressure = calculateTirePressure({
  riderWeightKg,
  bikeWeightKg,
  tireWidthMm,
  isGravel,
});
const fueling = calculateFueling({
  durationHours,
  temperatureC,
  targetWatts,
});
```

| Function | Derives |
| --- | --- |
| `recommendApparel` | Jersey, base layer and vest from the coldest feels-like and the peak wind, plus the hour to start shedding |
| `calculateTirePressure` | Front and rear psi at a 40/60 load split, Silca / SRAM equal-drop model (gravel drops another 25 %) |
| `describeWind` | Vector-averaged wind direction, gusts, and whether each leg is a head, cross or tailwind |
| `calculateFueling` | Carbs/hr (30–90 g from target watts) and fluid ml/hr (scaled by temperature and power) |

The tyre model is calibrated so 70 kg rider + 8 kg bike on 28 mm road tyres
lands at 49 / 73 psi — Silca's published rear figure at that system weight,
with the front at two-thirds because it carries 40 % of the load. The wind
panel's compass is a hand-drawn SVG: the orange vector points where the wind is
pushing, and the dashed line is the route's outbound heading.

To connect a real forecast API, fetch into the `Briefing` shape and replace
that assignment. Tire pressure and fuelling already recompute from the tab
inputs through `lib/calculations.ts`.

## Weather API

`GET /api/weather` is a thin App Router route that proxies
[Open-Meteo](https://api.open-meteo.com/v1/forecast) and adds a wind-chill
calculation the briefing can consume later.

| Query        | Required | Notes                                                                 |
| ------------ | -------- | --------------------------------------------------------------------- |
| `lat`        | yes      | WGS84 latitude, −90 to 90                                             |
| `lng`        | yes      | WGS84 longitude, −180 to 180                                          |
| `startTime`  | no       | ISO 8601 instant. Timezone-naive values are treated as UTC. Defaults to now. |
| `hours`      | no       | 1–12 hourly slots. Defaults to 4.                                     |

```bash
curl "http://localhost:3000/api/weather?lat=53.35&lng=-1.82&startTime=2026-09-18T06:30:00Z"
```

The handler asks Open-Meteo for `temperature_2m`, `relative_humidity_2m`,
`apparent_temperature`, `dew_point_2m`, `precipitation_probability`,
`wind_speed_10m`, `wind_gusts_10m`, `wind_direction_10m` and `uv_index`.

- `current` — the observation Open-Meteo stamped "now"
- `hours` — hourly slots beginning at the hour that contains `startTime` (so a
  06:30 roll-out includes 06:00). Pass `hours` to cover the ride.

Each observation carries Open-Meteo's Steadman `apparentTemperatureC` plus
`windChillC` from the NWS metric formula (valid at ≤ 10 °C and ≥ 4.8 km/h).
`apparentWindChillC` is the colder of the two — how cold exposed skin feels —
and `windChillDeltaC` is the degrees that takes off the air temperature.

Bad `lat` / `lng` / `startTime` values collect into a 400 with an `issues`
array rather than failing on the first one. A `startTime` past the forecast
window is also a 400 (`START_OUT_OF_RANGE`). Open-Meteo timeouts are 504;
any other upstream failure is 502. Query parsing and the wind-chill formula
are covered by `npm test` without hitting the network.

## How the PWA is wired up

### `next.config.mjs`

`withPWAInit` returns a wrapper that is applied to the Next config, rather than
being merged into it:

```js
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/~offline" },
  /* ... */
});

export default withPWA(nextConfig);
```

`disable` is the switch that keeps the service worker out of `next dev`, and
`fallbacks.document` points at `app/~offline/page.tsx`, which is shown when a
navigation misses both the cache and the network.

### Why `next build --webpack`

`@ducanh2912/next-pwa` generates the service worker through
`workbox-webpack-plugin`, so it needs the webpack bundler. Next.js 16 defaults
to Turbopack, which ignores webpack plugins — hence `next build --webpack` in
the `build` script. `next dev` keeps the (faster) Turbopack default, which is
safe because the plugin is disabled in development anyway; the explicit
`--turbopack` flag on `dev` just silences Next's "webpack config with Turbopack"
warning.

### `public/manifest.json`

Hand-written rather than generated, so it stays easy to inspect:

- `"display": "standalone"` with a `display_override` of
  `["standalone", "minimal-ui"]`
- `theme_color` and `background_color` of `#0f172a`, matching the `themeColor`
  in the `viewport` export
- `start_url` and `scope` of `/`, plus an explicit `id`
- `any` icons at 96/192/384/512 and `maskable` icons at 192/512, all PNG —
  Chrome's manifest icon loader does not fetch SVG, so the SVG is referenced
  from `metadata.icons` as a favicon only

Not included: a `screenshots` array. Adding one (with both a `wide` and a
narrow `form_factor`) is what unlocks Chrome's richer install dialog, and
DevTools will nudge you about it until you supply real app screenshots.

### `app/layout.tsx`

The `metadata` export links the manifest, declares the icon set including the
Apple touch icon, and sets `appleWebApp` so iOS launches the app without browser
chrome. The separate `viewport` export carries `themeColor: "#0f172a"` and
`viewportFit: "cover"`, which lets content extend under the notch —
`.safe-area` in `app/globals.css` pays the insets back.

## Installing on a device

The install prompt requires HTTPS (or `localhost`) and an active service worker,
so test against `npm start` or a deployed build.

- **Android / Chromium** — the home page's **Add to Home Screen** button fires
  the `beforeinstallprompt` flow. The browser menu offers the same thing.
- **iOS / iPadOS Safari** — there is no install API; tap **Share → Add to Home
  Screen**. The home page detects Apple mobile browsers and shows those steps.

## Replacing the placeholder icons

`public/icons/icon.svg` and `public/icons/icon-maskable.svg` are the sources;
every PNG and `app/favicon.ico` are rendered from them.

```bash
npm run icons
```

The maskable source keeps its artwork at 75% scale so it survives Android's
circular and squircle masks. If you swap in your own artwork, keep that safe
zone and keep the background full-bleed and opaque.

## Generated files

`next build` writes the Workbox output into `public/` — `sw.js`,
`workbox-*.js`, `swe-worker-*.js` and `fallback-*.js`. These are build
artifacts and are git-ignored.

[next-pwa]: https://github.com/DuCanhGH/next-pwa
