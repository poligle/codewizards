# 🛠️ CODEWIZARDS IDE — ESPECIFICACIÓN TÉCNICA DE PRODUCCIÓN
## Fase 1 — Assets Base del Escenario (v1.0.1)

**Proyecto:** CodeWizards IDE (`codewizards.app`)
**Estado:** 🟢 LISTO PARA PRODUCCIÓN
**Herramienta:** Aseprite (principal) / GraphicsGale / Pyxel Edit
**Entrega:** Spritesheets PNG + fuentes `.ase` editables
**Restricción:** Prohibida la generación de imágenes por IA. Todo asset se dibuja a mano.
**Documento padre:** `CODEWIZARDS_ART_DIRECTION_v1.0.md` (estética imperativa 16-bit SNES Dark Fantasy, iso 2:1)

---

## 1. INVENTARIO DE ASSETS FASE 1

| # | Asset | Tipo | Frames | Prioridad |
|---|---|---|---|---|
| 01 | Floor_Base_01 | Tile estático | 1 | 🔴 CRÍTICA |
| 02–05 | Floor_Variations (Cracked/Moss/Stain/Worn) | Tiles estáticos | 4 | 🔴 CRÍTICA |
| 06 | Wall_Base_01 | Tile estático | 1 | 🔴 CRÍTICA |
| 07–09 | Wall_Variations (Cracked/Moss/Damaged) | Tiles estáticos | 3 | 🟡 ALTA |
| 10 | Wall_Corner_Interior | Tile estático | 1 | 🟡 ALTA |
| 11 | Wall_Corner_Exterior | Tile estático | 1 | 🟡 ALTA |
| 12 | Door_Closed | Prop estático | 1 | 🟡 ALTA |
| 13 | Door_Opening_Sheet | Prop animado | 4 | 🟢 MEDIA |
| 14 | Door_Closing_Sheet | Prop animado | 4 | 🟢 MEDIA |
| 15 | Window_Gothic_01 | Prop estático | 1 | 🟢 MEDIA |
| 16 | Window_Light_Effect | Overlay | 1 | 🟢 MEDIA |
| 17 | Bookshelf_Base | Prop estático | 1 | 🔴 CRÍTICA |
| 18 | LabTable_Base | Prop estático | 1 | 🔴 CRÍTICA |
| 19 | Blackboard_Base | Prop estático | 1 | 🔴 CRÍTICA |
| 20 | Torch_Base | Prop estático | 1 | 🟢 MEDIA |
| 21 | Torch_Flame_Sheet | Prop animado | 4 | 🟢 MEDIA |
| 22 | Armchair_Rest | Prop estático | 1 | 🟢 MEDIA |
| 23 | Carpet_Center | Prop estático | 1 | 🟢 MEDIA |

---

## 2. TILES DE SUELO

### 2.1 Floor_Base_01
- **Dimensiones:** 32 × 16 px (tile iso estándar), PNG con transparencia.
- **Paleta:** base `#3d3d3d` · variación `#4a4a4a` · oscuro `#353535` · mortero `#2a2a2a` · detalles `#505050`.
- **Diseño:** losas irregulares en perspectiva 2:1; mortero de 1 px; grietas finas de 1 px; 100% mate, sin brillo.
- **Referencias:** suelos de Magus Castle (*Chrono Trigger*), monasterios (*FFT*), guildas (*Ultima Online*), cuevas (*Stardew Valley*).

### 2.2 Variaciones
| Asset | Detalle distintivo |
|---|---|
| Floor_Cracked_02 | Grieta diagonal de 2–3 px (`#2a2a2a`) con highlight de borde (`#505050`) |
| Floor_Moss_03 | Musgo `#4a5d23` en grupos de 3–5 px en 1–2 esquinas |
| Floor_Stain_04 | Mancha de humedad irregular de 8–10 px (`#4a4a4a`) |
| Floor_Worn_05 | Zona central desgastada y aclarada (6 × 3 px, `#4a4a4a`) |

### 2.3 Reglas de colocación
- Base: 60% del suelo · Variaciones: 40% (aleatorio sembrado, no dos iguales adyacentes).
- Variaciones concentradas cerca de muros y esquinas; base en zonas de tránsito.

---

## 3. TILES DE PARED

### 3.1 Wall_Base_01
- **Dimensiones:** 32 × 48 px (3 tiles de altura), PNG con transparencia.
- **Paleta:** piedra clara `#5a5a5a` · piedra oscura `#454545` · mortero `#2a2a2a` · highlight superior `#6a6a6a` · sombra inferior `#3a3a3a`.
- **Estructura:** 3 filas de bloques irregulares (superior 2 bloques grandes, media 3 medianos, inferior 2+1); mortero 1 px; highlight 1 px arriba y sombra 1 px abajo por bloque.
- **Referencias:** muros de monasterio (*FFT*), castillos (*Chrono Trigger*), fortalezas (*Tactics Ogre*).

