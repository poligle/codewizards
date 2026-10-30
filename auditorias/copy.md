# Copy y lenguaje · paso 7 · manual de tono

30/10/2026 · cierre del paso 7 (v1.7.1). El producto habla solo inglés (decisión de Pol); este manual va en español y sus ejemplos, en inglés.

## 0. En pocas líneas

- **Una cosa, un nombre**, en todas las pantallas. La sala, la ayuda del CLI, `docs/glossary.md` y la web (paso 8) salen de un solo fichero: `apps/room/src/words.js`. La CI lo comprueba con `node tools/glossary.mjs --check`.
- **Primero claro, después gracioso.** La metáfora nunca esconde un coste, un riesgo ni dónde acaba un cambio.
- **Los gremios tienen nombre propio** y el fabricante es un dato, con un aviso de no afiliación.

## 1. Lectura (inventario)

- Textos de la sala: `apps/room/src/index.html` (etiquetas y significados al pasar el ratón) y la tabla `T` de `apps/room/src/ui.js` (estados, avisos y errores).
- Textos del núcleo que llegan a la sala: los motivos del Archimago (`apps/core/src/router/router.js`) y los mensajes de fallo (`apps/core/src/rooms/claude-room.js`).
- Ayuda del CLI: `HELP` en `apps/core/src/cli.js`.
- Antes de este cierre, cada significado vivía en un `title` escrito a mano, y los gremios se llamaban como sus fabricantes (`NAMES` en `apps/room/build.py`).

## 2. La voz

La torre habla como un mago viejo que sabe programar: técnica y precisa, con humor de desarrollador contenido. Frases cortas y verbos corrientes; sin exclamaciones, sin emojis y sin infantilismo. El lema marca el tono: «Do not vibecode. Spellcode.»

| Sí | No |
| --- | --- |
| The spell fizzled: Claude Code is not signed in. | Oops! Something went wrong 😅 |
| Out of mana: resting on the bench until 14:05, then it carries on. | Your quota is exhausted!!! |
| An illusion: the wizards are simulated. No model is called and no mana is spent. | Demo mode activated ✨ |

## 3. Reglas

1. **Una cosa, un nombre.** Si ya existe una palabra de la torre para algo, se usa esa en todas partes: en la sala, en el CLI, en la web y en la documentación. Las palabras nuevas se añaden a `words.js`, nunca sueltas en una pantalla.
2. **Cada palabra mágica lleva su significado** al pasar el ratón, con la forma «Word: Plain sentence.» En la sala se marca con `data-term="id"` (y `data-hint` para una instrucción extra, como «Drag to move; press to roll up.»); `ui.js` escribe el `title` desde `words.js`.
3. **La metáfora no esconde costes ni riesgos.** Maná dice que es la cuota del plan; la ilusión dice que no llama a ningún modelo ni gasta maná; sellar dice que es un merge por avance rápido y que nunca se fuerza; el gremio dice de quién son los modelos.
4. **Errores y avisos: primero claros, después graciosos.** Primero qué ha pasado y qué hacer, en llano; la gracia, si cabe, al final y en pocas palabras. No piden perdón ni culpan al usuario.
5. **Botones: un verbo en imperativo**, el mismo en todo el recorrido: Bless → blessed, Send back → sent back, Break → broken, Seal into my branch → sealed.
6. **Estados en minúscula**, como participio o adjetivo: noted, blessed, fizzled, out of mana.
7. **Mayúsculas de frase** (sentence case) en botones, títulos y avisos. Van en mayúscula solo los nombres propios de la torre: The Tower, los rangos y los gremios.
8. **Lo técnico se queda técnico** cuando el usuario lo teclea, lo copia o lo busca: branch, commit, diff, `git merge cw/…`, ids de modelo, rutas y comandos. La crónica muestra los eventos tal cual (`agent.summoned · anthropic · aprendiz`): es el dato.
9. **Inglés británico**, como el resto del copy: colour, vigour, judgement, synthesised.
10. **Cifras con su unidad** y sin redondeos engañosos: `3.2k`, `5-hour window`, `42 %`.

## 4. Vocabulario

La lista completa, con el término técnico de cada palabra, está en `docs/glossary.md` (generado). Lo esencial:

| Palabra | Qué es |
| --- | --- |
| Tower | CodeWizards en el ordenador del usuario (el núcleo local) y la lista de salas |
| Room | un repositorio |
| Wizard | un agente: una ejecución de Claude Code en una tarea |
| Guild | el fabricante de los modelos, con nombre propio |
| Apprentice, Young Mage, Grand Sage, Archmage | los rangos (`aprendiz`, `joven`, `sabio`, `archimago`) |
| Arcana · Focus | el modelo · el esfuerzo (Light, Calm, Deep, Deeper, Absolute) |
| Spell · Spell book · Cast | la petición · el cuadro donde se escribe · lanzarla |
| Quest | una tarea, en su propia rama |
| Blackboard · Judgement | la revisión del diff · el veredicto |
| Bless · Send back · Break · Seal | aprobar · rechazar · detener · integrar (merge por avance rápido) |
| Mana · Hourglass · Tower vigour | la cuota · lo que falta para que se renueve · la salud del proyecto |
| Chronicle · Notes · Tomes | el registro de eventos · las notas · los ficheros del repo, en solo lectura |
| Illusion | la demo |

