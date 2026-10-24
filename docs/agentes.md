# CodeWizards · Plan de desarrollo y agentes

22/10/2026 · Pol · Versión de trabajo en Claude Docs: https://claude.ai/artifact/Gfr9o8cdzQKmv2PRePeHRS

## Cómo usar este documento

Este documento es el `docs/agentes.md` de CodeWizards: contexto común, protocolo, hoja de ruta y el prompt de cada agente.

1. Vive en el repo como `docs/agentes.md` (repo iniciado el 22/10/2026, antes del hito 2). Cuando cambie la versión de trabajo en Claude Docs, se exporta a Markdown y se sustituye aquí.
2. La maqueta (hito 0) se hace en el Proyecto de claude.ai. Los agentes especializados (hito 1) trabajan después, cada uno en un chat nuevo y con el repo en el estado que dejó el anterior.
3. Cada agente arranca con el mensaje de abajo, cambiando rol, paso y ronda.
4. Cada agente presenta su propuesta y espera el «adelante» de Pol antes de tocar código o arte.
5. Al terminar, Pol revisa el informe en `auditorias/`, los cambios, `COMMIT_MSG.txt` y la entrada en `auditorias/traspaso.md`, y aplica la entrega con `git am` (va como parche de git para que también lleguen los borrados).

Mensaje de arranque para cada agente:

```markdown
Lee entero docs/agentes.md: contexto común, protocolo, hoja de ruta y orden de trabajo.
Eres el agente de <ROL>. Tu paso es el <N> de 9, ronda <R>.
Antes de proponer nada, lee auditorias/traspaso.md.
Sigue tu prompt (sección <X>) y el protocolo común. Responde en español.
```

Si un agente necesita algo de un paso anterior, lo anota en `traspaso.md` como encargo y sigue; no rehace el trabajo de otro.

## Contexto común del proyecto

CodeWizards es una app local y open source que dirige los CLI oficiales de agentes de código (Claude Code primero) con las cuentas del propio usuario, y muestra su trabajo como una torre de magos en pixel art isométrico: cada proyecto es una sala y cada agente, un mago. `codewizards.app` será la página de descarga. Lema: «Do not vibecode. Spellcode.»

### Qué es

- **La sala**: 12 × 12 tiles con librería (leer contexto), mesa de laboratorio (escribir código) y pizarra (presentar entregables y revisarlos).
- **Los magos**: un gremio por fabricante de modelos (nombre de fantasía, color y emblema; el fabricante, como dato) y un rango por potencia del modelo: Aprendiz, Mago Joven, Gran Sabio y un Archimago único que orquesta.
- **Las cuentas**: cada mago trabaja con una cuenta del usuario, a través de un CLI oficial: su plan de Claude con Claude Code, su plan de ChatGPT con Codex, la cuota gratuita de Google con su CLI… o una clave de API opcional. El maná es la cuota que queda en cada cuenta.
- **La propuesta**: control frente al «vibecoding». Cada acción de un agente es un hechizo auditado, nada entra sin revisión y cada tarea va a la cuenta con cuota adecuada. CodeWizards no tiene servidor y no guarda claves, tokens ni código.

### Estado a 22/10/2026

- Concepto de partida en `docs/concepto/contexto_general.md` (v3.2), anterior al estilo GBC y a la app local; donde choque con este plan, manda el plan.
- Ronda 1 de arte (SNES) y sus documentos: retirados en v1.1; siguen en el tag `v1.0`, en `codewizards-art/legacy/snes-ronda1/`.
- Arte de la Fase 1 en estilo GBC: 64 assets en `codewizards-art/`, validados con `check.py`.
- Maqueta v0 del hito 0: sala, grimorio, pizarra y pergamino con agentes simulados. Hito 0 cerrado (tag `v1.0`). Desde v1.2 es la sala de la app, en `apps/room/`.
- Seguridad del repo y CI: escaneo de secretos, acciones fijadas por SHA y ajustes de GitHub (`auditorias/seguridad.md`).
- Paso 1 (producto y marca) hecho en v1.1: `auditorias/producto.md`.
- Paso 6 (arte GBC, ronda 1):
  - Parche 6a en v1.6.0 (23/10/2026): gremios del contrato (sin Copilot, `google` y paleta del desconocido), rangos por silueta, Archimago de 16 × 32 y nueve poses en 8 direcciones.
  - Primera parte del 6b en v1.6.1 (24/10/2026): la sala en cruz griega de 14 × 14 y el motor leyendo el plano del generador (`plan.gen.js`).
  - Resto del 6b y el 6c en v1.6.2 (24/10/2026), adelantado a petición de Pol: vidriera de colores con su luz, pizarra colgada del muro del ábside, bancos, orbe de salud, reloj de arena, pociones que burbujean y el kit de interfaz (marcos, iconos y cursor).
  - Arte definitivo en v1.6.4 (25/10/2026): la sala vuelve a ser rectangular (16 × 12) y ocupa la pantalla; los paneles son pergaminos enrollables en las esquinas vacías de la sala. Detalle en `auditorias/arte_paso6.md` §8.
  - Cierre del paso en v1.6.3 (24/10/2026): haces de luz y polvo desde la vidriera, partículas de los magos, fuente de píxel propia, la interfaz integrada con la sala (pantalla de juego GBC) y la perspectiva corregida (estanterías y pizarra). Paso 6 terminado; detalle en `auditorias/arte_paso6.md` §7. Detalle en `auditorias/arte_paso6.md`.
