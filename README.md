# The Animus Archive

A single-page Assassin’s Creed timeline built around `data/Assassin's Creed Timeline - Data V2.csv`. A cinematic introduction leads into an interactive historical atlas, with memory details and a chronological archive.

## Run locally

Requires Node.js 20 or newer. No package installation is necessary.

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. Reload after editing the code or CSV. To use another port, run `npm run dev -- --port 5174`. Serve over HTTP; opening `index.html` as a local file will block module/CSV loading in most browsers.

## Explore

- Drag to pan; scroll, use the zoom buttons, or press **+ / −** while the chart is focused.
- Use **← / →** to pan and **Home** to reset the focused chart.
- Jump between eras or adjust either handle in the overview navigator.
- Combine game, category, and character filters. Search includes titles, descriptions, characters, games, locations, and sources; **/** focuses search.
- Select a memory for its description, date, character, game, location, recorded start/end dates, and source. Numbered groups open all their memories and offer a closer view.
- Switch to the chronological list for an alternative to the chart.
- **Reset view** restores the full date range and retains filters. **Clear filters** retains the date range.

The **Adaptive** scale gives long, unrecorded gaps a smaller visual footprint. Each gap over 2,000 years occupies the width of 240 ordinary years and is shown with a striped break. It is deliberately not a uniform time axis. **Linear** uses uniform spacing. BCE and CE are adjacent without a historical year zero.

## Extend the dataset

Append rows to `data/Assassin's Creed Timeline - Data V2.csv`, retaining its header. The shared `DATASET_PATH` in `src/data.js` controls the live app, download link, build, and dataset tests.

```csv
Year,Approx,Era,Real Year,Start,End,Category,Character,Game,Location,Source,Title,Image,Description
```

`Year` is a positive integer and `Era` is `BCE` or `CE`. `Approx` accepts `TRUE` or `FALSE`. The timeline point comes from `Year` and `Era`. If `Era` is blank, a signed `Real Year` with the same magnitude supplies it; this inference is disclosed in the app. An invalid or contradictory fallback never silently replaces an explicit date. `Start` and `End` are preserved and displayed as recorded dates in the details, including signed BCE years; they do not move the year-based point or create duration bars. `Location` appears in details and is searchable. Quote CSV fields containing commas, quotes, or line breaks; double any quote within a quoted field.

Filters, counts, bounds, and compressed gaps update automatically on reload. Optional blank values receive explicit fallbacks. Invalid dates are skipped with a visible warning. Sources are attribution text; URLs are not invented from source labels. `Image` can contain a relative path or an HTTP(S) URL. Add local assets under `images/` or `assets/` so the build includes them.

V2 contains **87 records** across **16 named titles** (including a Watch Dogs entry), with two records lacking a game. It spans **77,000 BCE–2030 CE**. The Daniel Cross record at 2000 CE has no title and is shown as “Untitled memory.” Eivor’s burial record has a blank Era; the matching signed year supplies 920 CE. The Frye induction record remains plotted at its explicit `Year` of 1868, while its recorded 1860–1868 dates are preserved in the details. The timeline preserves the supplied chronology rather than claiming complete coverage or verifying the underlying lore.

## Build and verify

```sh
npm test
npm run check
npm run build
npm run preview
```

Deploy the contents of `dist/` to any static host. The build includes the authoritative CSV and local assets. When the CSV changes, rebuild before publishing.

Unit tests exercise CSV edge cases, source records, filtering, chronological boundaries, scale inversion, compressed gaps, and viewport bounds. The check command validates JavaScript syntax, local asset references, and HTML IDs. This project uses JavaScript rather than TypeScript and has no runtime dependencies.

An optional Playwright suite checks desktop/mobile layouts, filters, search, zoom, pan, detail dialogs, data failures, and future CSV additions. If Playwright and its Chromium browser are already installed:

```sh
# Keep the development server running in another terminal.
npm run test:browser
```

To reuse a separate Playwright installation, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path. `BROWSER_EXECUTABLE` can point to an existing Chromium executable; `TEST_BASE_URL` changes the server URL. Playwright is only a verification tool and is not bundled with the app. Screenshots are saved to the ignored `output/` directory.

## Project structure

- `index.html` — page structure and accessible controls.
- `src/app.js` — rendering, interactions, grouping, details, and navigation.
- `src/data.js` — CSV ingestion, normalized events, search, and filters.
- `src/timeline-model.js` — time scales and viewport math.
- `src/styles.css` — responsive design and visual tokens.
- `DESIGN.md` — maintained product and design decisions.
- `assets/` — insignia, optimized artwork, and [artwork provenance](assets/README.md).
- `tests/` — unit and optional browser verification.

Earlier AmCharts/D3 experiments remain in their original files. The new app starts at `index.html`.

Assassin’s Creed belongs to Ubisoft. This is an independent fan project. The Florence illustration was created with the built-in image-generation tool; the Kenway image is an optimized derivative of an existing repository asset. Google Fonts supplies the display/UI fonts with local system fallbacks if unavailable.