### 3.2 Variaciones
| Asset | Detalle distintivo |
|---|---|
| Wall_Cracked_02 | Grieta vertical de 2 px × 20–25 px atravesando 1–2 filas |
| Wall_Moss_03 | Musgo `#4a5d23` (4–6 px) en una esquina inferior |
| Wall_Damaged_04 | Bloque faltante en fila media; hueco 10 × 16 px relleno `#1a1a1a`, bordes irregulares |

### 3.3 Esquinas
- **Wall_Corner_Interior (32 × 48 px):** unión interior a 90°; línea diagonal de unión 1 px (`#2a2a2a`); mortero continuo.
- **Wall_Corner_Exterior (32 × 48 px):** arista saliente con borde vertical de 2 px (`#6a6a6a`) y sombra opuesta de 2 px (`#3a3a3a`); bloques mayores en la arista.

### 3.4 Reglas de colocación
- Base 70% · variaciones 30%; musgo/daño en zonas bajas, grietas en zonas altas; máx. 2 variaciones por tramo continuo; esquinas obligatorias en los 4 vértices de la sala.

---

## 4. PUERTA DE ACCESO

### 4.1 Door_Closed
- **Dimensiones:** 48 × 64 px, PNG con transparencia.
- **Paleta:** madera oscura `#3d2817` · madera clara `#5c4033` · hierro `#4a4a4a` · hierro brillante `#6a6a6a` · interior `#1a1a1a`.
- **Estructura:** marco de 4 px; 2 hojas de 24 px con 6 tablas verticales cada una; 3 refuerzos horizontales de hierro por hoja; manijas circulares de 4 px; bisagras de 6 × 4 px; gap central de 2 px.
- **Referencias:** puertas de castillo (*Chrono Trigger*), monasterios (*FFT*), Winterfell (referencia cinematográfica de textura).

### 4.2 Door_Opening_Sheet (4 frames, 1 s total, 250 ms/frame, 1 sola ejecución)
| Frame | Estado |
|---|---|
| 1 | Cerrada (gap 2 px) |
| 2 | 25% abierta (gap 14 px), interior `#1a1a1a` asomando |
| 3 | 50% abierta (gap 26 px), refuerzos en ángulo |
| 4 | Abierta (gap 50 px), hojas paralelas a muros |

### 4.3 Door_Closing_Sheet (4 frames, inverso exacto de apertura)

### 4.4 Uso en juego
- Apertura al llegar magos al proyecto; cierre 2–3 s después del último ingreso.
- SFX sugerido: chirrido de madera + golpe suave.

---

## 5. VENTANAL GÓTICO

### 5.1 Window_Gothic_01
- **Dimensiones:** 64 × 80 px, PNG con transparencia.
- **Paleta:** marco piedra `#5a5a5a`/`#454545` · vidrio `#87ceeb` (50% opacidad) · plomo `#2a2a2a`.
- **Estructura:** arco apuntado; marco de 6 px; 3 paños verticales; divisiones de plomo de 2 px; base de piedra de 8 px.
- **Vidriera:** paño central con runa de 16 × 16 px; laterales con geometría (círculos concéntricos, estrellas de 8 puntas, triángulos entrelazados); acentos `#9370db` y `#ffd700`.
- **Referencias:** catedrales góticas; ventanas de monasterio (*FFT*); catedrales (*Diablo II*, Act 1).

### 5.2 Window_Light_Effect (overlay)
- **Dimensiones:** 96 × 48 px, opacidad 30–40%.
- Replica el patrón de la vidriera proyectado en el suelo (`#87ceeb`).
- Oscilación de 2 px cada 10 s (nubes); opacidad 10–20% en modo noche.
- Único asset donde se permite suavizado de bordes.

---

## 6. LIBRERÍA — READING STATION

### 6.1 Bookshelf_Base
- **Dimensiones:** 96 × 64 × 128 px (ancho × prof. × alto), vista 3/4 iso.
- **Paleta:** estructura `#3d2817` · estantes `#5c4033` · tomos `#8b4513`, `#654321`, `#a0522d`, `#cd853f` · pergaminos `#f4e4c1`, `#e8dcc8` · dorados `#ffd700`.
- **Estructura:** marco de 8 px; 5 estantes de 24 px de alto y 16 px de profundidad; 4 patas torneadas de 8 × 16 px; moldura superior de 12 px.

