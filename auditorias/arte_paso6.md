# Arte GBC · paso 6, ronda 1

23/10/2026 · Estado: 6a (v1.6.0), la primera parte del 6b (v1.6.1, §5) el resto del 6b con el 6c (v1.6.2, §6) el cierre (v1.6.3, §7) y el arte definitivo (v1.6.4, §8) entregados para revisión de Pol.

## 0. Decisiones de Pol

Pol aprobó todo lo recomendado en la propuesta:
- Planta de cruz griega en 14 × 14, con las esquinas recortadas, para mantener la sala a ×3.
- El reparto de zonas:
  - ábside al fondo, con la pizarra en el muro y un rosetón;
  - librería en un brazo y sala de descanso en el otro;
  - en el crucero, la mesa de pociones;
  - en la nave, el Archimago;
  - en el nártex, la puerta y la cola.
- La paleta libre de sprites, para el gremio desconocido.
- Un Archimago más alto que los demás (16 × 32).
- Tocar el motor para que lea la geometría de `meta.json`.
- El kit de interfaz, para la ronda 2.

## 1. Parche 6a: gremios y magos

**Gremios.**
- Copilot sale del arte (paleta, estandartes y hojas).
- `gemini` pasa a `google`, como en el contrato.
- La octava paleta de sprites, que quedó libre, es la del gremio desconocido: grises de piedra, con un emblema «?».
- Las paletas `.gpl` son ahora las seis de los fabricantes y la del desconocido.

**Rangos por silueta**, además del color (`gbc.py`, `frame`):

| Rango | Silueta |
| --- | --- |
| Aprendiz | Sombrero sin punta y bastón corto, con el orbe 4 px más abajo |
| Mago Joven | Sombrero entero con una cinta clara sobre el ala |
| Gran Sabio | Estrella en el sombrero, orbe grande y barba 2 px más larga |
| Archimago | Como el Gran Sabio, con el cono del sombrero el doble de alto: 16 × 32 |

**Nueve poses en 8 direcciones**, de 4 fotogramas cada una:

| Pose | Qué se ve |
| --- | --- |
| idle y walk | Las de siempre |
| work | Orbe encendido y chispa que gira |
| read | Libro abierto en el pecho, con una página que pasa |
| write | Pluma en la mano y la punta que se mueve |
| present | Se inclina hacia delante y el orbe chispea |
| confused | La cabeza se tambalea |
| celebrate | Salta y suelta chispas |
| sit | Más bajo y sin pies |

En las vistas de espaldas no se ven ni el libro ni la pluma.

**El motor.** La pose sale del estado del mago (`world.stateOf`, paso 4): leyendo → read, escribiendo → write, presentando → present, confuso → confused, celebrando → celebrate, y descansando o esperando en el sillón → sit. El Archimago usa su sprite alto, sigue levitando y conserva sus libros.

**Exportación.**
- Una hoja por rango y pose en `02_characters/<rango>/`, con la paleta de Anthropic. Cualquier otro gremio son los mismos píxeles con su `.gpl`, igual que hace la sala.
- Las 14 hojas por gremio del Aprendiz se sustituyen por estas 29.
- En total, 77 piezas.

## 2. Validación

| Comprobación | Resultado |
| --- | --- |
| `check.py` | 77 piezas, 0 errores; escenario de 25 colores y gremios de 6 (2 × 3) |
| `apps/room/build.py --check` | Al día (`assets.gen.js`, 403 KB por los atlas de 9 poses) |
| `npm test` | 89 tests y 5178 comprobaciones de la sala |
| `node tools/smoke.mjs` (Chromium) | 50/50, sin errores de consola |
| Capturas | `auditorias/img/arte/paso6a_rangos_poses.png` (los cuatro rangos en las nueve poses) y `auditorias/img/arte/paso6a_sala_x3_sin_crt.png` (la sala a ×3) |

**Sin comprobar a mano.** La pose sentada sobre el sillón se dibuja encima de él sin recortes; se verá mejor con los bancos de la sala de descanso (6b).

**Puntos débiles que siguen:** el perfil (nariz y barba), la espalda y la joroba. Llegarán en 6b o con tus retoques.

## 3. Siguiente: 6b, la sala en cruz

Cruz griega en 14 × 14 con las esquinas recortadas, con:
- muros con esquinas interiores;
- vidrieras con su luz de color;
- la pizarra en el muro del ábside;
- bancos de descanso en un brazo;
- la mesa con pociones animadas;
- el orbe de salud y el reloj de arena;
- el nártex con la cola.

El motor pasa a leer la rejilla, las estaciones y la puerta de `meta.json`.

## 4. Pruebas para Pol

