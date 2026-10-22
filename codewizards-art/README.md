# codewizards-art · ronda 1

Arte de CodeWizards pintado píxel a píxel por código (sin modelos de imagen) y retocable a mano.

## Estructura
- `01_tiles/floor`, `01_tiles/wall`, `01_tiles/props` (+ `banners/`): escenario de la Fase 1.
- `01_tiles/Room_Base_01.png`: sala base ya compuesta (suelo, muros, puerta, ventanal y alfombra) para la rodaja vertical.
- `02_characters/apprentice/<gremio>/`: Aprendiz en los 7 gremios (mismos índices, distinta paleta).
- `03_effects/`: halo de antorcha (3 bandas), polvo al pisar y fuente de tiza 4 x 6.
- `palettes/`: `escenario.gpl`, `gremio_<gremio>.gpl` y `fx.gpl` (se cargan en Aseprite).
- `meta.json`: tamaño, fotogramas, ms, filas de dirección, paleta y **ancla** de cada asset.
- `04_source/gen/`: el generador (la fuente de verdad) y `retocados.txt`.

## Regenerar y validar
```
python3 codewizards-art/04_source/gen/build.py   # assets + meta.json + vistas previas
python3 codewizards-art/04_source/gen/check.py   # indexado, alfa 1 bit, <= 16 colores, paletas, nombres, contraste
```
Requisitos: Python 3, numpy y Pillow.

## Retocar a mano
1. Abre el PNG en Aseprite (es indexado: índice 0 transparente) y usa solo su paleta.
2. Añade su nombre a `04_source/retocados.txt`: `build.py` ya no lo sobrescribirá.

## Convenciones para el motor
- Iso 2:1, tile 32 x 16: `sx = (x - y) * 16`, `sy = (x + y) * 8 - z`; 1 unidad de altura = 16 px.
- Sala de 12 x 12 tiles; muros del fondo: izquierdo (x = 0, en sombra) y derecho (y = 0, iluminado), 80 px de alto.
- Ancla: el píxel del PNG que corresponde al origen de mundo del asset (ver `nota` en `meta.json`).
- Magos: lienzo 32 x 40, pies en (16, 38). Hojas: filas = direcciones, columnas = fotogramas. SO, O y NO son espejo de SE, E y NE.
- Orden de dibujo: por profundidad `x + y` del centro de cada objeto.
- Alfa de 1 bit en todo. La luz del ventanal y los halos se mezclan en tiempo de ejecución (aditiva; opacidades en `meta.json`).
- Pizarra: la tiza se pinta en tiempo de ejecución con `Chalk_Font_4x6.png` dentro del rectángulo interior.
