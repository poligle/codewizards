# Arte · ronda 1 (rodaja vertical)

Paso 6 adelantado por decisión de Pol · 22/10/2026 · Estado: entregado para revisión.

## 1. Inventario
- `codewizards-art/`: 91 assets en `meta.json` (los 23 de la Fase 1, sus variantes de orientación, 14 estandartes, el Aprendiz en 7 gremios y 3 efectos), 9 paletas `.gpl` y el generador en `04_source/gen/` (`pal`, `core`, `env`, `props`, `wizard`, `font`, `scene`, `build`, `check`).
- Vistas previas en `auditorias/img/arte/`: `sala_rodaja.gif` (9 s, la rodaja animada), `sala_rodaja.png`, `sala_sin_luces.png`, `hoja_entorno.png`, `hoja_aprendiz_anthropic.png` y `gremios.png`.

## 2. Método (opción b, elegida por Pol)
Pixel art pintado por código, sin modelos generativos de imagen; Pol retoca en Aseprite. Un rasterizador isométrico propio muestrea el centro de cada píxel: en suelo y muros cada píxel corresponde a un téxel (16 por tile), así que las líneas 2:1 salen limpias sin antialias ni tramado. Las cabezas del mago están dibujadas a mano (plantillas ASCII); el cuerpo es semiprocedural para que las animaciones sean coherentes.

## 3. Referencias (se toman principios, no arte)
- *Final Fantasy Tactics* y *Tactics Ogre* (art_direction §5.3): interiores iso con muebles definidos por valor, sin contorno grueso.
- Hardware del SNES: CGRAM de 256 colores con 8 paletas de sprite de 16 → estructura de paletas. https://problemkaputt.de/fullsnes.htm
- WCAG 2.1, criterios 1.4.11 (3:1 en gráficos que informan) y 1.4.3 (4,5:1 en texto). https://www.w3.org/TR/WCAG21/#non-text-contrast

## 4. Diagnóstico y decisiones aprobadas («adelante» de Pol)
| Problema en los documentos | Decisión aplicada |
|---|---|
| Dos unidades de altura (16 y 32 px por tile) | 16 px por unidad en todo |
| Puerta (64), ventanal (80) y librería (128) más altos que el muro (48) | Muro de 80 px (5 unidades), puerta ~50 px, librería 64 px |
| Sala «octogonal» con 4 esquinas a 90° | Planta cuadrada de 12 × 12 |
| Muros descritos de frente; sin cámara definida | Muros como paralelogramos 2:1; se ven los dos del fondo; la puerta pasa al extremo delantero del muro izquierdo |
| Alfa de 1 bit frente a vidrio y luces translúcidas | Todo con alfa de 1 bit; la translucidez la mezcla el motor |
| Tope global de 64 colores | Escenario 63, 16 por gremio, 16 de efectos (192 ≤ 256) |
| Tiza azul pura a 2:1 y colores RGB puros | Tizas pastel ≥ 5,8:1 |
| Gremios distinguibles solo por color | Emblema por gremio (estandartes): libro, matraz, columnas gemelas, creciente, rombo, cuadro de circuito y ojo; ninguno imita un logo |

Otras decisiones menores: librería de 0,75 tiles de fondo; pizarra en caballete a 45° para que la tiza en tiempo de ejecución no se cizalle; bastón de madera para todos los Aprendices (el color de bastón del gremio queda para rangos superiores); mancha de humedad más oscura (la «desgastada» ya es la clara); al caminar, el bastón va colgado a la espalda y las manos cruzadas detrás.

