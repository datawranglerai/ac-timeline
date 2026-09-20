# Character artwork

The original `headshots/`, `GIFs/`, and `fullbody/` uploads are preserved.

| Folder | Purpose |
| --- | --- |
| `portraits/` | Consistent 256×256 transparent headshots, edited with the built-in image-generation tool. The app supplies the same dark green backplate for every portrait. See [portrait provenance and prompts](portraits/README.md). |
| `GIFs/` | Original animations, fetched only when their character's memory is opened and animation is enabled. |
| `posters/` | Static WebP first frames for paused clips and reduced-motion preferences. |
| `figures/` | Optimized transparent WebP versions of the full-body uploads, preserving aspect ratio at up to 720px high. |

The figures and posters were exported with local media tools, without generative changes: ffmpeg performed resizing/frame extraction, and cwebp encoded WebP with quality 80 and alpha quality 100. The full-body exports total about 867 KB, compared with 66 MB of originals; the static posters total about 396 KB.

`src/characters.js` maps complete character names and explicit aliases to media. It supports shared memories separated by commas, semicolons, or ampersands. Unknown characters keep the original timeline symbols. The supplied Frye twins portrait/GIF is shared by Jacob and Evie, while their individual full-body images remain separate. Reda and Jupiter have no supplied GIF, so none is invented. All supplied characters appear in the gallery. Characters without current dataset entries are marked “No memories yet” and open a character preview; they become timeline journeys automatically when matching CSV records are added. Connor is displayed by that familiar name while retaining Ratonhnhaké:ton as his canonical identity and matching alias.

To add a character, add their media, prepare a consistent portrait and static poster, and add one mapping with explicit aliases. Media are illustrative portraits of a character, rather than evidence of the specific event date. Rights to the supplied game imagery remain with their respective owners.