- Paso 5 (UI/UX) hecho en v1.5.0 y v1.5.1 (23/10/2026). Ronda 1: explorador de archivos de solo lectura, diff por fichero, motivos del Archimago en español, Ctrl + Intro para lanzar y movimiento reducido. Ronda 2: «La Torre» (`codewizards` sin orden: entrar en una sala o fundarla sobre un repo existente o en uno nuevo), el núcleo con varias salas a la vez, y el contraste medido (WCAG 2.2 AA) en la CI. Queda la prueba con 3 a 5 desarrolladores, que tiene su guion. Detalle en `auditorias/uiux.md`.
- Paso 4 (simulación y comportamiento, ronda 1) hecho en v1.4.0 y validado por Pol (23/10/2026): máquina de estados del mago, colas en las estaciones, ritmo con fusión de ráfagas y puesta al día, aforo de 10 magos con espera fuera de la puerta, y salud del proyecto, magos fuera y reloj de la ventana en el panel. Detalle en `auditorias/simulacion.md`.
- Paso 3 (orquestación y tokens, ronda 1) hecho en v1.3.0 (23/10/2026): el Archimago v1 (reglas sin modelo y tabla de rangos en `ranks.json`), cuatro rangos con el Mago Joven, la cuota real de Claude Code como maná por cuenta, la espera por cuota, el botón de integrar, el contrato v2 y 20 evals con tests ocultos. Detalle en `auditorias/orquestacion.md`.
- Primera prueba real de `codewizards serve` (23/10/2026): Pol, en NixOS, con Claude Code 2.1.223 de nixpkgs; un «hello world» en C++ de punta a punta. Mejoras en v1.2.2: modelo real, `--merge`, `--record` y la clave de API fuera por defecto.
- Paso 2 (arquitectura y software, fase A) hecho en v1.2: núcleo local en `apps/core/` (`codewizards demo`, `serve` y `doctor`), contrato v1 en `packages/contract/`, CI con prueba de humo en Chromium y Pages solo con la demo. Detalle en `docs/arquitectura.md` y `auditorias/software.md`.

### Decisiones de Pol (no se cambian sin preguntarle)

- Estilo «parecido a Game Boy Color» con filtro CRT opcional.
- El mago: viejecito encorvado, gran sombrero, barba y bata largas; solo se le ve la nariz. Su bastón acaba en un orbe que brilla con el color del gremio.
- El arte se pinta por código, sin modelos generativos de imagen, y Pol lo retoca a mano.
- Primero una maqueta; después cada parte la especializa un agente; con una versión buena, Claude Code real con la cuenta de Pol (hito 3).
- Sala cuadrada de 12 × 12 con los dos muros del fondo visibles; un gremio por fabricante de modelos, con emblema propio.
- Los puntos débiles del arte se pulen cuando el proyecto esté más maduro.

Decididas en el paso 1 (22/10/2026; detalle en `auditorias/producto.md` §8):

- App local y open source que dirige los CLI oficiales con las cuentas del usuario (planes de pago o cuotas gratuitas); sin modelo de consumo por token; claves de API solo como opción. `codewizards.app`, página de descarga.
- CodeWizards no guarda nada: ni claves, ni tokens, ni código, y nunca toca las credenciales de los proveedores. Sin servidor propio; lo que registre la app se queda en el ordenador del usuario.
- Licencias: código MIT y arte CC BY 4.0; el nombre y el logo no se licencian.
- El producto, solo en inglés.
- Los agentes trabajan en repos de GitHub, con ramas y PR.
- 6 gremios, uno por fabricante (Anthropic, OpenAI, Google, DeepSeek, Qwen y Meta), con nombre de fantasía y el fabricante como dato. Copilot deja de ser gremio; puede volver como cuenta.

Decididas en el paso 2 (22/10/2026; detalle en `auditorias/software.md` §4):

- Empaquetado en dos fases: proceso local en Node con la sala en el navegador (paquete npm `codewizards`) hasta el hito 4; la app de escritorio se decide en el hito 5.
- Contrato de eventos v1.
- Términos comerciales de Anthropic: Pol los acepta antes del hito 3 y escribe a Anthropic para confirmar el caso (pendiente).
- En Windows nativo, los magos no tienen Bash (el sandbox de Claude Code exige WSL2).
- GitHub Pages con un workflow propio que publica solo la demo.
- Las entregas de los agentes van como parche de git (`git am`), no copiando ficheros.

Decididas el 23/10/2026, tras la primera prueba real de `serve` (`auditorias/software.md` §11):

- Al aprobar, el cambio queda en la rama de la tarea; `--merge` lo integra en la rama del usuario solo si puede hacerlo por avance rápido (fast-forward), y nunca lo fuerza.
- CodeWizards no pasa `ANTHROPIC_API_KEY` ni `ANTHROPIC_AUTH_TOKEN` a Claude Code para que pague el plan; `--use-api-key` las mantiene.
- Interfaz (paso 5): la sala debe ocupar gran parte de la pantalla, y desde la interfaz se debe poder ver el directorio del repo con sus archivos.

Decididas el 23/10/2026, en el paso 3 (`auditorias/orquestacion.md` §3):

- Cuatro rangos como el concepto: Aprendiz, Mago Joven (nuevo), Gran Sabio y Archimago. Modelo de cada uno en `ranks.json`, con Aprendiz → `haiku`, Mago Joven → `sonnet` y Gran Sabio → `opus` de partida.
- El Archimago v1 son reglas sin modelo y la elección manual en el grimorio; un Archimago con modelo solo si un eval lo justifica.
- Pol tiene el plan Pro: los evals reales empiezan por un piloto pequeño.
- Las tareas hechas desaparecen de la lista cuando su mago sale por la puerta; las que esperan a integrarse se quedan hasta que se integran.
- Solo se ven los gremios de las cuentas conectadas: de momento, solo Anthropic, también en la demo.
- Un mago sin cuota no se va: espera a que se recupere la ventana y sigue.
- Botón para integrar un cambio aprobado cuando `serve` no lleva `--merge`.
- Release automática en GitHub en cada push a `main` que traiga una versión nueva en `package.json` (el tag ya no se crea a mano).
- La extensión de VS Code, como segunda vía tras el hito 3; Firefox (y con él Zen) en la prueba de humo.
- Pendiente: crear y abrir salas desde la interfaz (sobre un repo existente o uno nuevo, eligiendo la ruta), y publicar en npm con una guía paso a paso.

