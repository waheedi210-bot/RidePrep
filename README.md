# RidePrep

A Next.js App Router starter, in TypeScript and Tailwind CSS, configured as an
installable Progressive Web App with [`@ducanh2912/next-pwa`][next-pwa].

Everything visible — copy, icons, manifest strings — is placeholder content.
The PWA plumbing underneath it is real.

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

Then open `http://localhost:3000`. The panel on the home page reports the
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
