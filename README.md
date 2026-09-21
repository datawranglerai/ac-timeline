# The Animus Archive

A single-page Assassin’s Creed timeline built around `data/Assassin's Creed Timeline - Data V3.csv`. A cinematic introduction leads into an interactive historical atlas, with memory details and a chronological archive.

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
- Matched characters appear as portrait markers; shared memories can show a portrait stack. The original symbols remain for characters without artwork.
- Memory details play the corresponding character GIF on demand, with pause/play and a character selector for shared memories. Reduced motion starts with a static poster.
- The **Walk in their footsteps** gallery includes all 24 supplied characters. Cards open a character’s timeline, or an artwork preview marked **No memories yet** when their timeline entries have not been added. Individual character filters and follow actions include memories shared with other characters.
- Character cards show sourced birth/death dates and are ordered by birth, or earliest known presence if birth is undated. **Lifetimes in view** aligns the visible cards on one shared scale, revealing overlaps and gaps as the gallery scrolls. Hover/focus highlights overlapping records; select a lifespan for its sources.
- Switch to the chronological list for an alternative to the chart.
- **Reset view** restores the full date range and retains filters. **Clear filters** retains the date range.
- Empty periods keep the chart, zoom/pan controls, and overview available. **Show matching memories** returns to the records matching your current filters. Fast wheel input is combined and bounded per frame; changing the view, filters, or scale cancels pending gestures.

The **Adaptive** scale gives long, unrecorded gaps a smaller visual footprint. Each gap over 2,000 years occupies the width of 240 ordinary years and is shown with a striped break. It is deliberately not a uniform time axis. **Linear** uses uniform spacing. BCE and CE are adjacent without a historical year zero.

The gallery’s separate lifespan strip uses thin solid lines for dated life and dashed lines for incomplete records or continued consciousness. Unknown endpoints stay open at the last dated evidence; they never become inferred deaths or extend to today. Empty gaps over 2,000 years can be compressed to 120 effective years and are marked with `//`. Physical lifespans themselves are not compressed internally. Approximate dates use `c.`, and Juno’s Isu-calendar birth remains unconverted.

Biography metadata lives in `src/lifespan-data.js`, with source links and notes for every character. It is separate from the event CSV: for example, the Fryes’ speculative 1917 death and Eivor’s speculative 920 death are not treated as confirmed lifespans; Basim’s biography uses the sourced c.844 estimate. These decisions are explained through **About these dates** and the individual source panels. Ubisoft materials and the linked character-reference wikis provide the evidence; unknowns remain unknown.

## Extend the dataset

Append rows to `data/Assassin's Creed Timeline - Data V3.csv`, retaining its header. The shared `DATASET_PATH` in `src/data.js` controls the live app, download link, build, and dataset tests.

```csv
Year,Approx,Era,Real Year,Start,End,Category,Character,Game,Location,Source,Title,Image,Description
```

`Year` is a positive integer and `Era` is `BCE` or `CE`. `Approx` accepts `TRUE` or `FALSE`. The timeline point comes from `Year` and `Era`. If `Era` is blank, a signed `Real Year` with the same magnitude supplies it; this inference is disclosed in the app. An invalid or contradictory fallback never silently replaces an explicit date. `Start` and `End` are preserved and displayed as recorded dates in the details, including signed BCE years; they do not move the year-based point or create duration bars. `Location` appears in details and is searchable. Quote CSV fields containing commas, quotes, or line breaks; double any quote within a quoted field.

Filters, counts, bounds, and compressed gaps update automatically on reload. Optional blank values receive explicit fallbacks. Invalid dates are skipped with a visible warning. Sources are attribution text; URLs are not invented from source labels. `Image` can contain a relative path or an HTTP(S) URL. Add local assets under `images/` or `assets/` so the build includes them.