Decididas el 23/10/2026, tras probar la v1.3.0 (`auditorias/orquestacion.md` §10):

- Al abrir una sala, la sala no vuelve a animar el pasado: se reconstruye del registro y solo anima lo nuevo.
- Panel de tareas en tres apartados: en curso (pendientes), hechas (historial) y por hacer (un editor de notas).
- Distribución en el navegador: la sala grande en el centro con el grimorio debajo, y un panel a cada lado que se puede estrechar o ensanchar.
- Modelo y esfuerzo se eligen: por rango en `ranks.json` (versiones fijadas: `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`, con esfuerzo bajo, medio y alto) y por hechizo en el grimorio.

Decididas el 23/10/2026, en el paso 4 (`auditorias/simulacion.md`):

- La tabla de rangos vuelve a los alias `haiku`, `sonnet` y `opus`: el Opus fijado falló porque el Claude Code 2.1.223 de Pol es anterior a ese modelo, no por el plan. La sala muestra la versión exacta que usa cada mago.
- El grimorio se abre vacío, sin hechizo de ejemplo.
- Pol pidió hacer el paso 4 sin pasar antes por la puerta de aprobación, con estos arreglos dentro.

Decididas el 23/10/2026, en el paso 6 (`auditorias/arte_paso6.md` §0):

- La sala pasa a una cruz griega en 14 × 14 con las esquinas recortadas, manteniendo ×3. Esto sustituye la sala cuadrada de 12 × 12. Se siguen viendo los muros del fondo de cada brazo.
- Zonas: ábside al fondo (pizarra en el muro y rosetón), librería en un brazo, sala de descanso en el otro, mesa de pociones en el crucero, Archimago en la nave, y puerta y cola en el nártex.
- La paleta de sprites libre es la del gremio desconocido.
- El Archimago mide 16 × 32, más que los demás.
- El motor lee la rejilla, las estaciones y la puerta de `meta.json`.
- El kit de interfaz (iconos, marcos, fuente y cursor) va en la ronda 2. Pol lo adelantó el 24/10/2026.
- 25/10/2026: la cruz no convence a Pol: la sala vuelve a ser rectangular. La sala ocupa casi toda la pantalla y la interfaz va dentro de ella sin taparla, como pergaminos que se enrollan y desenrollan. El grimorio dice «Lanza un hechizo». Este arte ya no es una maqueta: es la versión para publicar.
- 24/10/2026: Pol pide hacer todo lo pendiente del arte de una vez, vigilar la perspectiva en la cruz (o volver a la sala rectangular si no sale bien), e integrar la interfaz con la sala con estética GBC, con libertad creativa total. Se mantiene la cruz.

### Estilo vigente (GBC)

| Regla | Valor |
| --- | --- |
| Tile | 16 × 8 px, iso 2:1; 8 px por unidad de altura |
| Sala | Rectangular de 16 × 12 tiles, 240 × 168 px; muro de 40 px; ocupa la pantalla a la mayor escala entera |
| Color | RGB555 (canales múltiplos de 8) |
| Fondo | 8 paletas de 4 colores con el oscuro compartido (25 colores) |
| Magos | 16 × 24 px (el Archimago, 16 × 32); 2 paletas de 3 colores: gremio (luz, base, oscuro) y común (barba, nariz, bastón); rangos por silueta y 9 poses |
| Gremios | 6 paletas + 1 común + 1 para el gremio desconocido: las 8 paletas de sprites de la GBC |
| Luces | Alfa de 1 bit; el brillo de orbes y antorchas lo mezcla el motor |
| CRT | Barrido, rejilla RGB, resplandor, viñeta y esquinas curvas en CSS, con interruptor |
| Escalado | Siempre entero (×3, ×4…) con `image-rendering: pixelated` |

### Cómo se construye

- **Maqueta**: una página HTML con canvas, con datos simulados.
- **Producto**: proceso local en Node (`apps/core/`) que lanza los CLI oficiales sin modificar, con un adaptador por CLI que traduce su salida al contrato de eventos, y sirve la sala (`apps/room/`) al navegador en 127.0.0.1 con token. Registro de eventos local; una rama y un worktree por tarea; commit, push y PR con el `git` y el `gh` del usuario, solo tras aprobar. Sin backend propio: la página de descarga de `codewizards.app` es estática. Arquitectura: `docs/arquitectura.md`.
- **Agentes**: primero Claude Code, con la cuenta del usuario (su plan de Claude o su clave de API); después Codex, el CLI de Google y otros. Cada CLI se autentica con su propio flujo; CodeWizards nunca ve, guarda ni reenvía credenciales.
- **Arte**: generador en Python (`codewizards-art/04_source/gen/gbc.py`), PNG indexados y `meta.json` con anclas.

## Contrato de eventos v2

La sala no sabe de LLM: solo reproduce eventos. El simulador y los adaptadores de los CLI emiten los mismos, así que la sala no cambia al conectar los agentes reales. La verdad ejecutable es `packages/contract/contract.js`: el núcleo valida cada evento antes de guardarlo o emitirlo.

