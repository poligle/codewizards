# 📐 CODEWIZARDS IDE — DOCUMENTO DE DIRECCIÓN ARTÍSTICA
## "The Grimoire of Visual Design" — v1.0

**Proyecto:** CodeWizards IDE (`codewizards.app`)
**Emite:** Dirección Creativa
**Estado:** ✅ APROBADO — listo para producción de assets
**Método de producción:** Herramientas de pixel art (Aseprite, GraphicsGale, Pyxel Edit). **Queda prohibida la generación de imágenes por IA.**
**Estética imperativa:** 16-bit SNES Dark Fantasy, pixel art retro RPG isométrico (*Chrono Trigger*, *Final Fantasy Tactics*, *Tactics Ogre*).

---

## 1. VISIÓN GENERAL Y FILOSOFÍA VISUAL

### 1.1 Manifiesto Estético
*"Donde la magia del código se encuentra con la artesanía del píxel."*

Cada proyecto es una **torre de magos habitada**. La habitación no es un dashboard: es un organismo vivo que respira al ritmo de los tokens consumidos. El usuario debe sentir que abre la puerta de un scriptorium medieval donde profesionales de la arcania trabajan con método.

### 1.2 Principios Fundamentales
1. **Autenticidad 16-Bit:** Cada sprite debe ser dibujable a mano en un editor de píxeles.
2. **Consistencia Isométrica:** Proyección 2:1 (2 px horizontales por 1 px vertical) en todo el mapa.
3. **Atmósfera Madura:** Seriedad y maestría técnica. Cero estética infantil o casual.
4. **Legibilidad Funcional:** De un vistazo se debe entender qué hace cada mago y en qué estación está.
5. **Coherencia Cromática:** Paletas limitadas y sobrias, con acentos arcanos vívidos solo en efectos mágicos.
6. **El Color es el Gremio:** La túnica identifica al proveedor del modelo; el rango identifica su potencia.

---

## 2. ARQUITECTURA ISOMÉTRICA DE LA HABITACIÓN (1 HABITACIÓN = 1 PROYECTO)

### 2.1 Concepto
Cada proyecto activo es una **sala-torre octogonal** vista en perspectiva isométrica, con paredes de altura visible y suelo de piedra medieval. La sala se pobla de magos al iniciar el proyecto: el Archmage (orquestador) asigna tantos como APIs conectadas y complejidad requieran; el usuario puede invocar magos manualmente en cualquier momento.

### 2.2 Dimensiones del Espacio Base
| Parámetro | Valor |
|---|---|
| Área jugable | 12 × 12 tiles isométricos |
| Tile base | 32 × 16 px (formato iso estándar) |
| Altura de pared | 48 px visibles (3 tiles) |
| Canvas de habitación | 384 × 192 px (más altura de muros y props) |

### 2.3 Paleta Base de la Habitación
| Elemento | Color primario | Color secundario | Notas |
|---|---|---|---|
| Suelo | `#3d3d3d` gris piedra | `#4a4a4a` variación | Losas irregulares, mate |
| Paredes | `#5a5a5a` piedra clara | `#454545` sombra | Bloques con mortero |
| Mortero | `#2a2a2a` oscuro | — | Líneas de 1 px |
| Maderas | `#5c4033` roble | `#3d2817` veta/sombra | Muebles y marcos |

### 2.4 Elementos Arquitectónicos

#### A) Suelo de Piedra
- Losas irregulares de tamaños variados (3–4 tiles distintos para evitar repetición).
- Grietas finas y manchas de humedad puntuales.
- Superficie 100% mate, sin brillo.

#### B) Paredes
- Bloques de piedra de tamaño irregular con mortero de 1 px.
- **Antorchas** en esquinas (llama animada, 4 frames).
- **Estandarte del gremio dominante** del proyecto (cambia según proveedor).
- Musgo y grietas en zonas bajas para envejecimiento.

#### C) Puerta de Acceso (esquina inferior izquierda)
- Madera oscura con refuerzos de hierro.
- Animación: cerrada → abriendo (4 frames) → abierta (llegada de magos) → cerrando (4 frames).

#### D) Ventanal Gótico (pared superior derecha)
- Arco apuntado con vidriera de motivos arcanos (runas, geometría).
- Luz fría `#87ceeb` de baja intensidad que proyecta patrones sutiles en el suelo.

