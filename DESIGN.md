# Design

## Source of truth
Status: Active. Date: 2026-09-19. Surface: single-page Animus timeline and memory archive. Current data: `data/Assassin's Creed Timeline - Data V3.csv` (96 records, including nine from Assassin’s Creed Shadows). Evidence: the implemented page, original HTML/AmCharts/D3 experiments, local artwork, and desktop/mobile browser baselines.

## Brand
The Animus Archive: a cinematic, considered historical field guide. Ink, antique gold, editorial serif headlines, restrained technical annotations. Trust comes from showing source labels, approximate dates, dataset limits, and explicit time compression. Avoid neon dashboards, excessive effects, and invented lore.

## Product goals
Make all supplied memories explorable, including the distant Isu era. Enable era navigation, continuous pan/zoom, game/category/character filters, search, and readable event details. Newly appended CSV records should appear without code changes. This is a fan-made dataset explorer, not an assertion that the supplied data already covers every game or event.

## Personas and jobs
Fans browse connections between games; lore enthusiasts locate characters and artifacts; the dataset owner adds new records. Desktop supports broad exploration; mobile supports focused browsing and details.

## Information architecture
One page: primary navigation, cinematic introduction, era navigation, filter toolbar, timeline/chronological-list switch, overview navigator, curated entry points, footer. Memory details use an accessible modal drawer that leaves the selected timeline point exposed. An About dialog explains sources and the scale.

## Design principles
History before interface chrome. Show the whole story, then reveal detail as users zoom. A segmented overview compresses empty centuries and gives populated periods room; a labeled linear alternative and real date labels preserve clarity. Never silently correct source dates or invent missing titles.

## Visual language
Background #111715, panel #18201d, warm text #edece4, muted text #a0aaa1, gold #c6ac79. Era colors: gold, sage, blue-gray, terracotta, muted violet, warm gray. Serif display type with clean sans UI and monospaced dates. Spacious 8px rhythm, fine rules, small radii, quiet hover states. Cinematic historical hero art is decorative, never evidence. SVG icons and plotting primitives are local assets/code.

## Components
Shared buttons, segmented controls, filter popovers with native checkbox/select affordances, event markers, lane labels, memory drawer, chronology cards, era buttons, and overview brush. CSS custom properties own tokens. Data metadata generates filter options and counts.

## Accessibility
Target WCAG 2.2 AA: visible focus, labeled controls, keyboard equivalents for pan/zoom, touch targets, semantic buttons, dialogs with focus restoration, polite status announcements, reduced-motion support, and a chronological list alternative. No essential hover-only information; color always has a text equivalent.

## Responsive behavior
At <=1000px tighten margins and hero; at <=700px stack hero metadata, simplify navigation, wrap filter controls, retain a scrollable era strip, and use a compact timeline with optional chronology view. The page must not overflow horizontally. Contextual memory panels occupy the side opposite the selected point; below 900px they occupy the space above or below it and scroll internally.

## Interaction states
Initial loading and fetch/parse errors are explicit with retry. Only a search/filter with no matching records uses the full no-match state. An empty date window retains the chart's geometry, axes, overview, and all navigation controls, with a quiet overlay offering to fit matching memories without clearing filters. Fast wheel input is accumulated and bounded per animation frame; reversals cancel and discrete navigation changes discard pending gestures. Interrupted drags release pointer capture. Selected filters show counts. Zoom is clamped; buttons disable at limits. Details preserve approximate dates, blank fields, and source labels. Opening a timeline memory or group dims the surrounding page but leaves a soft, unblurred spotlight on the actual selected marker, with a slow white pulse. Reduced motion keeps a steady glow. Paging memories updates the spotlight when the corresponding point is visible; closing removes it and restores focus. List-only memories use the standard drawer. Network is required only for initial local file loads; fonts have system fallbacks.

## Content voice
Inviting, succinct, lore-aware. Use “memories” for records, while explaining the dataset plainly. “All eras”, “Explore this era”, and “Reset view” are direct actions. Display BCE/CE explicitly and c. for approximate years. No false real-time connection or invented system status.

## Implementation constraints
Dependency-free browser ES modules, HTML, CSS, and SVG; Node built-ins for local development/build/testing. This matches the existing static repository and permits static hosting without a chart license or CDN runtime. Source CSV remains authoritative; a shared dataset path keeps runtime, downloads, build, and tests aligned. Points use Year/Era; a missing Era may be recovered from a matching signed Real Year with visible disclosure. Location and recorded Start/End fields remain available in details and search without changing the point-based chart. Test CSV parsing, date conversion, filtering, scale invertibility, zoom bounds, and real-data loading. Verify browser interactions at desktop/mobile sizes, keyboard access, and console errors.

## Open questions
- [ ] Dataset owner: supply a title for the blank Daniel Cross record at 2000 CE. Use a transparent untitled fallback.
- [ ] Dataset owner: expand the CSV as further game/event coverage becomes available; the app makes no completeness claim.