Formato: JSON por WebSocket, `{"v":2,"t":"<tipo>","seq":<n>,"ts":<ms>,"room":"<id>","agent":"<id>", …}`. `seq` lo pone el registro del núcleo (1, 2, 3… por sala) y `ts` es la hora del hecho en milisegundos de época. Los registros escritos con v1 se siguen leyendo.

| Evento | Datos | Qué hace el mago |
| --- | --- | --- |
| `room.opened` | proyecto, gremio dominante | Se encienden las antorchas; estandarte del gremio |
| `task.created` | id, título, coste estimado (o `null`); rango y motivo del Archimago (opcionales) | El Archimago lo anota en su grimorio |
| `agent.summoned` | gremio, rango, modelo, cuenta, esfuerzo (opcional) | Se abre la puerta y entra caminando |
| `agent.assigned` | tarea | Camina a la estación que toque |
| `context.read` | ficheros, tokens de entrada (opcional) | Lee en la librería, con el bastón sobre los tomos |
| `code.write` | fichero, diff parcial | Escribe en la mesa; suben runas |
| `command.run` | orden, si falló | Runas en la mesa |
| `command.denied` | herramienta, orden | «!»: las reglas no se lo permiten (no es un error del mago) |
| `artifact.present` | entregable, diff | Señala la pizarra; la tiza resume el entregable |
| `tokens.used` | cuenta, entrada, salida, caché, `cost_usd` (o `null`) | El orbe late |
| `quota.updated` | cuenta, estado (`ok`, `limited`, `exhausted`, `unknown`), ventana (`five_hour`, `seven_day`…), uso de 0 a 1, reinicio | Cambia el maná de la cuenta |
| `review.requested` | entregable | Espera junto a la pizarra; aviso en el panel |
| `review.approved` / `review.rejected` | comentario | Celebra / vuelve a la mesa |
| `agent.error` | mensaje | Confundido: «?» sobre la cabeza y humo gris |
| `agent.blocked` / `agent.unblocked` | motivo (`permission`, `quota`, `auth`, `user`), hasta cuándo (opcional) | Sin cuota: espera en el sillón hasta el reinicio; si no, espera con «!» |
| `task.done` | resultado, rama, PR (opcionales) | Celebra y descansa o sale por la puerta |
| `task.merged` | rama | El cambio aprobado llega a la rama del usuario |
| `task.failed` | motivo (`max_turns`, `budget`, `timeout`, `quota`, `auth`, `cap`, `error`), mensaje | «?», humo y a descansar |
| `task.cancelled` | quién (`user`, `cap`) | Sale por la puerta |
| `agent.idle` | — | Descansa en el sillón o medita en la alfombra |

Reglas:

- Un evento con un `seq` ya visto se ignora: repetir el registro o reconectarse no tiene efectos dobles.
- La sala tolera huecos: si llega `code.write` de un agente que no ha visto, el mago entra por la puerta y va a la mesa.
- Los gremios son el fabricante del modelo (`anthropic`, `openai`, `google`, `deepseek`, `qwen`, `meta`); solo se ven los de las cuentas conectadas, y uno desconocido se pinta con una paleta neutra.
- Los rangos son `aprendiz`, `joven`, `sabio` y `archimago`; el esfuerzo, `low`, `medium`, `high`, `xhigh` o `max` (el de Claude Code).
- Al conectar, el núcleo manda el registro y después `{"ctl":"live"}`: lo anterior a esa marca reconstruye la sala sin animarla.
- `account` es un identificador local y opaco: nunca un correo ni una credencial.
- El estado de la sala se reconstruye reproduciendo el registro (event sourcing).
- Cambiar el contrato exige el «adelante» de Pol y sube la versión `v`. Historia:
  - v0, en el hito 0.
  - v1, en el paso 2: `seq`, `ts` de época, `account`, `cost_usd`, gremios por fabricante y los eventos de bloqueo, cuota, fallo y cancelación.
  - v2, en el paso 3: el Mago Joven, el rango y el motivo del Archimago, la cuota por ventana, `command.run`, `command.denied` y `task.merged`.

## Protocolo común de los agentes

El de BaitSpace, adaptado: lectura, referencias, propuesta, puerta de aprobación, implementación, validación y traspaso. Un paso termina cuando Pol aprueba la propuesta, la implementación pasa la validación y el siguiente agente puede empezar solo con lo que hay en el repo.

1. **Lectura**: este documento, `auditorias/traspaso.md`, las auditorías previas, el código de tu tema y la maqueta funcionando, con y sin CRT. Resultado: un inventario breve con rutas, antes de opinar.
2. **Referencias**: cada fuente con enlace y lo que tomas de ella. Se toman principios, nunca arte, música ni textos ajenos. Licencias compatibles (OFL, CC0, MIT, Apache 2.0), anotadas en `licenses/`.
3. **Propuesta**: diagnóstico por impacto y esfuerzo; para cada cambio, qué, por qué, alternativas y riesgo; lo que solo decide Pol, como preguntas cerradas con tu recomendación.
4. **Puerta de aprobación**: sin el «adelante» de Pol no se tocan el estilo, la marca, el contrato de eventos, el modelo de negocio, la gestión de claves ni sus decisiones. Los arreglos pequeños y evidentes se hacen y se anotan.
5. **Implementación**: cambios pequeños y revisables; ninguna clave en el repo ni en el navegador; el arte, siempre por el generador; colores nuevos, dentro de las paletas GBC.
6. **Validación**: tests y `check.py` en verde; la maqueta sin errores de consola; capturas a ×3 con y sin CRT; lo no comprobado se dice.
7. **Traspaso**: informe en `auditorias/<tema>.md`, cambios con `COMMIT_MSG.txt` y entrada en `auditorias/traspaso.md`; si el paso cierra una versión, sube la versión en `package.json` y añade su entrada en `CHANGELOG.md`: al hacer push, la CI crea el tag y la release con esas notas (desde v1.3.0 ya no hace falta `TAG_MSG.txt`). La entrega va como parche de git (`git format-patch --binary`, que Pol aplica con `git am`), para que lleguen también los borrados; copiar ficheros encima del repo los pierde (le pasó a v1.1). Idioma: `COMMIT_MSG.txt`, el changelog y los README, en inglés; el plan, los informes y el traspaso, en español.