### 2.5 Iluminación y Atmósfera
**Fuentes de luz:**
1. Antorchas: cálida `#ffa500`, intensidad media.
2. Ventanal: fría `#87ceeb`, intensidad baja.
3. Grimorios y orbes: luz arcana del color del gremio.
4. Partículas mágicas puntuales en estaciones activas.

**Sombras:** proyección suave hacia abajo-derecha, 20% más oscuras que el color base, sin bordes duros.

---

## 3. MOBILIARIO Y ESTACIONES DE TRABAJO

### 3.1 Layout de la Sala (vista superior)

```
            [VENTANAL GÓTICO]

 [ESTANDARTE]      [PIZARRA]      [ESTANDARTE]

[LIBRERÍA]    [MESA DE LABORATORIO]    [LIBRERÍA]

         [MESAS AUXILIARES / PROPS]

 [ANTORCHA]      [ZONA CENTRAL]      [ANTORCHA]
              (alfombra, descanso)

            [PUERTA DE ACCESO]
```

### 3.2 📚 La Librería — *Reading Station* (contexto / RAG)
- **Estructura:** estantería de roble envejecido, 3 tiles ancho × 2 profundidad × 4 alto.
- **Contenido:** tomos grandes (`#8b4513`, `#654321`), medianos (`#a0522d`, `#cd853f`), pergaminos (`#f4e4c1`, `#e8dcc8`), calaveras de cristal, relojes de arena, orbes tenues.
- **Animación ambiental:** libros que se reajustan solos, páginas que vibran, tomos que brillan cuando contienen contexto relevante.
- **Interacción del mago:** agita rítmicamente el bastón sobre los tomos; partículas de conocimiento flotan hacia él.

### 3.3 ⚗️ Mesa de Laboratorio — *Creating Station* (generación / código)
- **Estructura:** mesa de madera maciza con patas torneadas, 2 × 1.5 × 1 tiles. Madera clara `#d2b48c` con bordes desgastados.
- **Superficie:** pergaminos extendidos con diagramas, 3 tinteros de cristal (tinta negra/roja/azul), plumas, cristales de cuarzo, runas talladas, frascos humeantes, engranajes.
- **Animación ambiental:** tinta goteando, humo de frascos, cristales pulsando, pergaminos que se desenrollan solos.
- **Interacción del mago:** escribe trazando runas en el aire que se materializan como código; chispas doradas emergen de la mesa.

### 3.4 📋 La Pizarra — *Presenting Station* (entregables / review)
- **Estructura:** pizarra de obsidiana `#1a1a1a` en caballete de madera oscura con esquinas de hierro, 3 × 1 × 3 tiles.
- **Contenido dinámico (tiza):** código blanco `#ffffff`, comentarios amarillos `#ffff00`, funciones verdes `#00ff00`, errores rojos `#ff0000`, variables azules `#0000ff`.
- **Animación ambiental:** líneas que se escriben solas, errores tachados en rojo, diagramas que se dibujan progresivamente.
- **Interacción del mago:** señala con el bastón; la línea señalada se ilumina y emite partículas doradas.

### 3.5 🪑 Zonas de Descanso — *Resting Areas*
- **Sillón orejero:** terciopelo burdeos `#8b0000` o azul marino `#000080`, botones dorados.
- **Banco de piedra:** `#696969` con cojín `#8b4513`, junto a paredes.
- **Alfombra persa:** patrones geométricos en rojo, azul y dorado, zona central.

### 3.6 Props Funcionales (UI diegética)
| Prop | Función sistémica | Visual |
|---|---|---|
| **Grimorio flotante** | Tarea activa del mago | Libro levitando a 1 tile, cubierta del color del gremio, rotación lenta y pulso de brillo |
| **Orbe de cristal** | Salud del proyecto | Verde = OK, amarillo = warnings, rojo = errores críticos; brillo interno pulsante |
| **Reloj de arena mágico** | Tiempo restante de subtarea | Arena de color que fluye hacia arriba |

---

## 4. DISEÑO DE PERSONAJES: LOS MAGOS

### 4.1 Filosofía
*"Cada mago es un artesano del código, no una caricatura."*
Referencias de carácter: Gandalf, Dumbledore, los magos de *Final Fantasy Tactics*. Sabiduría, concentración y maestría técnica.

