# Normalized timeline portraits

These 23 avatars are non-destructive derivatives of the supplied files in
`../headshots/`. The originals remain unchanged. Each derivative is a 256 × 256
RGBA PNG with genuinely transparent background pixels, prepared for small
display on the timeline's `#17201c` avatar backplate.

## Production mode

The portraits were edited with Codex's built-in `image_gen` image-editing tool
in `background-extraction` mode, then resized to the final 256 × 256 dimensions
with macOS `sips`. The generated high-resolution files remain in Codex's
generated-images store; the project copies in this folder are the app-ready
assets.

## Source-to-output mapping

Every source maps directly by stem:

| Source | Output |
| --- | --- |
| `../headshots/aiden.png` | `aiden.png` |
| `../headshots/almualim.png` | `almualim.png` |
| `../headshots/altair.png` | `altair.png` |
| `../headshots/arno.png` | `arno.png` |
| `../headshots/aya.png` | `aya.png` |
| `../headshots/basim.png` | `basim.png` |
| `../headshots/bayek.png` | `bayek.png` |
| `../headshots/connor.png` | `connor.png` |
| `../headshots/desmond.png` | `desmond.png` |
| `../headshots/edward.png` | `edward.png` |
| `../headshots/eivor.png` | `eivor.png` |
| `../headshots/ezio.png` | `ezio.png` |
| `../headshots/fryetwins.png` | `fryetwins.png` |
| `../headshots/haytham.png` | `haytham.png` |
| `../headshots/hytham.png` | `hytham.png` |
| `../headshots/juno.png` | `juno.png` |
| `../headshots/jupiter.png` | `jupiter.png` |
| `../headshots/kassandra.png` | `kassandra.png` |
| `../headshots/layla.png` | `layla.png` |
| `../headshots/minerva.png` | `minerva.png` |
| `../headshots/naoe.png` | `naoe.png` |
| `../headshots/reda.png` | `reda.png` |
| `../headshots/yasuke.png` | `yasuke.png` |

## Common edit prompt

> Edit the supplied character portrait into a clean consistent avatar. Cutout
> and framing edit, not a new illustration. Preserve identity, age, facial
> features, expression, hair, beard or hood, clothes and original rendering.
> Remove the background to true transparency. Square centered head and upper
> shoulders, full top of head or hood with small margin, eyes about 42% down,
> face/head about 70% of height. Clean edges with no halo or colored background.
> No text, badges, borders, symbols or objects. Transparent PNG. The tiny avatar
> will be shown on a `#17201c` UI background.

## Asset-specific constraints

- `fryetwins`: preserve both Jacob and Evie together, balanced and recognizable.
- `juno`, `jupiter`, `minerva`: preserve the supplied holographic color, glow,
  scanline character and Isu styling against transparency.
- `eivor`: preserve the supplied female Eivor, braided hair, eye paint and fur.
- `kassandra`, `yasuke`: exclude source weapon shafts from the avatar crop.
- `layla`: remove the cigarette and smoke while preserving her expression.
- `ezio`: uses the approved earlier built-in edit supplied for this batch.