```markdown
## Paso <N> · <rol> · <fecha>
- Cambios: …
- Archivos tocados: …
- Decisiones de Pol: …
- Encargos para pasos siguientes: (paso N → qué)
- Preguntas abiertas: …
- Pruebas para Pol: …
```

## Hoja de ruta

Seis hitos: la maqueta está hecha (v1.0) y ahora toca la especialización; Claude Code real llega en el hito 3. Cada hito se cierra en su puerta: la maqueta y el repo se prueban antes de gastar cuota real. Las fechas las pone Pol.

| Hito | Qué | Quién | Puerta para pasar al siguiente |
| --- | --- | --- | --- |
| 0 · Maqueta | Sala GBC, grimorio y pizarra con agentes simulados | Claude, en el Proyecto (hecho, v1.0) | «Adelante» de Pol a la maqueta |
| 1 · Especialización | Cada agente pule su parte sobre la maqueta | Agentes de los pasos 1 a 7 (pasos 1 a 4 hechos: v1.1 a v1.4; paso 5, ronda 1 en v1.5) | Contrato de eventos estable y maqueta pulida |
| 2 · App local | Empaquetado, CI con prueba de humo y una primera versión de prueba | Pol y paso 2 (núcleo, CI y paquete de prueba en v1.2) | CI en verde y una versión de prueba que se instala y abre la sala |
| 3 · Claude Code real | Gremio Anthropic real con Claude Code y la cuenta de Pol, con topes de uso | Pasos 2 y 3 | Una tarea real de punta a punta, con su consumo medido |
| 4 · Más cuentas y reparto | Codex, el CLI de Google y otros; reparto por cuota restante, medido con evals | Paso 3 | Reparto medido sin perder calidad |
| 5 · Lanzamiento | Página de descarga, extensión de VS Code (Marketplace y Open VSX), plan de lanzamiento y versión publicada en npm | Pasos 8 y 9 | — |

## Hito 0 · La maqueta

La maqueta comprueba que la metáfora se entiende y engancha, con datos simulados y sin API. Es una página HTML en estilo GBC y con el filtro CRT.

Una sola pantalla con tres zonas:

- **Sala** (centro): la sala GBC a escala entera; los magos entran, caminan por la rejilla buscando camino y trabajan en las estaciones.
- **Grimorio** (izquierda): el hechizo del usuario en un cuadro de texto, la lista de tareas con su estado y el maná (tokens) por gremio.
- **Pizarra y pergamino** (derecha): el entregable seleccionado, como diff de código, y el registro de eventos.

Recorrido:

1. El usuario escribe un hechizo y pulsa «Lanzar».
2. El Archimago lo parte en 3–5 tareas simuladas y convoca magos de varios gremios y rangos.
3. Cada mago sigue el contrato de eventos: entra, lee, escribe, presenta y espera revisión.
4. El usuario aprueba o rechaza en la pizarra; un rechazo devuelve al mago a la mesa.
5. Un 10 % de errores simulados muestra el estado de confusión; al acabar, el mago celebra y descansa.

Arte que hace falta (ronda GBC): poses de leer, escribir, presentar, descansar, confusión y celebración; el Archimago con su círculo rúnico; iconos de 8 × 8. Ya hechos: puerta animada y fuente de píxel 3 × 5.

Criterios de terminado (cumplidos; hito cerrado el 22/10/2026 con el tag `v1.0`, detalle en `auditorias/maqueta.md`):

- [x] Un hechizo completo de punta a punta en menos de 2 minutos de simulación.
- [x] Los 7 gremios y al menos 2 rangos, distinguibles también sin color.
- [x] El filtro CRT se activa, se desactiva y se recuerda.
- [x] Sin errores de consola, en escritorio y en móvil.
- [x] El simulador emite exactamente el contrato de eventos v0.

## Orden de trabajo

Tras la maqueta (paso 0) vienen nueve pasos con ocho agentes; sonido y copy van en paralelo en el paso 7. La ronda 1 trabaja sobre la maqueta y la ronda 2 sobre la app conectada a los agentes reales.

| Paso | Agente | Por qué en este punto | Deja para los siguientes |
| --- | --- | --- | --- |
| 0 | Claude (Proyecto) | La idea hay que verla funcionar antes de especializar | Maqueta, contrato de eventos v0 y este documento |
| 1 | Producto y marca (A) | Público, MVP, negocio y riesgos condicionan todo | `auditorias/producto.md` y encargos |
| 2 | Arquitectura y software (A) | App local, adaptadores de los CLI, credenciales y pruebas antes de construir encima | `docs/arquitectura.md`, esqueleto de la app y CI |
| 3 | Orquestación y tokens | Qué hacen de verdad los agentes y cuánto cuesta | Router, tabla de rangos y evals de ahorro |
| 4 | Simulación y comportamiento | Convierte eventos en vida dentro de la sala | Máquina de estados del mago, rutas y ritmo |
| 5 | UI/UX | Ordena IDE y sala sobre un comportamiento cerrado | Sistema de diseño GBC, pantallas y lista de piezas |
| 6 | Arte GBC | Dibuja dentro de una interfaz estable | Assets por el generador, retocables |
| 7 | Sonido y copy | Ponen voz y tono a lo que ya no cambia | Chiptune y textos finales |
| 8 | Producto y marca (B) | La web y el lanzamiento necesitan la app final | Página de descarga de codewizards.app y plan de lanzamiento |
| 9 | Arquitectura y software (B) | Alguien cierra y publica | Versión publicada y notas |