1. Aplicar los parches en orden:

   ```sh
   git am paso-4.patch paso-5.patch paso-5b.patch paso-6a.patch
   ```
2. `codewizards demo`: lanzar un hechizo y mirar a los magos leer, escribir, presentar, celebrar y sentarse.
3. Abrir `codewizards-art/02_characters/grand_sage/Grand_Sage_Read_Sheet.png` en Aseprite y cargarle `palettes/gbc_gremio_qwen.gpl`.

## 5. Parche 6b, primera parte: la sala en cruz (v1.6.1)

**La planta.**
- Una cruz griega de 14 × 14 tiles con las cuatro esquinas de 4 × 4 recortadas: 240 × 168 px.
- El generador (`gbc.py`) pinta:
  - el zócalo bajo los bordes delanteros abiertos;
  - el suelo, solo dentro de la cruz;
  - los seis tramos de muro que ve la cámara (`WALLS`), cada uno con su remate y su grosor al final.
- Hay esquinas interiores en (0, 4) y (4, 0) y un pilar exterior en (4, 4).
- Con la cámara isométrica, los brazos de la cruz salen en diagonal en la pantalla. Así quedan las zonas:

  | Zona | Dónde | Qué hay |
  | --- | --- | --- |
  | Librería | Brazo de arriba a la izquierda | Las dos estanterías |
  | Ábside | Brazo de arriba a la derecha | El ventanal, un estandarte, una antorcha y la pizarra |
  | Descanso | Brazo de abajo a la derecha | El sillón |
  | Crucero | Centro | La mesa, la alfombra y el Archimago |
  | Nave | Brazo de abajo a la izquierda | La puerta, en su muro |
  | Cola | Fuera de la puerta | En la esquina recortada |

**El motor lee la planta del arte.**
- `gbc.PLAN` contiene lo que bloquea el paso, las plazas de cada estación, el Archimago, la puerta, la entrada y las posiciones de la cola.
- `apps/room/build.py` lo escribe en `apps/room/src/plan.gen.js`, y `--check` comprueba que esté al día.
- `world.js` deja de tener geometría propia. El núcleo (sala demo), la página y los tests cargan `plan.gen.js` antes que `world.js`.
- Los magos que esperan fuera de una sala llena se dibujan en fila junto a la puerta (los cuatro primeros).

**Que siga a ×3.**
- La sala es más grande, así que el grimorio cabe ahora en una fila y los paneles laterales parten algo más estrechos (260 y 320 px).
- Resultado: ×3 en 1440 × 900 y ×4 en 1920 × 1080, comprobado por la prueba de humo.

**Validación.**
- `check.py`: 77 piezas, 0 errores.
- `npm test`: 89 tests y 5589 comprobaciones de la sala. Hay comprobaciones nuevas:
  - la cruz;
  - que la puerta abra a una casilla libre;
  - que la cola quede fuera de la sala;
  - que cada estación sea alcanzable desde la entrada.
- Prueba de humo: 50/50.
- Captura: `auditorias/img/arte/paso6b_sala_cruz_x3_sin_crt.png`.

**Falta del 6b (segunda parte):**
- las vidrieras de colores con su luz;
- la pizarra colgada en el muro del ábside (hoy está de pie delante del muro);
- los bancos de la sala de descanso;
- las pociones animadas con partículas;
- el orbe de salud y el reloj de arena.

## 6. Resto del 6b y el 6c (v1.6.2)

Pol pidió completar la sección, con todos los muebles en perspectiva, y crear ya el arte de la interfaz con la estética de la sala.

**Sala.**

| Pieza | Cómo es |
| --- | --- |
| Vidriera | En el muro del brazo de la librería (y = 4). Cada tile de 8 × 8 es de una familia de color (una paleta de fondo de la GBC), con plomos en el oscuro. La luz del suelo toma el color de su panel |
| Pizarra | Colgada del muro del ábside (y = 0), pintada sobre el propio plano del muro, con marco de madera y bandeja. La tiza sigue la pendiente del muro: 1 px hacia abajo por cada 2 hacia la derecha. Deja de ser un mueble que bloquea el paso, y los magos presentan delante del muro |
| Bancos | Dos bancos de madera en el brazo de descanso, en perspectiva (cajas isométricas); los magos que esperan cuota se sientan delante. El sillón pasa al borde del crucero |
| Orbe de salud | Pedestal de piedra en la esquina del crucero. El motor pinta el orbe en verde, amarillo o rojo según la salud del proyecto, con un brillo que late |
| Reloj de arena | Sobre la mesa: 5 fotogramas generados, que van de la arena arriba a abajo según lo que falta para renovar la ventana de 5 h |
| Pociones | Burbujas de colores que suben de la redoma y del caldero |

