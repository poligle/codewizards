# Arte · Fase 1 en estilo GBC

22/10/2026 · Paso 6 adelantado · Entregado para el primer commit.

## 1. Inventario
64 assets en `codewizards-art/meta.json`:

| Grupo | Assets |
| --- | --- |
| Suelo | 6 rombos de 16 × 8: base, lisa, grieta, musgo, mancha y desgaste |
| Muros | 4 variantes × 2 muros (tramos de 2 tiles), esquina interior y exterior, 2 cantos |
| Puerta y ventanal | Puerta cerrada, apertura y cierre (4 fotogramas), ventanal gótico y su luz en el suelo |
| Mobiliario | Librerías L y R, mesa de laboratorio, pizarra a 45°, 2 antorchas y su llama (3 fotogramas), sillón y alfombra |
| Gremios | 14 estandartes (7 gremios × 2 muros) y el Aprendiz en reposo y caminando (8 direcciones × 4 fotogramas) × 7 gremios |
| Efectos | Halo de antorcha (3 bandas), brillo del orbe (2 bandas) y fuente de píxel 3 × 5 |
| Fondo | Sala base compuesta de 208 × 152 |

Vistas previas en `auditorias/img/arte/`: `sala_gbc.png`, `sala_gbc_crt.png`, `sala_gbc.gif`, `magos_gbc.png` y `hoja_gbc_fase1.png`. Demo con interruptor CRT en `codewizards-art/preview/`.

## 2. Método
El de la ronda 1: pixel art pintado por código con un rasterizador isométrico propio (un píxel por téxel en suelo y muros), sin modelos generativos de imagen; Pol retoca en Aseprite. El generador es `codewizards-art/04_source/gen/gbc.py` y la construcción, `build.py`.

## 3. Cambios frente a la ronda 1 (SNES)
- Escala a la mitad: tile 16 × 8, 8 px por unidad de altura, muro de 40 px y sala de unos 208 × 152.
- Paletas al modo GBC: RGB555; fondo de 8 paletas de 4 con el oscuro compartido; magos con 2 paletas de 3.
- Mago nuevo: viejecito encorvado, gran sombrero, barba larga, solo la nariz a la vista; bastón con orbe del color del gremio.
- Suelo en damero de losa base y lisa; variaciones más frecuentes junto a los muros.
- La geometría corregida en la ronda 1 se mantiene.

## 4. Validación
`check.py`: Assets revisados: 64 · errores: 0. Paletas: escenario 25 colores (8 x 3 + oscuro) · gremio 6 colores (2 x 3).

No comprobado aquí: la apertura en Aseprite (no hay Aseprite en el entorno) y el aspecto en pantallas reales.

## 5. Pendientes
- Poses de estación (leer, escribir, presentar), confusión, celebración y descanso; otros rangos y el Archimago.
- Puntos débiles anotados: el perfil (nariz y barba), las espaldas y la joroba.
- El musgo de suelo y muro usa la paleta verde dentro del tile; en una GBC real iría en su propio tile.

## 6. Pruebas para Pol
1. Abrir `codewizards-art/preview/codewizards_estilo_gbc.html` y alternar el filtro CRT.
2. Abrir `01_tiles/props/Bookshelf_Base_L.png` en Aseprite: debe entrar indexado, con el índice 0 transparente.
3. Cargar `palettes/gbc_gremio_qwen.gpl` sobre un sprite del Aprendiz Anthropic: debe volverse del gremio Qwen.
4. Retocar un PNG, añadirlo a `04_source/retocados.txt`, ejecutar `build.py` y comprobar que no se sobrescribe.