Si un paso descubre que hay que volver atrás, lo anota como encargo y Pol decide si se hace ya o en la siguiente ronda.

## Prompt: producto y marca (pasos 1 y 8)

Actúa como Director de Producto y Marketing de herramientas para desarrolladores con IA. En el paso 1 fijas la estrategia; en el paso 8 preparas la web y el lanzamiento con la app terminada.

**Paso 1 (fase A)**: recibes la maqueta y este documento; dejas `auditorias/producto.md` y encargos para los pasos 2 a 7.

1. Público: 2–3 perfiles concretos y qué problema tiene cada uno con el vibecoding y el coste de tokens.
2. Posicionamiento: Cursor, Claude Code, GitHub Copilot, Devin, OpenHands y los paneles de observabilidad de LLM. Qué hace cada uno, cómo cobra y dónde gana CodeWizards.
3. MVP: qué entra en la versión 1 (por ejemplo, un proyecto, un repo de GitHub y Claude como primer gremio).
4. Modelo de negocio: clave propia gratis, plan de pago o tokens incluidos, con pros, contras y coste técnico.
5. Riesgos: marcas de terceros en los gremios, términos de uso de cada API, privacidad del código del usuario y coste.
6. Métricas útiles sin rastreo invasivo.

**Paso 8 (fase B)**: textos de la página de descarga, capturas con y sin CRT, GIF de la sala, búsqueda de la marca CodeWizards, política de privacidad breve y plan de las 4 primeras semanas (encargos en `auditorias/producto.md` §9).

Criterios: cada cifra con su fuente; no prometer ahorro de tokens sin la medición del paso 3.

## Prompt: arquitectura y software (pasos 2 y 9)

Actúa como Ingeniero de Software Senior especializado en aplicaciones locales para desarrolladores que orquestan herramientas de línea de comandos. En el paso 2 dejas una base sana; en el paso 9 cierras y publicas.

**Paso 2 (fase A)**: recibes la maqueta, el contrato de eventos y el brief de producto (`auditorias/producto.md`); dejas el esqueleto de la app, `docs/arquitectura.md` y la CI.

1. Repo: `apps/` (la maqueta pasa a ser la sala de la app), `codewizards-art/`, `docs/` y `auditorias/`; lo demás lo propones.
2. App local: empaquetado para macOS, Linux y Windows (app de escritorio, o un proceso local que abre la sala en el navegador), firma, actualizaciones y qué se descarga desde `codewizards.app`. Comprueba la documentación y las licencias actuales.
3. Adaptadores: uno por CLI oficial, que lanza el binario sin modificar y traduce su salida (hooks, JSON…) al contrato vigente; primero Claude Code. Revisa los términos de cada proveedor (`auditorias/producto.md` §6.1).
4. Credenciales: CodeWizards nunca las toca. Cada CLI se autentica con su propio flujo y gestiona sus claves de API opcionales; nada de credenciales en el repo ni en los logs. Tope de uso por tarea y por sala.
5. Ejecución del código de los agentes: los CLI ejecutan comandos en el ordenador del usuario; decide cómo se limitan (permisos de cada CLI, un worktree por tarea, contenedor opcional).
6. GitHub: los agentes trabajan en ramas y PR, con el `git` y el `gh` del usuario; la pizarra es la revisión del diff.
7. Pruebas: el simulador y los adaptadores emiten el mismo contrato (tests con salidas grabadas de cada CLI); pruebas de humo de la sala con Playwright; `check.py` del arte en CI.
8. Guías «cómo añadir»: un evento, un gremio, una cuenta (un CLI), un rango, un asset y una pantalla.

**Paso 9 (fase B)**: regresión completa, versión descargable publicada, notas de versión y README.

Criterios: cada problema con archivo, reproducción, gravedad, arreglo y comprobación; ninguna optimización sin medida antes y después.

## Prompt: orquestación y tokens (paso 3)

Actúa como ingeniero de LLMOps especializado en sistemas multiagente y coste de inferencia. Recibes el repo base, el contrato de eventos y el brief; dejas el router, la tabla de rangos, los prompts de sistema por rango y un banco de evals.

1. Router (el Archimago): clasifica la petición y elige rango, gremio y cuenta según la cuota que queda en cada cuenta. Empieza solo con Claude Code y una tabla configurable rango → modelo. Propuesta inicial: Aprendiz = `claude-haiku-5-5`, Mago Joven = `claude-sonnet-5-5`, Gran Sabio = `claude-opus-5-5`, Archimago = el modelo más barato que clasifique bien. Ningún nombre de modelo fijo en el código.
2. Ciclo del agente: leer contexto, escribir, presentar y revisión; cada paso emite su evento.
3. Ahorro de cuota, siempre medido, con lo que permita cada CLI: caché de prompts del proveedor, mapa del repo por AST, cierre de hilos al acabar subtareas, compresión de prompts y la traducción al inglés.
4. Presupuesto: estimación antes de lanzar, consumo real después (tokens o la medida de cada plan) y tope por tarea y por sala. Averigua qué información de cuota restante expone cada CLI.
5. Evals: 20–30 tareas pequeñas de programación con resultado comprobable por tests; consumo y calidad por configuración.

