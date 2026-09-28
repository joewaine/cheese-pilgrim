# Cheese Pilgrim

A European cheese atlas and personal travel journal, built from Joe’s brief and Liam’s supporting TasteAtlas image. Parchment, forest green, traditional map labels, and a slower approach to travel.

Public site: **https://cheesepilgrim.joewaine.com/** — deployed to the existing Hetzner `fractal-1` server. See [deployment instructions](docs/DEPLOYMENT.md).

## Run

The production preview is currently running on the Mac Studio in detached tmux session `cheeze-pikgrim`, port **5173**, at `http://100.108.128.101:5173/` over Tailscale. Inspect it with `tmux capture-pane -pt cheeze-pikgrim`. Use a different port for simultaneous development.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173` on the machine running the server. When accessing the Mac Studio from Joe’s laptop over Tailscale, use `http://100.108.128.101:5173`.

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

The production build is a static site in `dist/`. Fonts, geographic data, photographs, and the sample video are local assets. Browsing the atlas doesn’t require a map API key or third-party requests. Directions and venue links open external websites.

## Included

- 24 cheese regions across 9 countries, 5 verified visitor-venue links, and an official Parmigiano Reggiano dairy directory.
- An interactive geographic map with selection, pan, zoom, search, country filters, bookmarks, and an accessible list view.
- Three suggested trails. Select a consecutive segment, reverse it, or arrange it with a nearest-neighbour geographic heuristic. Campervan/car preference and the selected route persist.
- Bread/cracker pairings and three beverage options for every cheese: wine/cider, tea, and coffee. Pairings are editorial suggestions.
- A fictional couple, Margot & Jules, with three clearly labelled sample journal entries and a captioned, silent 24-second illustrative video.
- Personal tasting notes, ratings, a place/shop field, photographs (12 MB maximum), and videos (60 seconds / 100 MB maximum). Files are checked before saving.
- A printable A5 book in route order, with real QR codes linking to each cheese’s atlas page. Sample notes are excluded unless selected. Users can print a mini-trip by first choosing its consecutive route segment.
- A JSON backup download containing personal notes and base64-encoded media. No import UI yet.

## Boundaries

This version is a functional browser-local prototype. Notes and media live in IndexedDB; routes and bookmarks live in localStorage. There are no accounts, public review submissions, cross-device syncing, accommodation bookings, or shared video storage. Clearing browser data removes local notes. Export a backup to retain them.

QR codes use the site’s current origin. Print public books from `https://cheesepilgrim.joewaine.com/`. Codes made on localhost only work on the same machine; codes made on the Tailscale preview require tailnet access. QR codes open the public cheese description; private journal entries are not embedded in links. Browser journals are scoped to their origin, so notes on the earlier local preview are not automatically transferred to the public site.

Map locations are approximate regional starting points unless a visitor venue is explicitly named. Geography and nearest-neighbour distances are not road navigation or a mathematically optimal trip. Opening hours, travel days, island ferries, campervan access, and producer appointments require verification. The app links to Google Maps for actual directions and to official visitor websites where verified. The Roquefort venue’s campervan restriction is included.

The seed catalog deliberately starts with 24 entries rather than claiming to have researched every cheese in the reference image. Extend `src/data.ts` with researched destinations to grow it.

## Validate

```sh
npm test
npm run build
# With the dev server running:
npm run test:browser
node tests/capture.mjs
```

Core tests verify seed integrity, route ordering, geographic distance, directions, storage recovery, and review IDs. Browser tests exercise filtering, map clicks, bookmark persistence, route slicing/reversing, media duration enforcement, IndexedDB persistence, QR printing, backup media, sample data, mobile navigation, and insecure-HTTP preview compatibility.

Verified on 25 September 2026: **9 core tests and 14 browser checks passed**, with no uncaught page errors. Production build passed. Desktop (1440 px), phone (390 px), and narrow-phone (320 px) views were checked. The three-page A5 print export was rendered and visually inspected, including the saved photograph and QR codes. Printing waits for photographs to decode before opening the print dialog.

The browser scripts use Playwright’s installed Chromium, or an existing macOS headless-shell cache. Set `CHROMIUM_PATH` for another executable and `BASE_URL` for another server. On a clean machine, install the headless browser with `npx playwright install chromium`. No GUI or logged-in browser is required.

## Project structure

- `src/App.tsx`: page composition, planner, review form, journal, print preview.
- `src/AtlasMap.tsx`: Natural Earth map rendering and geographic interaction.
- `src/data.ts`: seed cheese catalog and trails.
- `src/route.ts`: route heuristics, navigation URLs, safe settings reads.
- `src/storage.ts`: IndexedDB and media validation.
- `src/demo.ts`: clearly fictional sample persona and entries.
- `src/Modal.tsx`: native dialog focus management.
- `src/styles.css`: shared design tokens, responsive layouts, print rules.
- `docs/DESIGN.md`: design decisions and reference sources.
- `tests/`: automated checks; screenshots and sample print output go into ignored `test-results/`.

## Next production step

Add authenticated accounts, shared review storage, and media uploads. Keep local export and a migration path for existing browser journals. A real driving/ferry routing service and per-producer research should precede promises of route optimality or a complete 100–300-day itinerary.