### 4.2 Anatomía Base (todos los rangos)
| Parte | Especificación |
|---|---|
| Altura total | 32 px (2 tiles iso) |
| Cabeza | 8 px (25%) |
| Cuerpo/túnica | 16 px (50%) |
| Piernas | 8 px (25%), ocultas bajo la túnica salvo al caminar |
| Ojos | 2 px blancos + pupila de 1 px |
| Boca | No visible (oculta por barba o sombra) |

### 4.3 Paletas por Gremio (Proveedor de IA)
> Solo cambia el color; la silueta y el equipamiento los define el rango.

**Anthropic (Claude) — Gremio del Ámbar Arcano**
```
Túnica: #d2691e | Secundario: #ff8c00 | Acento: #ffd700
Piel: #f5deb3 | Barba: #8b7355 | Bastón: #8b4513
Carácter: cálido, reflexivo, metódico. Pergaminos y sabiduría acumulada.
```

**OpenAI (GPT) — Gremio del Cian Profundo**
```
Túnica: #0000cd | Secundario: #4169e1 | Acento: #87ceeb
Piel: #f5deb3 | Barba: #d3d3d3 | Bastón: #c0c0c0
Carácter: preciso, corporativo, de laboratorio.
```

**Google (Gemini) — Gremio del Fuego Estelar**
```
Túnica: #dc143c | Secundario: #ff4500 | Acento: #ffd700
Piel: #f5deb3 | Barba: #8b0000 | Bastón: #b8860b
Carácter: energético, expansivo, cósmico.
```

**DeepSeek — Gremio del Índigo Nocturno**
```
Túnica: #191970 | Secundario: #00008b | Acento: #4b0082
Piel: #f5deb3 | Barba: #2f4f4f | Bastón: #696969
Carácter: misterioso, profundo, analítico.
```

**Qwen (Alibaba) — Gremio del Jade Antiguo**
```
Túnica: #2e8b57 | Secundario: #3cb371 | Acento: #90ee90
Piel: #f5deb3 | Barba: #696969 | Bastón: #8b7355
Carácter: natural, equilibrado, sereno.
```

**GitHub Copilot — Gremio del Cian Eléctrico**
```
Túnica: #00ced1 | Secundario: #40e0d0 | Acento: #00ffff
Piel: #f5deb3 | Barba: #708090 | Bastón: #c0c0c0
Carácter: moderno, colaborativo, eficiente.
```

**Meta (Llama) — Gremio del Púrpura Místico**
```
Túnica: #6a0dad | Secundario: #9370db | Acento: #dda0dd
Piel: #f5deb3 | Barba: #800080 | Bastón: #4b0082
Carácter: místico, creativo, de conocimiento abierto.
```

### 4.4 Rangos (silueta y equipamiento)

#### 🎓 APRENDIZ — modelos ligeros (Gemini Flash, Llama 8B)
- Túnica simple sin adornos, color sólido del gremio. Sin capucha.
- Barba corta (2–3 px). Bastón de madera recto, sin ornamentos.
- Cinturón de cuerda `#8b7355`, botas de cuero visibles.
- Sin grimorio flotante. Movimientos rápidos, ligeramente torpes.

#### 🧙 MAGO JOVEN — modelos intermedios
- Túnica con bordados simples en cuello y mangas. Capucha presente pero bajada.
- Barba media (4–5 px). Bastón pulido con esfera de cristal estable.
- Cinturón de cuero con hebilla, bolsillo lateral, grimorio flotante pequeño, anillo arcano con brillo ocasional.
- Movimientos fluidos y seguros.

#### 🧙♂️ GRAN SABIO — razonamiento profundo (Claude Sonnet, o1)
- Túnica ornamentada con runas bordadas en mangas y dobladillo. Capucha grande (versión subida/bajada).
- Barba larga hasta el pecho (8–10 px). Bastón elaborado con cristales y runas.
- Manto corto sobre hombros, cinturón ancho con símbolos, grimorio flotante grande permanente, amuleto, partículas arcanas ambientales.
- Movimientos lentos y deliberados.

#### 👑 MAGO JEFE (ARCHMAGE) — ÚNICO, orquestador global
- Túnica con bordados dorados y plateados. Capucha siempre subida, ojos brillantes bajo la sombra.
- Barba hasta la cintura (12+ px). Bastón de mando con orbe gigante.
- Corona arcana flotante, manto largo completo, 3–5 grimorios orbitando, **círculo rúnico permanente en el suelo**, levitación de 2–3 px, partículas intensas.
- Movimientos mínimos pero cargados de poder.