**Interfaz (6c).**
- Marcos de panel de 24 × 24 en nueve trozos, con piedra, oscuro y tachones de oro; se pintan a ×2 con `border-image`.
- Nueve iconos de 8 × 8 a ×2: tareas, maná, salud, tiempo, Archimago, torre, pergamino, pluma y pizarra.
- Un cursor de varita de 16 × 16 a ×2.
- Todo sale del generador y `apps/room/build.py` lo escribe en `apps/room/src/ui.gen.css` como imágenes `data:`, que la CSP permite. `--check` vigila que esté al día.

**Validación.**
- `check.py`: 77 piezas, 0 errores.
- `npm test`: 89 tests y 5738 comprobaciones de la sala.
- Prueba de humo: 50/50, con la sala a ×3 en 1440 × 900.
- Contraste: todos los pares en verde.
- Sin errores de consola.
- Capturas: `auditorias/img/arte/paso6b_sala_completa_x3_sin_crt.png` y `auditorias/img/arte/paso6c_interfaz.png`.

**Pendiente.**
- La fuente de píxel propia de la interfaz.
- Los puntos débiles del mago (perfil, espalda y joroba).
- Los iconos y el cursor, a la espera de tus retoques en Aseprite: hoy viven en el generador.

## 7. Cierre del paso (v1.6.3)

Pol pidió:
- todo lo pendiente de una vez;
- vigilar la perspectiva en la cruz, o volver a la sala rectangular si no salía bien;
- revisar las partículas;
- una interfaz integrada con la sala y con estética GBC.

Me dio libertad creativa total.