### 6.2 Contenido por estante
1. Superior: 8–10 tomos grandes.
2. Segundo: 12–15 libros medianos.
3. Tercero: 8–10 pergaminos enrollados con cinta de cuero.
4. Cuarto: libros pequeños + objetos (calaveras de cristal 8 × 8 px `#e0e0e0`, relojes de arena 12 × 16 px con arena `#4169e1`, orbes 8 × 8 px `#87ceeb`).
5. Inferior: 3–4 tomos grandes acostados.

### 6.3 Reglas de composición
- Alturas de lomo 16–24 px, anchos 4–8 px; detalles dorados de 1–2 px; algunos volúmenes inclinados 15–20°; huecos de 2–4 px entre grupos.

---

## 7. MESA DE LABORATORIO — CREATING STATION

### 7.1 LabTable_Base
- **Dimensiones:** 64 × 48 × 32 px, vista 3/4 iso.
- **Paleta:** superficie `#d2b48c` · bordes `#8b7355` · patas `#5c4033` · pergaminos `#f4e4c1` · tintas `#1a1a1a`/`#8b0000`/`#00008b` · cristal `#87ceeb`.
- **Estructura:** tablero con bordes desgastados de 2 px; 4 patas torneadas de 8 × 16 px; travesaño de 4 px; cajón lateral de 16 × 8 px con manija de hierro.

### 7.2 Contenido de superficie
- 2–3 pergaminos extendidos (24 × 16 px) con texto en líneas finas.
- 3 tinteros de cristal (8 × 12 px) con pluma insertada.
- 3–4 frascos con líquido (verde, púrpura, azul) y corcho.
- 2–3 cristales de cuarzo facetados (8 × 8 px).
- 1 runa tallada en piedra (12 × 12 px).
- 1–2 engranajes de bronce `#b8860b` (8 × 8 px).

### 7.3 Animaciones ambientales (opcionales, Fase 3)
- Goteo de tinta (2 frames / 500 ms) · humo de frasco (4 frames / 250 ms) · pulso de cristal (2 frames / 1 s) · desenrollado de pergamino (4 frames / 250 ms).

---

## 8. PIZARRA — PRESENTING STATION

### 8.1 Blackboard_Base
- **Dimensiones:** 96 × 16 × 96 px, vista 3/4 iso.
- **Paleta:** pizarra `#1a1a1a` · marco `#3d2817` · hierro `#4a4a4a`.
- **Estructura:** superficie de 80 × 80 px; marco de 8 px; esquinas de hierro de 12 × 12 px; caballete de 2 patas (16 × 48 px); bandeja inferior de 64 × 8 px con 4–5 tizas de 4 × 8 px.

### 8.2 Formato del contenido (tiza)
- Pixel font de 4 × 6 px; interlineado 2 px; máx. 8–10 líneas.
- Código `#ffffff` · comentarios `#ffff00` · funciones `#00ff00` · errores `#ff0000` · variables `#0000ff`.

### 8.3 Animaciones de contenido (dinámicas, generadas en runtime)
- Escritura progresiva (8–12 frames) · tachado de errores (4 frames) · diagramas (12–16 frames) · flechas de conexión (4 frames).

---

## 9. ANTORCHA

### 9.1 Torch_Base
- **Dimensiones:** 16 × 48 px.
- **Paleta:** mango `#5c4033` · soporte `#4a4a4a` · trapo `#8b4513` · llama `#ffa500`/`#ff8c00`/`#ff4500`.
- **Estructura:** soporte mural de 8 × 16 px; mango de 4 × 32 px; trapo enrollado de 12 × 12 px.

### 9.2 Torch_Flame_Sheet (4 frames, 500 ms total, 125 ms/frame, loop continuo)
| Frame | Tamaño | Color | Forma |
|---|---|---|---|
| 1 | 6 × 12 px | `#ffa500` | Triangular estrecha |
| 2 | 8 × 14 px | `#ff8c00` | Triangular media |
| 3 | 10 × 16 px | `#ff4500` | Ancha con punta |
| 4 | 8 × 14 px | `#ffa500` | Asimétrica |

### 9.3 Halo de luz
- 16 × 16 px, `#ffa500`, opacidad 20–30%, pulso sincronizado con la llama; proyección opcional sobre muro adyacente.

---

## 10. MUEBLES DE DESCANSO