### 4.5 Los 8 Puntos de Vista Isométricos

```
           N (espalda completa)
           ↑
    NO ↖       ↗ NE
   (3/4 esp. izq)  (3/4 esp. der)
        [MAGO]
    SO ↙       ↘ SE
   (3/4 fr. izq)  (3/4 fr. der)
           ↓
           S (frontal completo)

    E = perfil derecho | W = perfil izquierdo
```

Notas por dirección:
- **N / NO / NE:** espalda y capucha visibles; bastón asoma por el lado correspondiente.
- **E / W:** perfil completo; barba y bastón de lado.
- **S / SE / SO:** rostro visible (completo o 3/4); bastón apuntando al frente.
- La silueta debe ser identificable por rango **solo con su contorno**, sin color.

### 4.6 Animaciones y Estados

| Estado | Frames | Duración | Loop | Descripción clave |
|---|---|---|---|---|
| **IDLE** | 4 | 1 s | ∞ | Respiración sutil (pecho/hombros ±1 px). Archmage levita ±2 px |
| **WALKING** | 8 | 1 s | ∞ en movimiento | Brazos cruzados a la espalda; túnica y barba con follow-through; polvo al pisar (solo Aprendiz) |
| **READING** | 6 | 1.5 s | ∞ en librería | Bastón agitado rítmicamente sobre tomos; partículas de conocimiento; brillo en ojos |
| **CREATING** | 8 | 2 s | ∞ en mesa | Trazado de runas que se elevan y combinan; chispas doradas; humo de frascos |
| **PRESENTING** | 6 | 1.5 s | ∞ en pizarra | Bastón recorre líneas; la línea señalada se ilumina; diagramas progresivos |
| **RESTING** | 4 | 2 s | ∞ | Sentado/meditando; respiración lenta; ajuste de postura |
| **CASTING** | 12 | 1.5 s | 1 vez | Carga → clímax → disipación; círculo rúnico en suelo; onda expansiva |
| **CONFUSED** | 6 | 2 s | 1 vez | Cabeza ladeada, se rasca, encoge hombros; "?" sobre la cabeza; partículas grises |
| **SUCCESS** | 8 | 1.5 s | 1 vez | Salto, giro, puño en alto; confeti del color del gremio; grimorio brilla |

**Totales de sprites por personaje:**
- Aprendiz: 8 dir × 6 estados = 48 frames base
- Mago Joven: 8 dir × 7 estados = 56 frames base
- Gran Sabio: 8 dir × 8 estados = 64 frames base (+ variantes de capucha)
- Archmage: 8 dir × 8 estados = 64 frames base (+ FX complejos)

---

## 5. GUÍA TÉCNICA DE PIXEL ART

### 5.1 Especificaciones
| Parámetro | Valor |
|---|---|
| Tile isométrico | 32 × 16 px |
| Sprite de mago | 32 × 32 px (vista frontal) |
| Colores por sprite | máx. 16 |
| Paleta global | 64 colores únicos |
| Transparencia | Alpha 1 bit (opaco/transparente) |
| Anti-aliasing | **Prohibido** — bordes nítidos |
| Dithering | **Prohibido** — colores sólidos |
| Alineación | Pixel-perfect a cuadrícula |
| Sub-pixel animation | Solo en efectos especiales |

### 5.2 Principios de Animación aplicados
Squash & stretch sutil · Anticipation antes de acciones mayores · Pose-to-pose como método base · Follow-through en capas y barbas · Slow in/out · Arcos de movimiento · Secondary action (pergaminos, velas) · Timing por estado · Exageración contenida · Appeal y silueta legible.

### 5.3 Referencias Obligatorias de Estudio
**Juegos:** *Chrono Trigger* (paleta y personajes) · *Final Fantasy Tactics* (isométrico e interiores) · *Tactics Ogre* (atmósfera oscura) · *Ultima Online* (interiores de gremio) · *Stardew Valley* (pixel art moderno y cálido).
**Secundarias:** *Celeste*, *Dead Cells*, *Owlboy*, *Eastward*, *Hyper Light Drifter* (partículas), *Diablo II* y *Secret of Mana* (FX mágicos).
**Arte y cultura:** manuscritos iluminados medievales, grabados de alquimia s. XVI–XVII, arte gótico, *Dungeons & Dragons Art & Arcana*, ilustraciones D&D de los 80.
**Cine:** *El Señor de los Anillos*, *Harry Potter*, *El Nombre de la Rosa*, *The Dark Crystal*.

