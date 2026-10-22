# codewizards-art · Fase 1 en estilo GBC

Arte pintado píxel a píxel por código (sin modelos de imagen) y retocable a mano.

## Estructura
- `01_tiles/floor/`: 6 rombos de suelo (16 × 8): base, lisa y 4 variaciones.
- `01_tiles/wall/`: tramos de 2 tiles con albardilla (`_L` muro izquierdo, `_R` derecho) en 4 variantes, esquinas y cantos.
- `01_tiles/props/`: puerta (cerrada y hojas de apertura/cierre), ventanal y su luz, librerías L y R, mesa, pizarra, antorchas y llama, sillón, alfombra y `banners/` (7 gremios × 2 muros).
- `01_tiles/Room_Base_01.png`: sala base ya compuesta (208 × 152).
- `02_characters/apprentice/<gremio>/`: Aprendiz en reposo y caminando; filas = direcciones S, SE, E, NE, N, NO, O, SO; 4 fotogramas.
- `03_effects/`: halo de antorcha, brillo del orbe (máscaras que tiñe el motor) y fuente de píxel 3 × 5.
- `palettes/`: `gbc_escenario.gpl` y `gbc_gremio_<gremio>.gpl` (se cargan en Aseprite).
- `meta.json`: tamaño, fotogramas, milisegundos, paleta y ancla de cada asset.
- `preview/`: demo HTML con interruptor CRT.
- `04_source/gen/`: generador (`gbc.py`, `build.py`), validador (`check.py`) y plantilla de la demo.
- `legacy/snes-ronda1/`: la ronda 1 en estilo SNES, con su propio generador.

## Reglas del estilo
| Regla | Valor |
| --- | --- |
| Tile | 16 × 8 px, iso 2:1; 8 px por unidad de altura |
| Sala | 12 × 12 tiles; muro de 40 px; lienzo 208 × 152, origen (104, 46) |
| Color | RGB555 (canales múltiplos de 8) |
| Fondo | 8 paletas de 4 colores con el oscuro compartido (25 colores) |
| Magos y estandartes | 16 × 24 px; 2 paletas de 3: gremio (luz, base, oscuro) + común (barba, nariz, bastón) |
| Alfa | 1 bit; halos, orbes y luz del ventanal los mezcla el motor |

## Para el motor
- Proyección: `sx = (x - y) * 8`, `sy = (x + y) * 4 - z`, con x, y en tiles y z en px.
- Ancla: el píxel del PNG que corresponde al punto de mundo de la `nota` de `meta.json`.
- Magos: pies en (8, 23); SO, O y NO son el espejo de SE, E y NE.
- Orden de dibujo: profundidad `x + y` del centro de cada objeto; escalado siempre entero.

## Retocar
Abre el PNG en Aseprite (es indexado, índice 0 transparente), usa solo su paleta y añade su nombre a `04_source/retocados.txt`.