Criterios: cada técnica entra solo si su eval muestra ahorro sin perder calidad; las cifras sin fuente del documento de concepto (como el 30 % de «Caveman») no se usan sin medirlas.

## Prompt: simulación y comportamiento (paso 4)

Actúa como Game Designer de simulaciones de gestión aplicadas a herramientas. Recibes el contrato de eventos y el router; dejas la máquina de estados del mago, las rutas por la sala, el ritmo y el feedback.

1. Máquina de estados por evento: llegar, caminar, leer, escribir, presentar, esperar, confusión, celebración, descanso y salida.
2. Rutas: A* sobre la rejilla de 12 × 12 con obstáculos; varias plazas por estación y cola cuando están llenas.
3. Ritmo: los eventos reales llegan a ráfagas o tras pausas largas. Suaviza con tiempos mínimos por animación y una cola de acciones, sin falsear el estado.
4. Recursos visibles: maná (cuota restante) por cuenta, salud del proyecto (orbe) y tiempo (reloj de arena).
5. Escala: qué se ve en la sala y qué pasa al panel cuando hay 20 agentes a la vez.

Criterios: la sala nunca contradice el registro de eventos; nada premia gastar más tokens.

## Prompt: UI/UX (paso 5)

Actúa como Diseñador Senior de UI/UX de herramientas para desarrolladores con estética retro. Recibes la maqueta, el comportamiento y el contrato; dejas el sistema de diseño GBC, las pantallas y la lista de piezas para el arte.

1. IDE y sala: dónde van el diff, los registros y la aprobación; la sala como vista principal o como panel.
2. Clics por tarea frecuente: lanzar un hechizo, aprobar un entregable, ver el coste y detener un agente.
3. Legibilidad: el código, siempre en una fuente legible aunque el marco sea retro; decidir si el CRT cubre solo la sala o toda la pantalla.
4. Accesibilidad: WCAG 2.2 AA en los paneles, gremios distinguibles sin color, movimiento reducido (sin parpadeo CRT) y uso completo con teclado.
5. Pantallas: escritorio primero; en móvil, consultar y aprobar.
6. Peticiones de Pol (23/10/2026): la sala tiene que ocupar gran parte de la pantalla, con los paneles a su alrededor o encima, sin perder el escalado entero. Desde la interfaz se tiene que poder ver el directorio del repo con sus archivos; el núcleo lo daría en solo lectura y con el mismo token que la sala, y el paso 2 lo añade cuando este paso fije qué se muestra.
7. Lo que dejó a medias el paso 2: el comentario al rechazar, el botón «Detener» y la nota de la pizarra sobre dónde quedó el cambio aprobado (rama, merge o PR); una vista de revisión cómoda del diff (cabeceras de git, líneas largas); y distinguir una orden denegada por las reglas de un error del mago.
8. Lo que dejó el paso 3: el selector «Quién lo hace», el maná por cuenta (ventana de 5 h y de 7 días), el estado «por integrar» con su botón, la espera por cuota y los motivos del Archimago, que hoy salen en inglés; y el vestíbulo para fundar o abrir salas (nombres provisionales: «La Torre», «Fundar sala», «Entrar en una sala»).

Criterios: cada decisión con una captura o una medida; prueba con 3–5 desarrolladores y tareas concretas.

## Prompt: arte GBC (paso 6)

Actúa como artista principal de pixel art con experiencia en las restricciones de Game Boy Color. Recibes el generador, la prueba de estilo y la lista de piezas de UI/UX; dejas todo el arte hecho por el generador (`gbc.py`) y retocable por Pol.

1. Reglas: las del estilo vigente (contexto común) y las del hardware que se imitan: paletas de 4 y 3 colores, RGB555 y escalado entero.
2. Magos: poses de estación, confusión, celebración y descanso. Rangos distinguibles por silueta (sombrero, bastón, orbe) y el Archimago levitando sobre su círculo rúnico.
3. Puntos débiles anotados: el perfil (nariz y barba), las espaldas y la joroba.
4. Sala: ambiente (antorchas y ventanal) y variantes según el gremio dominante.
5. Interfaz: iconos de 8 × 8, marcos de panel, una fuente de píxel original y el cursor.
6. Validación: `check.py` (paletas, RGB555, colores por sprite y tamaños).
7. Peticiones de Pol (23/10/2026):
   - una sala de descanso donde se sientan a esperar los magos que se han quedado a medias (sin cuota);
   - la pizarra colgada en una pared;
   - una planta menos cuadrada, en forma de cruz como una iglesia;
   - vidrieras tintadas de varios colores, manteniendo la estética actual;
   - partículas en los magos y en la mesa, saliendo de las pociones.
   Y del paso 3: el sprite del Mago Joven, que hoy se dibuja como Aprendiz.
   Y del paso 4: el orbe de la salud del proyecto y el reloj de arena de la ventana dibujados en la sala, las poses de confuso y celebrando, y una cola visible junto a la puerta para los magos que esperan fuera.

Criterios: ningún modelo generativo de imagen; nada que recuerde a logos reales; todo pasa `check.py`.

## Prompt: sonido chiptune (paso 7)

Actúa como diseñador de sonido y compositor chiptune con los canales de la Game Boy como referencia: dos de pulso, uno de onda y uno de ruido. Recibes el comportamiento y las pantallas; dejas efectos y música sintetizados en el navegador con Web Audio, sin archivos pesados.

1. Efectos: pasos, puerta, lectura, runas al escribir, presentación, error, celebración y aviso de revisión.
2. Música opcional y discreta para la sala, apagada por defecto.
3. Mezcla pensada para quien programa durante horas, con volumen y silencio en los ajustes.