V3 contains **96 records** across **17 named titles** (including a Watch Dogs entry), with two records lacking a game. The nine Shadows memories cover 1564–1582 CE and include Naoe, Yasuke, and the new Artefacts category. It spans **77,000 BCE–2030 CE**. The Daniel Cross record at 2000 CE has no title and is shown as “Untitled memory.” Eivor’s burial record has a blank Era; the matching signed year supplies 920 CE. The Frye induction record remains plotted at its explicit `Year` of 1868, while its recorded 1860–1868 dates are preserved in the details. The timeline preserves the supplied chronology rather than claiming complete coverage or verifying the underlying lore.

## Build and verify

```sh
npm test
npm run check
npm run build
npm run preview
```

Deploy the contents of `dist/` to any static host. The build includes the authoritative CSV and local assets. When the CSV changes, rebuild before publishing.

Unit tests exercise CSV edge cases, source records, filtering, chronological boundaries, scale inversion, compressed gaps, and viewport bounds. The check command validates JavaScript syntax, local asset references, and HTML IDs. This project uses JavaScript rather than TypeScript and has no runtime dependencies.

An optional Playwright suite checks desktop/mobile layouts, filters, search, zoom, pan, detail dialogs, data failures, and future CSV additions. It also stress-tests thousands of wheel events in adaptive and linear scales, empty-period recovery, input reversals, and interrupted navigation. If Playwright and its Chromium browser are already installed:

```sh
# Keep the development server running in another terminal.
npm run test:browser
```

To reuse a separate Playwright installation, set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path. `BROWSER_EXECUTABLE` can point to an existing Chromium executable; `TEST_BASE_URL` changes the server URL. Playwright is only a verification tool and is not bundled with the app. Screenshots are saved to the ignored `output/` directory.

## Publish with GitHub Pages

The entire app can run on GitHub Pages: JavaScript, CSV data, images, and GIFs are static files. No backend or package installation is required. Relative URLs support both the repository path `/ac-timeline/` and a custom domain.

The [deployment workflow](.github/workflows/pages.yml) runs unit tests, syntax/asset checks, and the production build on pull requests to `main`. Pushes to `main` also publish `dist/` through GitHub Actions. Deployment only runs after the build succeeds; feature branches and pull requests cannot publish. Future CSV, artwork, and code updates deploy through the same workflow.

To activate hosting:

1. Open [Settings → Pages](https://github.com/datawranglerai/ac-timeline/settings/pages) and choose **GitHub Actions** under **Build and deployment → Source**. Public repositories support Pages on GitHub Free; a private repository requires a [supported paid plan](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
2. Merge this workflow and the app into `main`. Follow **Deploy to GitHub Pages** in the repository’s **Actions** tab. To redeploy without a commit, choose **Run workflow** with the `main` branch.

After the first successful deployment, the default public address is **https://datawranglerai.github.io/ac-timeline/**. The workflow also links to the deployed site. `dist/` is generated in Actions and does not need to be committed.

## Project structure

- `index.html` — page structure and accessible controls.
- `src/app.js` — rendering, interactions, grouping, details, and navigation.
- `src/data.js` — CSV ingestion, normalized events, search, and filters.
- `src/characters.js` — explicit character aliases and portrait, GIF, poster, and full-body media paths.
- `src/lifespan-data.js` — sourced biography dates, uncertainty, and continuity notes.
- `src/lifespan-model.js` — chronological ordering, overlap checks, and the shared lifespan scale.
- `src/timeline-model.js` — time scales and viewport math.
- `src/styles.css` — responsive design and visual tokens.
- `DESIGN.md` — maintained product and design decisions.
- `assets/` — insignia, optimized artwork, and [artwork provenance](assets/README.md).
- `assets/avatars/` — preserved uploads plus [prepared character artwork](assets/avatars/README.md).
- `tests/` — unit and optional browser verification.

The app starts at `index.html`. Earlier AmCharts/D3 experiments are preserved in Git history.

Assassin’s Creed belongs to Ubisoft. This is an independent fan project. The hero is the project creator’s PS5 screenshot from Assassin’s Creed Mirage. The discovery cards use their PS5 captures from Valhalla, Mirage, and Shadows; the latter two cards filter the timeline to the corresponding game and historical era. The Kenway memory image is an optimized derivative of an existing repository asset. Google Fonts supplies the display/UI fonts with local system fallbacks if unavailable.
