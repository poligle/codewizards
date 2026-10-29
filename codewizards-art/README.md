# codewizards-art · Phase 1, GBC style

Pixel art painted pixel by pixel by code (no generative image models) and retouchable by hand.

## Layout
- `01_tiles/floor/`: 6 floor diamonds (16 × 8): base, plain and 4 variations.
- `01_tiles/wall/`: 2-tile wall pieces with coping (`_L` left wall, `_R` right wall) in 4 variants, corners and cut ends.
- `01_tiles/props/`: door (closed, opening and closing sheets), gothic window and its light, bookshelves L and R, the long alchemy table, the wall blackboard, benches, the health orb's pedestal, cauldron, barrel, crate, chest, globe, plant, floor candelabrum, torches and flame, carpet and `banners/`.
- `05_ui/`: the CODEWIZARDS logo, the scrolls' paper rolls (horizontal ends and middle, and upright for the spell book), parchment tile, paper edges (nine-slice), `icons/` (8 × 8) and the cursors (wand and text). The room draws them all at its own pixel size.
- `01_tiles/Room_Base_01.png`: the room already composed (208 × 152).
- `02_characters/<rank>/`: one sheet per rank (`apprentice`, `young_mage`, `grand_sage`: 16 × 24; `archmage`: 16 × 32) and pose (idle, walk, work, read, write, present, confused, celebrate, sit; the Archmage, idle and work); rows = directions S, SE, E, NE, N, NW, W, SW; 4 frames. Drawn in the Anthropic palette: load `palettes/gbc_gremio_<guild>.gpl` for any other guild, `unknown` included.
- `03_effects/`: torch halo, orb glow (masks the engine tints) and a 3 × 5 pixel font.
- `palettes/`: `gbc_escenario.gpl` and `gbc_gremio_<guild>.gpl` (load them in Aseprite).
- `meta.json`: size, frames, milliseconds, palette and anchor of every asset.
- `preview/`: HTML demo with the CRT toggle.
- `04_source/gen/`: generator (`gbc.py`, `build.py`, with the helpers `core.py` and `font.py`), validator (`check.py`, which also fails on files missing from `meta.json`) and the demo template.

The first round, in SNES style, was retired in v1.1 (the removal reached git in v1.2); it lives in tag `v1.0` under `codewizards-art/legacy/snes-ronda1/`.

The room uses this art through `apps/room/build.py`, which exports it to `apps/room/src/assets.gen.js` with the contract's guild ids (`google` uses the `gemini` palette until step 6 renames it).

## Style rules
| Rule | Value |
| --- | --- |
| Tile | 16 × 8 px, 2:1 isometric; 8 px per height unit |
| Room | 12 × 12 tiles; 40 px walls; 208 × 152 canvas, origin (104, 46) |
| Colour | RGB555 (channels are multiples of 8) |
| Background | 8 palettes of 4 colours sharing the darkest one (25 colours) |
| Wizards and banners | 16 × 24 px; 2 palettes of 3: guild (light, base, dark) + common (beard, nose, staff) |
| Alpha | 1 bit; halos, orbs and window light are blended by the engine |

## For the engine
- Projection: `sx = (x - y) * 8`, `sy = (x + y) * 4 - z`, with x, y in tiles and z in px.
- Anchor: the PNG pixel that matches the world point given in the `nota` field of `meta.json`.
- Wizards: feet at (8, 23); SW, W and NW are mirrors of SE, E and NE.
- Draw order: depth `x + y` of each object's centre; integer scaling only.

## Retouching
Open the PNG in Aseprite (indexed, index 0 transparent), use only its palette and add its file name to `04_source/retocados.txt` so `build.py` never overwrites it.

## License
The art in this folder is licensed under [CC BY 4.0](LICENSE): credit it as "CodeWizards art by poligle, CC BY 4.0". The generator in `04_source/` is code, under the [MIT License](../LICENSE). The CodeWizards name and logo are not licensed.