**Referencias.**
- [Wikipedia, «Volumetric lighting»](https://en.wikipedia.org/wiki/Volumetric_lighting): el cono de luz se modela como un volumen transparente que contiene polvo o niebla.
- [Godot Shaders, «Pixelated God Rays»](https://godotshaders.com/shader/pixelated-god-rays/): los rayos se desvanecen hacia abajo y hacia los bordes, con un tramado opcional para el aire retro.
- [Clip Studio Tips, «Creating a Ray of Light Effect»](https://tips.clip-studio.com/es-es/articles/1918?org=1): motas de polvo cerca de los rayos de luz.

De ellas tomo el principio, no el código: el volumen entre la vidriera y su mancha de luz, tramado píxel sí píxel no, con motas dentro.

**Perspectiva.** Se mantiene la cruz; los dos problemas tenían arreglo.
- **Las estanterías se pisaban.** Medían 3 tiles cada una en un muro de 6, así que se tocaban y se leían como un solo bloque plano. Ahora miden 3 y 2, con un hueco y una antorcha entre ellas, y la segunda se lee claramente más abajo del muro.
- **La pizarra estaba demasiado alta.** Baja a la altura del mago (de 6 a 21 px sobre el suelo) y queda centrada en el muro del ábside, pintada sobre su plano, con la bandeja como una caja isométrica.

**Partículas.**
- Haces de luz: un volumen por columna de la vidriera, calculado en el build con la misma proyección que la mancha del suelo y del color de su panel. Se pinta una vez, tramado píxel sí píxel no, y cada fotograma se suma con una respiración lenta. Dentro flotan motas de polvo.
- Magos: motas que suben del orbe mientras trabajan, leen, escriben, presentan o celebran, y polvo en los pies al andar.

**Interfaz integrada.** Una sola pantalla de juego:
- El fondo de la página es la oscuridad de la sala.
- Los paneles son pergamino en marcos de piedra.
- Títulos, etiquetas y botones de acción usan la fuente de píxel.
- Los botones son de madera biselada, el principal de oro y aprobar o rechazar en verde o rojo, como los menús de la GBC.
- Las tarjetas de tarea, el código y el registro siguen en una letra legible.
- La fuente de píxel sale de la fuente de tiza de la pizarra (`font.py`), con tildes y la eñe. Se genera como TrueType con fechas fijas, para que el build salga idéntico cada vez, y va en `ui.gen.css`; la CSP del núcleo admite `font-src 'self' data:`.
- El contraste se vuelve a medir con el diseño nuevo, y todo pasa.

**El mago.** La nariz de perfil es 1 px más larga y las espaldas tienen un brillo que dibuja la joroba.

**Decisión de criterio.** El musgo sigue dentro del tile de suelo y de muro, con la paleta verde. Una GBC real lo pondría en un tile aparte, pero la GBC es nuestra referencia de estilo, no la máquina en la que corre esto; separarlo empeoraría la imagen sin ganar nada.

**Validación.**
- `check.py`: 77 piezas, 0 errores.
- `apps/room/build.py --check`: reproducible.
- `npm test`: 89 tests y 5716 comprobaciones de la sala.
- Prueba de humo: 50/50, sin errores de consola.
- Contraste: todos los pares en verde.
- Capturas: `auditorias/img/arte/paso6d_sala_x3_sin_crt.png` y `auditorias/img/arte/paso6d_interfaz_gbc.png`.

**Lo que queda para tus retoques a mano:**
- los iconos y el cursor;
- la fuente, que solo tiene mayúsculas de 3 × 5;
- las poses de leer y escribir, que a ×3 todavía se leen poco.

## 8. Arte definitivo (v1.6.4)

Pol revisó la v1.6.3:
- La pizarra estaba mal: pequeña, apretada entre un estandarte y una antorcha, con un marco de una línea, y tapada por los magos.
- La cruz no convence.
- La sala tiene que ocupar casi toda la pantalla, con la interfaz dentro y sin taparla, como pergaminos que se enrollan.

Este arte es la versión para publicar.

**La sala**, rectangular de 16 × 12 tiles.

| Zona | Qué hay |
| --- | --- |
| Muro izquierdo | La librería (dos estanterías de distinto largo, con antorchas), un estandarte y la puerta cerca del borde delantero |
| Muro del fondo | Dos vidrieras góticas con la pizarra entre ellas |
| Suelo | La mesa con pociones y reloj, el círculo del Archimago con su alfombra, el pedestal del orbe junto a la pizarra, y la zona de descanso con dos bancos y el sillón delante a la derecha |

Los magos que presentan se ponen a los lados de la pizarra, no delante, para no taparla.

**La pizarra**, hecha como un objeto:
- un tablero de pizarra de 48 × 24 px con polvo y una mancha de borrado;
- un marco grueso de madera con luz de la ventana (claro arriba y a la izquierda, oscuro abajo y a la derecha);
- separada del muro, de modo que se ven su canto superior y el derecho;
- una bandeja con tres tizas y un borrador.

Lo que presentan los magos se escribe con tiza: el título de la tarea en la fuente de tiza de 3 × 5, siguiendo la pendiente del muro, con la línea más reciente en el color de su gremio.

**Las vidrieras.**
- Arco apuntado de verdad: cada mitad es un arco centrado en el arranque del otro lado.
- Mosaico de paneles (celdas de Voronoi, cada una de una familia de color GBC) unidos por plomos finos, con un parteluz de piedra y dos plomos horizontales.
- Cada vidriera echa su luz de colores en el suelo y tres haces con polvo, del color dominante de cada columna.

**La interfaz, dentro de la sala.**
- La sala se dibuja a la mayor escala entera que cabe en la ventana: ×5 en 1440 × 900 y ×6 en 1920 × 1080.
- Los cuatro paneles son pergaminos colgados en las esquinas vacías: encima de los dos muros del fondo y debajo de los dos bordes delanteros del suelo.

  | Esquina | Pergamino |
  | --- | --- |
  | Arriba a la izquierda | Tareas, con lo hecho, «Por hacer» y los archivos |
  | Arriba a la derecha | La pizarra de revisión |
  | Abajo a la izquierda | El grimorio, «Lanza un hechizo…» |
  | Abajo a la derecha | El pergamino del registro, con maná y salud |

- El tamaño de cada pergamino se calcula con las propias líneas de la sala, así que nunca tapa un muro ni el suelo; lo que no cabe se desplaza dentro del papel.
- Cada pergamino se enrolla y desenrolla desde su varilla, y se recuerda.
- La placa de controles va bajo la esquina delantera del suelo. La Torre es un pergamino grande desplegado sobre la sala.
- El arte de los pergaminos sale del generador: varilla torneada, remates dorados, pergamino envejecido con bordes rotos en nueve trozos y papel enrollado.
- En pantallas estrechas, la sala va arriba y los pergaminos debajo.
- `CW.coversRoom()` comprueba que nada tapa la sala, y lo usa la prueba de humo.

**Validación.**
- `check.py`: 77 piezas, 0 errores.
- `npm test`: 89 tests y 5782 comprobaciones de la sala (la rectangular, puerta, plazas sin repetir).
- Prueba de humo: 52/52. Incluye:
  - ×5 y ×6 sin tapar la sala;
  - enrollar y desenrollar;
  - La Torre;
  - sin errores de consola.
- Contraste: todos los pares en verde.
- Capturas en `auditorias/img/arte/`:
  - `paso6e_pantalla_completa.png`;
  - `paso6e_sala_x3.png`;
  - `paso6e_la_torre.png`.