---

## 6. EFECTOS ESPECIALES

| Efecto | Spec |
|---|---|
| **Partículas mágicas** | 2 × 2 px, color del gremio, flotación con oscilación, 1–2 s, fade gradual |
| **Runas arcanas** | 16 × 16 px, geometría simple, rotación lenta + pulso, blanco con borde del gremio |
| **Círculos de invocación** | 32 × 32 px, anillos concéntricos con runas en rotación opuesta, núcleo brillante |
| **Luz de antorcha** | Llama de 4 frames, halo cálido `#ffa500` |
| **Brillo de grimorio** | Pulso sincronizado con actividad real del agente |

---

## 7. CHECKLIST DE APROBACIÓN Y PIPELINE DE PRODUCCIÓN

### 7.1 Criterios
- [ ] Coherencia 16-bit SNES y proyección iso 2:1 en todos los assets
- [ ] Paletas dentro del límite (16 por sprite / 64 global)
- [ ] Silueta de rango identificable sin color
- [ ] Color de gremio aplicado sin romper la armonía de la sala
- [ ] Las 8 direcciones completas por personaje
- [ ] Animaciones legibles a tamaño real en pantalla
- [ ] Atmósfera madura; cero deriva infantil
- [ ] Estaciones distinguibles por forma, no solo por color (accesibilidad)

### 7.2 Fases de Producción (post-aprobación)
1. **Fase 1 — Bloques base:** tile de suelo/pared, librería, mesa, pizarra, puerta, ventanal.
2. **Fase 2 — Aprendiz completo:** 1 gremio piloto (Anthropic) con todos los estados y direcciones.
3. **Fase 3 — Validación en escena:** composición de sala completa con iluminación y FX.
4. **Fase 4 — Escalado de rangos:** Mago Joven → Gran Sabio → Archmage.
5. **Fase 5 — Escalado de gremios:** repintado paletizado de los 7 gremios sobre las bases aprobadas.
6. **Fase 6 — FX y pulido:** partículas, círculos rúnicos, props animados, pass final de iluminación.

### 7.3 Herramientas Autorizadas
**Pixel art:** Aseprite (principal), GraphicsGale, Pyxel Edit, Piskel.
**Paletas:** Lospec, Coolors, Adobe Color.
**Referencias:** Pinterest, ArtStation, Lospec galleries.
**Prohibido:** cualquier generador de imágenes por IA para assets finales o concept art.

---

## 8. APÉNDICE A — INSPIRACIÓN CROMÁTICA POR GREMIO

| Gremio | Inspiración visual | Texturas de referencia |
|---|---|---|
| Anthropic | Monasterios, pergaminos, tinta sepia | Roble oscuro, cera de vela, piedra caliza |
| OpenAI | Laboratorios, pantallas, precisión | Cristal pulido, metal cepillado, acero |
| Gemini | Llamas, estrellas, energía solar | Superficies incandescentes, rubíes, bronce |
| DeepSeek | Océano profundo, noche, cuevas | Agua oscura, roca húmeda, niebla nocturna |
| Qwen | Jade, bambú, templos zen | Jade pulido, hojas, agua clara, musgo |
| Copilot | Circuitos, fibra óptica, redes | PCB, LEDs, interfaces, metal frío |
| Meta | Amatista, runas, conocimiento oculto | Terciopelo, piedra rúnica, humo mágico |

---

## 9. DECLARACIÓN DE DIRECCIÓN CREATIVA

Este documento convierte la orquestación de LLMs en un lugar habitable: cada token es un gesto, cada commit un hechizo, cada error un hechizo que se rompe en la pizarra. La estética 16-bit no es nostalgia: es **restricción disciplinada**, el mismo espíritu que el manifiesto *Spellcode* aplica a los prompts. Ningún píxel sobra; ningún token tampoco.

*Documento vivo. Toda propuesta de mejora visual que respete los principios del §1.2 es bienvenida.*

---

**Versión:** 1.0 · **Estado:** APROBADO · **Próximo hito:** Fase 1 de producción en Aseprite.
