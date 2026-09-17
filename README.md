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
| `npm run icons`     | Re-renders the PNG icons and favicon from the SVG sources   |

## The briefing page

`app/page.tsx` is a single mobile-first column, capped at `max-w-xl`, on a
`#0f172a` background with `#fc4c02` accents. Top to bottom:

1. **Route header** — name, region, distance in km and mi, elevation gain in m
   and ft, and moving time with an average speed.
2. **Temperature bar** — a CSS gradient interpolated through a cold-to-hot
   colour scale from each hour's air temperature, with the hourly values below
   it and the largest wind-chill delta called out.
3. **Three tabs** — apparel layering, tyre pressure and wind, and fuelling
   targets. Full labels at `sm` and up, short ones below that so three tabs fit
   a 320 px screen. Arrow keys, Home and End move between them, with a roving
   `tabindex` and the usual `role="tablist"` wiring.

### Where the numbers come from

`lib/briefing.ts` holds the types and one `defaultBriefing` object — route,
seven hours of forecast, and a rider profile. It stands in for the route and
forecast APIs, and it is the only thing `app/page.tsx` reads:

```ts
const briefing = defaultBriefing;
```

`lib/recommendations.ts` turns that into everything on screen, so the numbers
move when the data does rather than being typed into the markup:

| Function | Derives |
| --- | --- |
| `recommendApparel` | Jersey, base layer and vest from the coldest feels-like and the peak wind, plus the hour to start shedding |
| `recommendTyrePressure` | Front and rear psi (and bar) for roughly equal tyre drop, from system weight, tyre width and surface |
| `describeWind` | Vector-averaged wind direction, gusts, and whether each leg is a head, cross or tailwind |
| `recommendFueling` | Carbs/hr and fluid/hr from intensity, duration and average temperature, plus ride totals and bottle count |

Tyre pressure is calibrated against modern road recommendations rather than
Berto's charts, which run high for today's wider tyres. The wind panel's
compass is a hand-drawn SVG: the orange vector points where the wind is
pushing, and the dashed line is the route's outbound heading, which is what
makes the head/tailwind split legible.

To connect a real API, fetch into the `Briefing` shape and replace that one
assignment. Nothing else in the page reads anything else.

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