## 5. Los gremios

| Id del contrato | Nombre | Color | Fabricante (dato) | Modelos |
| --- | --- | --- | --- | --- |
| `anthropic` | Amber Order | ámbar | Anthropic | Claude, con Claude Code |
| `openai` | Cerulean Circle | cerúleo | OpenAI | GPT |
| `google` | Crimson Synod | carmesí | Google | Gemini |
| `deepseek` | Indigo Lodge | índigo | DeepSeek | — |
| `qwen` | Jade Cloister | jade | Alibaba Cloud | Qwen |
| `meta` | Violet Conclave | violeta | Meta | Llama |

- **Crimson Synod en lugar de Crimson Court.** «The Crimson Court» es una expansión de Darkest Dungeon, y la tienda Mac Game Store la presenta como marca de Red Hook Studios (https://www.macgamestore.com/product/15439/Darkest-Dungeon-The-Crimson-Court/). En un producto con estética de juego, el choque es evidente. Pol aceptó el cambio el 30/10/2026; volver atrás es cambiar una línea de `words.js`.
- **Comprobaciones** (búsquedas web del 30/10/2026; no es una búsqueda de marcas ni asesoramiento legal):
  - Crimson Court: conflicto, como se explica arriba.
  - Crimson Synod: no se encontró en uso.
  - Violet Conclave: no se encontró ningún producto con ese nombre.
  - Cerulean Circle: solo usos ajenos al software (un gremio de una partida de D&D en StartPlaying y un círculo de donantes de una fundación universitaria).
  - Amber Order, Indigo Lodge y Jade Cloister: sin buscar (encargo para el paso 8).
- **Criterios**: ningún nombre alude al fabricante ni a sus modelos (lo comprueban `tools/glossary.mjs` y `apps/core/test/words.test.js`); el color es el del arte; el emblema, propio.
- **Qwen** es de Alibaba Cloud: el dato dice Alibaba Cloud, y el id del contrato sigue siendo `qwen`.
- **Aviso de no afiliación**: «CodeWizards is an independent open-source project, not affiliated with, endorsed or sponsored by Anthropic, OpenAI, Google, DeepSeek, Alibaba Cloud or Meta. Their names only say whose models a guild's wizards use, and their trademarks are theirs.» Sale en `codewizards --help`, al pie de la Torre, en `docs/glossary.md` y, en una versión corta, al pasar el ratón por cada gremio («Amber Order: Anthropic's Claude models, through Claude Code. Not affiliated with Anthropic.»). La web (paso 8) y el README (paso 9) lo repiten.

## 6. Cambios de este cierre

| Dónde | Antes | Después |
| --- | --- | --- |
| Tareas y pizarra | Anthropic · Apprentice | Amber Order · Apprentice; en la pizarra, Amber Order (Anthropic) |
| Grimorio | Young, Sage | Young Mage, Grand Sage |
| Ficheros del repo | Repo tomes | Tomes |
| Pista de la demo | …no oracle is consulted | No model is called and no mana is spent. |
| Ayuda del CLI | La Torre; `--rank aprendiz\|joven\|sabio` | The Tower; `--rank apprentice\|young\|sage` (los ids siguen valiendo) |
| Significados al pasar el ratón | `title` escritos a mano, cada uno con su redacción | `data-term`, con el texto del glosario |
| Gremios en la ayuda y en la Torre | sin aviso | aviso de no afiliación |

«Oracle» desaparece: era un segundo nombre para el modelo, que ya es Arcana.

## 7. Cómo se añade o se cambia un texto

1. Si es una palabra de la torre, va en `words.js` con su término técnico y su significado; en la sala se usa con `data-term` o con `W` en `ui.js`.
2. `npm run glossary` reescribe `docs/glossary.md`; se sube junto con el cambio.
3. Antes de darlo por bueno: ¿ya hay un nombre para esto?, ¿se entiende sin conocer la metáfora?, ¿dice el coste o el riesgo, si lo hay?, ¿cabe en la sala a ×3?
4. Un término nuevo en el contrato (gremio, rango o esfuerzo) sin palabra hace fallar la CI.

## 8. Validación

- `npm test`: 96/96, con 4 pruebas nuevas en `apps/core/test/words.test.js`; `room.test`: 6040/6040.
- Prueba de humo en Chromium: 63/63 smoke checks passed, con 4 comprobaciones nuevas: el nombre propio del gremio en las tareas, el fabricante al pasar el ratón, el fabricante en la pizarra y el significado de Bless.
- `tools/glossary.mjs --check`, `build.py --check` y el contraste WCAG 2.2 AA, en verde.
- Sin comprobar: Firefox (no está en este contenedor) y Claude Code real; ninguno de los cambios toca el adaptador.

## 9. Lo que queda

- Los mensajes de error que vienen de Claude Code llegan tal cual, con su redacción.
- `build.py` sigue escribiendo `names` (los fabricantes) en `assets.gen.js`, aunque la sala ya no lo usa. Se quitará la próxima vez que se regenere el arte: hacerlo ahora añadiría unos 850 KB al parche, porque `assets.gen.js` es una sola línea.
- Revisar los textos largos de los pergaminos en la prueba con 3–5 desarrolladores (guion en `auditorias/uiux.md`).
