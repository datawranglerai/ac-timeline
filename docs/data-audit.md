# Dataset audit — 13 November 2026

The live source is [Assassin's Creed Timeline - Data V3.csv](../data/Assassin's%20Creed%20Timeline%20-%20Data%20V3.csv). All 110 original records were reviewed and retained. Sixteen focused additions bring the CSV to 126 records. This is a sourced editorial review, not a claim that every detail has been proved from primary canon.

The [record ledger](../data/audit/records.json) contains each original record, evidence links, findings, confidence, remaining uncertainty, applied field changes and description drafts. Its additions include their selection rationale. Original numbering is one-based, excluding the CSV header; the first 110 positions remain the original records, including duplicate coverage. [Humanized descriptions](data-humanization.md) contains the full final prose and the skill report.

## What changed

- **Dates.** Corrected Basim's birth to c. 844, Desmond's September–December 2012 sequence, and several protagonist and artefact events. Removed invented 1 January values and month/year boundary ranges. Full dates remain only where the linked reference supports a day.
- **Unknown dates.** Added optional `Date Status: Undated` for 16 records. The timeline, list, connected-memory list and detail panel label their numeric years as plotting positions. These include Eivor's burial, the Fryes' deaths and several Isu manufacture claims. An undated placement is different from a genuine approximate date.
- **Lore.** Corrected the Leap of Faith claim, Spear inheritance, Kassandra's family, Edward's acquisition of functioning Hidden Blades, the Staff/Atlantis sequence, the Æsir count and Layla's ending. Kept Reda's supported 38 BCE appearance after an independent reviewer overturned the initial auditor's conclusion.
- **Continuity.** Distinguished Aita's recurring Sages from the Æsir/Loki incarnation method. Labelled Watch Dogs connections as crossover references. Moved the Ankh account from Origins to its graphic-novel source and disclosed its disputed continuity. The Cult of Kosmos is no longer presented as an uncontested direct Templar predecessor.
- **Naming and metadata.** Standardised game/media labels, semicolon-separated people, signed years, categories and source URLs. Moved objects out of character fields. Canonical `Ratonhnhaké:ton` now matches Connor's card and filter; his two original records were present but their parenthesised names failed identity matching.
- **Prose.** Applied humanizer-voice after factual drafting, using the plain, evidence-bounded register in VOICE.md. Most corrected drafts already needed only a light pass. Proper names, accents and uncertainty remain.

The app's count now says “titles” and the filter says “Games & media”, since its retained records include a film, comics and a Watch Dogs reference as well as AC games. Separate lifespan notes were synchronised where they referred to the CSV's old Basim or speculative death dates.

## Focused additions

| Protagonist or thread | Added coverage |
| --- | --- |
| Connor | Kanatahséton fire; Boston Tea Party; Haytham's death; Charles Lee's death |
| Shay | Templar induction; Charles Dorian and the Precursor box |
| Aveline | Brotherhood induction; defeat of the New Orleans Templar cell |
| Adéwalé | Freedom Cry's Maroon-resistance/de Fayet resolution |
| Shao Jun | Return to China; defeat of Zhang Yong |
| Arbaaz Mir | Koh-i-Noor and Precursor-box recovery |
| Nikolai Orelov | Anastasia and the Precursor box |
| Aita's Sages | Juno's method; John Standish; Elijah's identification |

These are 16 events. Roberts and Germain already have relevant records, so they were not duplicated. Kassandra remains the Odyssey story's protagonist for this timeline; player-selectable alternatives are not parallel historical events. This is selected event coverage, not an exhaustive list of protagonists' lives or every released work.

## Evidence limits

Five researchers covered disjoint batches of all 110 original records. A [separate reviewer](data-audit-review.md) challenged the proposed corrections, and integration addressed the resulting findings. Most chronology evidence is maintained fan-reference material, often transcribing or citing games. Some records also have Ubisoft pages, reference guides or game-memory transcripts. A wiki link is identified as a secondary source; it is not relabelled as a publisher statement.

The two lowest-confidence original records are the Eris/Trojan War attribution and the date of Pythagoras receiving the Staff. Both are retained with qualified descriptions and undated plotting positions. The Ankh account has a separate continuity caveat. Atlantis timing and parts of Shadows' quest order remain approximate where references disagree. The Shroud retrieval's 25 October 2015 date has secondary corroboration through Isabelle Ardant's reference entry; no Ubisoft-hosted mission page was retrieved.

No conventional death year is asserted for Eivor or the Frye twins. Duplicate Altaïr death coverage remains because the task prohibited removing records. Sources can still be wrong or change; the ledger makes a subsequent correction traceable. The tests establish data and UI behaviour, not whether a fictional claim is canonical.

## Reddit findings

The strongest observed trigger is an overclaim that readers can quickly disprove: “complete”, “definitive”, exact dates without evidence, disputed canon treated as settled, missing major protagonists or a site that breaks on a phone. A [corrected game timeline](https://www.reddit.com/r/assassinscreed/comments/xicezg) acknowledges extensive corrections, while a [cross-media timeline discussion](https://www.reddit.com/r/assassinscreed/comments/1qzjadv/assassins_creed_crossmedia_timeline_redesigned/) examines placement, omissions and Watch Dogs canon. These are examples of engagement, not a prediction of how all Redditors will respond.

Two other website examples came from the similarly named **r/assasinscreed**, rather than the intended **r/assassinscreed**: a [protagonist website](https://www.reddit.com/r/assasinscreed/comments/1v3vgr3/i_created_a_website_for_the_assassins_creed/) and a [chronological guide](https://www.reddit.com/r/assasinscreed/comments/1vz4cs0/i_built_a_chronological_assassins_creed_guide/). They show that mobile behaviour, missing protagonists, links and the ordering rule receive scrutiny, but should not be treated as evidence of the main subreddit's moderation policy.

The main subreddit's [current rules](https://www.reddit.com/r/assassinscreed/wiki/rules/) require meaningful relevant contributions, accurate titles, appropriate flair and participation beyond promotion. They also ban AI-generated content and require spoiler warnings in titles where applicable. The rules do not explicitly settle whether coding-agent assistance to an external hobby app is allowed. Moderator clarification is therefore an unresolved release question. No post or moderator message was sent.

For a future post, state the actual scope and ordering rule, disclose spoilers, and invite specific sourced corrections. Do not describe this review as proof of an infallible timeline. If describing authorship, distinguish the personally curated initial dataset from subsequent agent-assisted coding and factual review. Write the submission yourself and check the current rules again before posting; this report is not submission copy.

There is also a concrete mismatch to resolve in release wording: the About panel currently includes a **Buy me a coffee** link. Optional donations may be compatible with your intent, but readers may challenge an unqualified “no commercial gain” claim when that button is present. It was left untouched because this task focused on the dataset.

## Validation

- Regression tests account for every original record, reconstruct its corrected row from the ledger, and match every addition to the CSV.
- Data checks cover required metadata, canonical known identities, delimiters, signed years, full-date syntax/calendar validity, source URLs and text hygiene.
- Unit tests, repository static checks and build passed.
- A dependency-free Chromium smoke test checked all 126 loaded records, Connor's seven-memory journey, explicit undated labels, desktop/mobile overflow and page exceptions.
- The broader Playwright suite was updated to derive counts from the dataset, but could not be executed because Playwright is not installed. No dependency was added.

Run `npm test`, `npm run check` and `npm run build`. The optional `node tests/dataset.browser.mjs` smoke test needs Node 22+ and a Chromium executable; set `BROWSER_EXECUTABLE` if the cached macOS binary is unavailable. Deployment and Reddit publication were not part of this task.