Criterios: todo original; con la pestaña en segundo plano solo suenan los avisos de revisión, y solo si Pol lo aprueba.

## Prompt: copy y lenguaje (paso 7)

Actúa como UX writer y copywriter de producto para desarrolladores, en inglés. Recibes todas las pantallas; dejas los textos finales, el glosario del mundo y un manual de tono.

1. Voz: técnica y precisa, con humor de desarrollador contenido («Do not vibecode. Spellcode.»); nada infantil.
2. Glosario: cada término mágico con su equivalente técnico visible al pasar el ratón (hechizo = petición, maná = cuota, pizarra = revisión).
3. Errores y avisos: primero claros, después graciosos.
4. Idioma: el producto, solo en inglés (decisión de Pol). Cierra con Pol los nombres de los gremios a partir de la propuesta de `auditorias/producto.md` §6.2.

Criterios: ningún término cambia de nombre según la pantalla; la metáfora nunca esconde un coste ni un riesgo.

## Riesgos y preguntas abiertas

Los riesgos mayores son los términos de los proveedores y el consumo de las cuentas del usuario; se controlan con los binarios oficiales sin modificar, sin tocar credenciales y con topes de uso desde el hito 3 (detalle en `auditorias/producto.md` §6).

- **Términos de los proveedores**: cada CLI, con sus condiciones; Anthropic exige su binario sin modificar y sus términos comerciales, y prohíbe intermediar credenciales.
- **Marcas de terceros**: nombres de fantasía, el fabricante como dato, emblemas propios y aviso de no afiliación. El paso 7 cierra los nombres y el paso 8 busca la marca CodeWizards.
- **Consumo**: un bucle de agentes agota el límite del plan del usuario; topes por tarea y por sala desde la primera llamada real (provisionales en `docs/arquitectura.md` §10).
- **Modo headless de Claude Code**: Anthropic pausó, sin descartarlo, que `claude -p` con suscripción gaste un crédito aparte; desde el 7/10/2026 los planes Max y Team incluyen créditos de API que cubren `claude -p` solo con clave de API, y con la sesión del plan sigue gastando los límites del plan. También anuncia que `--bare`, que no usa la sesión de la suscripción, será el modo por defecto de `-p`. El adaptador no lo usa y hay que comprobarlo con cada versión (paso 9); si llega, la alternativa es la sesión interactiva con hooks (`auditorias/software.md` §3).
- **Seguridad**: el código que escriben los agentes nunca se ejecuta sin aislamiento.
- **Alcance**: la sala es lo vistoso, pero el valor está en el control; la maqueta tiene que probar las dos cosas.
- **Legibilidad**: el estilo GBC no puede volver ilegibles el código ni los costes.

Preguntas para Pol:

- [x] ¿El producto sale en inglés, en español o en ambos? Solo en inglés.
- [x] ¿Modelo de partida: clave propia gratis o de pago? Gratis y local, con las cuentas del usuario; claves de API solo como opción.
- [x] ¿Los agentes trabajan sobre repos de GitHub (ramas y PR) o en un espacio propio? En repos de GitHub, con ramas y PR.
- [ ] ¿Qué estados tiene cada rango de mago? Sigue abierta: la cierra el paso 4 con Pol.
- [x] ¿El gremio Copilot representa la plataforma o al fabricante del modelo? Ninguna de las dos: deja de ser gremio y puede volver como cuenta.
- [x] Licencia: código MIT y arte CC BY 4.0.
- [x] ¿App de escritorio o proceso local con la sala en el navegador? Proceso local hasta el hito 4; escritorio en el hito 5 (paso 2).
- [ ] ¿Aceptas los términos comerciales de Anthropic antes del hito 3? Decidido que sí; pendiente de hacerlo (Pol).
- [ ] ¿Se publica ya una versión de prueba en npm para reservar el nombre `codewizards`? Más adelante, con una guía paso a paso para Pol.
- [x] ¿Se añade al contrato un evento `command.run` para auditar cada orden que ejecuta un agente? Sí: en v2, junto con `command.denied` (paso 3).

## Documentos de referencia

- `auditorias/producto.md` (paso 1): público, posicionamiento, MVP, modelo de negocio, riesgos, métricas y encargos.
- `auditorias/seguridad.md`: seguridad del repo y CI.
- `docs/arquitectura.md` (paso 2): núcleo local, seguridad, adaptadores, credenciales, ejecución, GitHub, datos, topes, pruebas, empaquetado y guías «cómo añadir».
- `auditorias/software.md` (paso 2): diagnóstico, cambios y validación de la arquitectura.
- `auditorias/orquestacion.md` (paso 3): el Archimago, los rangos, la cuota y los evals; `evals/README.md`: cómo se lanzan.
- `auditorias/simulacion.md` (paso 4): la máquina de estados, las colas, el ritmo, el aforo y los recursos visibles.
- `auditorias/uiux.md` (paso 5): decisiones de interfaz, clics por tarea y lo que queda para la ronda 2.
- `auditorias/arte_paso6.md` (paso 6): rangos, poses, gremios y la sala en cruz.
- `docs/concepto/contexto_general.md` (v3.2): visión, marca y arquitectura de partida; donde choque con este plan, manda el plan.
- Ronda SNES (arte, generador y documentos de estilo): en el tag `v1.0`; sus correcciones de geometría están en `auditorias/arte_ronda1_snes.md`.
- La metodología se adaptó del `agentes.md` de BaitSpace (otro proyecto de Pol; no está en este repo).
- `codewizards-art/preview/codewizards_estilo_gbc.html`: la sala con interruptor CRT.