## 5. Cotas: spec v1.0.1 frente a ronda 1
| Asset | Spec v1.0.1 | Ronda 1 | PNG |
|---|---|---|---|
| Floor_* (5) | 32×16 | 32×16 (rombo exacto que tesela sin solapes) | 32×16 |
| Wall_* (4 variantes × L/R) | 32×48 | tramo de 2 tiles con albardilla | 35×98 |
| Wall_Corner_Interior / Exterior | 32×48 | rincón del fondo / arista saliente | 32×96 |
| Wall_End_L / R (nuevo) | — | canto del muro cortado | 4×88 |
| Door_Closed | 48×64 | arco apuntado de ~50 px en el muro izquierdo | 40×68 |
| Door_Opening / Closing_Sheet | 48×64 ×4 | hojas que giran 0-30-60-90° | 40×68 ×4 |
| Window_Gothic_01 | 64×80 | 3 lancetas + rosetón + alféizar en el muro derecho | 50×77 |
| Window_Light_Effect | 96×48 | proyección real de la vidriera en el suelo | 66×43 |
| Bookshelf_Base_L / R | 96×64×128 | 3 × 0,75 tiles, 64 px de alto | 60×94 |
| LabTable_Base | 64×48×32 | 2 × 1,5 tiles, tablero a 16 px | 56×43 |
| Blackboard_Base | 96×16×96 | caballete a 45°, de frente a la cámara | 60×58 |
| Torch_Base_L / R + Flame_Sheet | 16×48, llama ×4 | antorcha de pared + llama 10×16 ×4 | 8×16 |
| Armchair_Rest | 48×48×48 | 1 tile, respaldo a 27 px | 30×41 |
| Carpet_Center | 128×96×4 | 4 × 3 tiles con flecos | 114×58 |

Anclas, fotogramas y milisegundos de cada asset: `codewizards-art/meta.json`.

## 6. Aprendiz
| Estado | Fotogramas | ms | Direcciones |
|---|---|---|---|
| idle | 4 | 250 | las 8 (5 dibujadas + 3 en espejo) |
| walk | 8 | 125 | las 8 |
| read | 6 | 250 | NE, NO (librerías de los muros del fondo) |
| create | 8 | 250 | SE, SO (detrás de la mesa, de cara a la cámara) |
| present | 6 | 250 | NE, NO |
| rest | 4 | 500 | S (meditando) |

## 7. Validación
`check.py`: Assets revisados: 91 · errores: 0. Indexado, alfa de 1 bit (solo el índice 0 transparente), ≤ 16 colores por sprite (salvo `Room_Base_01`, que es un fondo compuesto), colores dentro de su paleta, nombres y tamaños de `meta.json`.

Contraste sobre el suelo (s2):

| Gremio | Túnica base | Luz de túnica | Contorno vs. luz |
|---|---|---|---|
| Anthropic | 3.02:1 | 5.18:1 | 8.34:1 |
| OpenAI | 2.28:1 | 4.36:1 | 7.22:1 |
| Gemini | 2.32:1 | 4.03:1 | 6.87:1 |
| DeepSeek | 1.35:1 | 3.39:1 | 6.11:1 |
| Qwen | 2.58:1 | 4.96:1 | 7.73:1 |
| Copilot | 4.52:1 | 7.38:1 | 11.35:1 |
| Meta | 1.56:1 | 3.55:1 | 6.18:1 |

Tizas sobre la pizarra (k1 = #17141c):
chw 14.1:1 · chy 11.8:1 · chg 9.9:1 · chr 5.8:1 · chb 7.5:1

No comprobado aquí: que Aseprite abra los PNG en modo indexado con su paleta (no hay Aseprite en el entorno), el aspecto en pantallas reales y el rendimiento en un motor.

## 8. Pendientes
- La base de túnica de DeepSeek (1,35:1) y Meta (1,56:1) queda por debajo de 3:1 sobre el suelo; su luz sí pasa (3,39 y 3,55). Revisar en pantalla.
- Estados sin dibujar: CASTING, CONFUSED y SUCCESS; las poses de estación solo en las direcciones que usa la sala.
- Rangos superiores (Fase 4), FX completos y animaciones ambientales de mesa y librería (Fase 6).
- Retoque a mano: expresividad de las caras y diferencia entre vistas frontales y 3/4.

## 9. Pruebas para Pol
1. Abrir `01_tiles/props/Bookshelf_Base_L.png` en Aseprite: debe entrar indexado, con el índice 0 transparente.
2. Cargar `palettes/gremio_anthropic.gpl` y cambiarla por otra `.gpl` sobre un sprite del Aprendiz: debe cambiar de gremio sin tocar píxeles.
3. Ver `auditorias/img/arte/sala_rodaja.gif`: escala del mago frente a puerta, librería y mesa.
4. Retocar un PNG, añadirlo a `04_source/retocados.txt`, ejecutar `build.py` y comprobar que no se sobrescribe.