### 10.1 Armchair_Rest
- **Dimensiones:** 48 × 48 × 48 px, vista 3/4 iso.
- **Paleta:** terciopelo `#8b0000` (o variante `#000080`) · madera `#3d2817` · botones `#ffd700` · pliegues `#1a1a1a`.
- **Estructura:** respaldo alto 32 × 40 px; asiento 32 × 24 px; reposabrazos 8 × 24 px; 4 patas torneadas 8 × 12 px; 4 botones dorados de 4 × 4 px; pliegues de 1 px.

### 10.2 Carpet_Center
- **Dimensiones:** 128 × 96 × 4 px, vista superior iso.
- **Paleta:** base `#8b0000` · patrones `#000080` · bordes `#ffd700` · acentos `#f5deb3`.
- **Patrón:** borde dorado de 8 px; borde azul interior de 4 px; motivo central de estrella de 8 puntas con círculos concéntricos; simetría radial.
- **Referencias:** alfombras persas y otomanas s. XVI–XVII; salas nobles (*FFT*).

---

## 11. ESTRUCTURA DE ARCHIVOS Y NAMING

### 11.1 Árbol de carpetas
```
codewizards-art/
├── 01_tiles/
│   ├── floor/
│   │   ├── Floor_Base_01.png
│   │   ├── Floor_Cracked_02.png
│   │   ├── Floor_Moss_03.png
│   │   ├── Floor_Stain_04.png
│   │   └── Floor_Worn_05.png
│   ├── wall/
│   │   ├── Wall_Base_01.png
│   │   ├── Wall_Cracked_02.png
│   │   ├── Wall_Moss_03.png
│   │   ├── Wall_Damaged_04.png
│   │   ├── Wall_Corner_Interior.png
│   │   └── Wall_Corner_Exterior.png
│   └── props/
│       ├── Door_Closed.png
│       ├── Door_Opening_Sheet.png
│       ├── Door_Closing_Sheet.png
│       ├── Window_Gothic_01.png
│       ├── Window_Light_Effect.png
│       ├── Bookshelf_Base.png
│       ├── LabTable_Base.png
│       ├── Blackboard_Base.png
│       ├── Torch_Base.png
│       ├── Torch_Flame_Sheet.png
│       ├── Armchair_Rest.png
│       └── Carpet_Center.png
├── 02_characters/          # (Fase 2+)
├── 03_effects/             # (Fase 3+)
└── 04_source/              # archivos .ase editables, espejo de la estructura
```

### 11.2 Convenciones de naming
- Estáticos: `[Nombre]_[Descriptor]_[NN].png` → `Floor_Base_01.png`
- Animaciones: `[Nombre]_[Acción]_Sheet.png` → `Torch_Flame_Sheet.png`
- Personajes: `[Rango]_[Gremio]_[Estado]_Sheet.png` → `Apprentice_Anthropic_Idle_Sheet.png`
- Fuentes: mismo nombre con extensión `.ase`.

### 11.3 Metadatos y capas
- PNG: metadatos de autor, fecha (YYYY-MM-DD), versión y proyecto.
- `.ase`: capas separadas de lineart, color, sombras, highlights y efectos.

---

## 12. CHECKLIST DE ENTREGA FASE 1

**Calidad visual**
- [ ] Encaje perfecto en proyección iso 2:1
- [ ] Paleta global ≤ 64 colores; ≤ 16 por sprite
- [ ] Sin anti-aliasing ni dithering en sprites
- [ ] Pixel-perfect en coordenadas

**Funcionalidad**
- [ ] Suelo y muro tilean sin costuras
- [ ] Transparencias correctas en props
- [ ] Animaciones sin saltos de frame
- [ ] Naming y estructura de carpetas respetados

**Completitud**
- [ ] 5 tiles de suelo · 6 tiles de muro
- [ ] Puerta (8 frames totales) · ventanal + overlay
- [ ] Librería · mesa · pizarra · antorcha (4 frames) · sillón · alfombra

**Documentación**
- [ ] README.md de uso en `codewizards-art/`
- [ ] Fuentes `.ase` completos y capas organizadas

---

## 13. SIGUIENTES FASES (RESUMEN)

- **Fase 2:** Aprendiz completo del gremio piloto (Anthropic): 8 direcciones × todos los estados.
- **Fase 3:** Composición de escena, iluminación y FX ambientales.
- **Fase 4:** Rangos superiores (Mago Joven → Gran Sabio → Archmage).
- **Fase 5:** Repintado paletizado de los 7 gremios.
- **Fase 6:** FX finales, props animados y pass de pulido.

---

**Versión:** 1.0.1 · **Estado:** 🟢 LISTO PARA PRODUCCIÓN
**Próximo hito:** primer sprite entregable → `Floor_Base_01.png`