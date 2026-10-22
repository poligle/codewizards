# CodeWizards · Plan de desarrollo y agentes

22/10/2026 · Pol · Versión de trabajo en Claude Docs: https://claude.ai/artifact/Gfr9o8cdzQKmv2PRePeHRS

## Cómo usar este documento

Este documento es el `docs/agentes.md` de CodeWizards: contexto común, protocolo, hoja de ruta y el prompt de cada agente.

1. Vive en el repo como `docs/agentes.md` (repo iniciado el 22/10/2026, antes del hito 2). Cuando cambie la versión de trabajo en Claude Docs, se exporta a Markdown y se sustituye aquí.
2. La maqueta (hito 0) se hace en el Proyecto de claude.ai. Los agentes especializados (hito 1) trabajan después, cada uno en un chat nuevo y con el repo en el estado que dejó el anterior.
3. Cada agente arranca con el mensaje de abajo, cambiando rol, paso y ronda.
4. Cada agente presenta su propuesta y espera el «adelante» de Pol antes de tocar código o arte.
5. Al terminar, Pol revisa el informe en `auditorias/`, los cambios, `COMMIT_MSG.txt` y la entrada en `auditorias/traspaso.md`.

Mensaje de arranque para cada agente:

```markdown
Lee entero docs/agentes.md: contexto común, protocolo, hoja de ruta y orden de trabajo.
Eres el agente de <ROL>. Tu paso es el <N> de 9, ronda <R>.
Antes de proponer nada, lee auditorias/traspaso.md.
Sigue tu prompt (sección <X>) y el protocolo común. Responde en español.
```

Si un agente necesita algo de un paso anterior, lo anota en `traspaso.md` como encargo y sigue; no rehace el trabajo de otro.

## Contexto común del proyecto

CodeWizards (`codewizards.app`) es un IDE web multiagente que muestra el trabajo de los LLM como una torre de magos en pixel art isométrico: cada proyecto es una sala y cada agente, un mago. Lema: «Do not vibecode. Spellcode.»

### Qué es

- **La sala**: 12 × 12 tiles con librería (leer contexto), mesa de laboratorio (escribir código) y pizarra (presentar entregables y revisarlos).
- **Los magos**: un gremio por proveedor de IA (color y emblema) y un rango por potencia del modelo: Aprendiz, Mago Joven, Gran Sabio y un Archimago único que orquesta.
- **La propuesta**: control y ahorro de tokens frente al «vibecoding»; cada acción de un agente es un hechizo auditado.

### Estado a 22/10/2026

- Documentos de concepto en `docs/concepto/`: contexto general v3.2, dirección de arte v1.0 y especificación de la Fase 1 v1.0.1, escritos para estilo SNES.
- Ronda 1 de arte (SNES): 91 assets pintados por código y validados, archivados en `codewizards-art/legacy/snes-ronda1/`. Sirven de referencia de geometría y método.
- Arte de la Fase 1 en estilo GBC: 64 assets en `codewizards-art/`, validados con `check.py`.
- Maqueta v0 del hito 0 en `apps/maqueta/`: sala, grimorio, pizarra y pergamino con agentes simulados que emiten el contrato de eventos v0.

### Decisiones de Pol (no se cambian sin preguntarle)

- Estilo «parecido a Game Boy Color» con filtro CRT opcional.
- El mago: viejecito encorvado, gran sombrero, barba y bata largas; solo se le ve la nariz. Su bastón acaba en un orbe que brilla con el color del gremio.
- El arte se pinta por código, sin modelos generativos de imagen, y Pol lo retoca a mano.
- Primero una maqueta; después cada parte la especializa un agente; con una versión buena, API de Claude con la clave de Pol.
- Sala cuadrada de 12 × 12 con los dos muros del fondo visibles; un gremio por proveedor, con emblema propio.
- Los puntos débiles del arte se pulen cuando el proyecto esté más maduro.

### Estilo vigente (GBC)

| Regla | Valor |
| --- | --- |
| Tile | 16 × 8 px, iso 2:1; 8 px por unidad de altura |
| Sala | 12 × 12 tiles, unos 208 × 152 px; muro de 40 px |
| Color | RGB555 (canales múltiplos de 8) |
| Fondo | 8 paletas de 4 colores con el oscuro compartido (25 colores) |
| Magos | 16 × 24 px; 2 paletas de 3 colores: gremio (luz, base, oscuro) y común (barba, nariz, bastón) |
| Gremios | 7 paletas + 1 común = las 8 paletas de sprites de la GBC |
| Luces | Alfa de 1 bit; el brillo de orbes y antorchas lo mezcla el motor |
| CRT | Barrido, rejilla RGB, resplandor, viñeta y esquinas curvas en CSS, con interruptor |
| Escalado | Siempre entero (×3, ×4…) con `image-rendering: pixelated` |

### Cómo se construye

- **Maqueta**: una página HTML con canvas, con datos simulados.
- **Producto**: monorepo en GitHub; frontend estático y backend en Cloudflare Workers; una sala = un Durable Object con su registro de eventos y su WebSocket.
- **Agentes**: primero la API de Claude, con la clave como secreto del Worker (nunca en el navegador ni en el repo); otros proveedores después.
- **Arte**: generador en Python (`codewizards-art/04_source/gen/gbc.py`), PNG indexados y `meta.json` con anclas.

## Contrato de eventos v0

La sala no sabe de LLM: solo reproduce eventos. La maqueta los simula y el backend real emitirá los mismos, así que la sala no cambia al conectar la API.

Formato: JSON por WebSocket, `{"v":0,"t":"<tipo>","ts":<ms>,"room":"<id>","agent":"<id>", …}`.

| Evento | Datos | Qué hace el mago |
| --- | --- | --- |
| `room.opened` | proyecto, gremio dominante | Se encienden las antorchas; estandarte del gremio |
| `task.created` | id, título, coste estimado | El Archimago lo anota en su grimorio |
| `agent.summoned` | gremio, rango, modelo | Se abre la puerta y entra caminando |
| `agent.assigned` | tarea | Camina a la estación que toque |
| `context.read` | ficheros, tokens de entrada | Lee en la librería, con el bastón sobre los tomos |
| `code.write` | fichero, diff parcial | Escribe en la mesa; suben runas |
| `artifact.present` | entregable, diff | Señala la pizarra; la tiza resume el entregable |
| `tokens.used` | entrada, salida, caché, coste | El orbe late; baja el maná del gremio |
| `review.requested` | entregable | Espera junto a la pizarra; aviso en el panel |
| `review.approved` / `review.rejected` | comentario | Celebra / vuelve a la mesa |
| `agent.error` | mensaje | Confundido: «?» sobre la cabeza y humo gris |
| `task.done` | resultado | Celebra y descansa o sale por la puerta |
| `agent.idle` | — | Descansa en el sillón o medita en la alfombra |

Reglas:

- Cada evento lleva `ts` y se puede repetir sin efectos dobles.
- La sala tolera huecos: si llega `code.write` sin `agent.assigned`, el mago camina primero a la mesa.
- El estado de la sala se reconstruye reproduciendo el registro (event sourcing).
- Cambiar el contrato exige el «adelante» de Pol y sube la versión `v`.

## Protocolo común de los agentes

El de BaitSpace, adaptado: lectura, referencias, propuesta, puerta de aprobación, implementación, validación y traspaso. Un paso termina cuando Pol aprueba la propuesta, la implementación pasa la validación y el siguiente agente puede empezar solo con lo que hay en el repo.

1. **Lectura**: este documento, `auditorias/traspaso.md`, las auditorías previas, el código de tu tema y la maqueta funcionando, con y sin CRT. Resultado: un inventario breve con rutas, antes de opinar.
2. **Referencias**: cada fuente con enlace y lo que tomas de ella. Se toman principios, nunca arte, música ni textos ajenos. Licencias compatibles (OFL, CC0, MIT, Apache 2.0), anotadas en `licenses/`.
3. **Propuesta**: diagnóstico por impacto y esfuerzo; para cada cambio, qué, por qué, alternativas y riesgo; lo que solo decide Pol, como preguntas cerradas con tu recomendación.
4. **Puerta de aprobación**: sin el «adelante» de Pol no se tocan el estilo, la marca, el contrato de eventos, el modelo de negocio, la gestión de claves ni sus decisiones. Los arreglos pequeños y evidentes se hacen y se anotan.
5. **Implementación**: cambios pequeños y revisables; ninguna clave en el repo ni en el navegador; el arte, siempre por el generador; colores nuevos, dentro de las paletas GBC.
6. **Validación**: tests y `check.py` en verde; la maqueta sin errores de consola; capturas a ×3 con y sin CRT; lo no comprobado se dice.
7. **Traspaso**: informe en `auditorias/<tema>.md`, cambios con `COMMIT_MSG.txt` y entrada en `auditorias/traspaso.md`. Idioma: `COMMIT_MSG.txt` y los README, en inglés; el plan, los informes y el traspaso, en español.

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

Seis hitos: ahora la maqueta; la API de Claude llega en el hito 3. Cada hito se cierra en su puerta: la maqueta y el repo se prueban antes de gastar un token real. Las fechas las pone Pol.

| Hito | Qué | Quién | Puerta para pasar al siguiente |
| --- | --- | --- | --- |
| 0 · Maqueta | Sala GBC, grimorio y pizarra con agentes simulados | Claude, en el Proyecto (ahora) | «Adelante» de Pol a la maqueta |
| 1 · Especialización | Cada agente pule su parte sobre la maqueta | Agentes de los pasos 1 a 7 | Contrato de eventos estable y maqueta pulida |
| 2 · GitHub y Cloudflare | Monorepo, CI y despliegue de prueba en codewizards.app | Pol y paso 2 | CI en verde y despliegue de prueba en marcha |
| 3 · API de Claude | Gremio Anthropic real, con la clave de Pol y topes de gasto | Pasos 2 y 3 | Una tarea real de punta a punta, con su coste medido |
| 4 · Multigremio y ahorro | Otros proveedores y ahorro de tokens medido con evals | Paso 3 | Ahorro medido sin perder calidad |
| 5 · Lanzamiento | Landing, plan de lanzamiento y versión publicada | Pasos 8 y 9 | — |

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

Criterios de terminado:

- [ ] Un hechizo completo de punta a punta en menos de 2 minutos de simulación.
- [ ] Los 7 gremios y al menos 2 rangos, distinguibles también sin color.
- [ ] El filtro CRT se activa, se desactiva y se recuerda.
- [ ] Sin errores de consola, en escritorio y en móvil.
- [ ] El simulador emite exactamente el contrato de eventos v0.

## Orden de trabajo

Tras la maqueta (paso 0) vienen nueve pasos con ocho agentes; sonido y copy van en paralelo en el paso 7. La ronda 1 trabaja sobre la maqueta y la ronda 2 sobre el producto conectado a la API.

| Paso | Agente | Por qué en este punto | Deja para los siguientes |
| --- | --- | --- | --- |
| 0 | Claude (Proyecto) | La idea hay que verla funcionar antes de especializar | Maqueta, contrato de eventos v0 y este documento |
| 1 | Producto y marca (A) | Público, MVP, negocio y riesgos condicionan todo | `auditorias/producto.md` y encargos |
| 2 | Arquitectura y software (A) | Repo, Cloudflare, claves y pruebas antes de construir encima | `docs/arquitectura.md`, repo base y CI |
| 3 | Orquestación y tokens | Qué hacen de verdad los agentes y cuánto cuesta | Router, tabla de rangos y evals de ahorro |
| 4 | Simulación y comportamiento | Convierte eventos en vida dentro de la sala | Máquina de estados del mago, rutas y ritmo |
| 5 | UI/UX | Ordena IDE y sala sobre un comportamiento cerrado | Sistema de diseño GBC, pantallas y lista de piezas |
| 6 | Arte GBC | Dibuja dentro de una interfaz estable | Assets por el generador, retocables |
| 7 | Sonido y copy | Ponen voz y tono a lo que ya no cambia | Chiptune y textos finales |
| 8 | Producto y marca (B) | La web y el lanzamiento necesitan la app final | Landing de codewizards.app y plan de lanzamiento |
| 9 | Arquitectura y software (B) | Alguien cierra y publica | Versión desplegada y notas |

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

**Paso 8 (fase B)**: textos de la landing, capturas con y sin CRT, GIF de la sala y plan de las 4 primeras semanas.

Criterios: cada cifra con su fuente; no prometer ahorro de tokens sin la medición del paso 3.

## Prompt: arquitectura y software (pasos 2 y 9)

Actúa como Ingeniero de Software Senior especializado en aplicaciones web en tiempo real sobre Cloudflare. En el paso 2 dejas una base sana; en el paso 9 cierras y publicas.

**Paso 2 (fase A)**: recibes la maqueta, el contrato de eventos y el brief de producto; dejas el repo base, `docs/arquitectura.md` y la CI.

1. Monorepo: `apps/web` (la maqueta pasa a frontend), `workers/`, `codewizards-art/`, `docs/` y `auditorias/`.
2. Cloudflare: frontend estático (Pages o Workers con assets, según la recomendación vigente); un Durable Object por sala con registro y WebSocket; colas o Workflows para trabajos largos; D1 o KV para persistir. Comprueba la documentación y los límites actuales.
3. Claves: la de Claude como secreto del Worker, nunca en el navegador, el repo ni los logs; tope de gasto por sala.
4. Ejecución del código de los agentes: decide dónde se ejecuta y se prueba (sandbox en la nube, GitHub Actions o local). Un Worker solo no compila ni pasa tests arbitrarios.
5. GitHub: los agentes trabajan en ramas y PR; la pizarra es la revisión del diff.
6. Pruebas: el simulador y el backend emiten el mismo contrato; pruebas de humo de la maqueta con Playwright; `check.py` del arte en CI.
7. Guías «cómo añadir»: un evento, un gremio, un rango, un asset y una pantalla.

**Paso 9 (fase B)**: regresión completa, despliegue, notas de versión y README.

Criterios: cada problema con archivo, reproducción, gravedad, arreglo y comprobación; ninguna optimización sin medida antes y después.

## Prompt: orquestación y tokens (paso 3)

Actúa como ingeniero de LLMOps especializado en sistemas multiagente y coste de inferencia. Recibes el repo base, el contrato de eventos y el brief; dejas el router, la tabla de rangos, los prompts de sistema por rango y un banco de evals.

1. Router (el Archimago): clasifica la petición y elige rango y gremio. Empieza solo con Claude y una tabla configurable rango → modelo. Propuesta inicial: Aprendiz = `claude-haiku-5-5`, Mago Joven = `claude-sonnet-5-5`, Gran Sabio = `claude-opus-5-5`, Archimago = el modelo más barato que clasifique bien. Ningún nombre de modelo fijo en el código.
2. Ciclo del agente: leer contexto, escribir, presentar y revisión; cada paso emite su evento.
3. Ahorro de tokens, siempre medido: caché de prompts del proveedor, mapa del repo por AST, cierre de hilos al acabar subtareas, compresión de prompts y la traducción al inglés.
4. Presupuesto: estimación antes de lanzar, coste real después y tope por tarea y por sala.
5. Evals: 20–30 tareas pequeñas de programación con resultado comprobable por tests; coste y calidad por configuración.

Criterios: cada técnica entra solo si su eval muestra ahorro sin perder calidad; las cifras sin fuente del documento de concepto (como el 30 % de «Caveman») no se usan sin medirlas.

## Prompt: simulación y comportamiento (paso 4)

Actúa como Game Designer de simulaciones de gestión aplicadas a herramientas. Recibes el contrato de eventos y el router; dejas la máquina de estados del mago, las rutas por la sala, el ritmo y el feedback.

1. Máquina de estados por evento: llegar, caminar, leer, escribir, presentar, esperar, confusión, celebración, descanso y salida.
2. Rutas: A* sobre la rejilla de 12 × 12 con obstáculos; varias plazas por estación y cola cuando están llenas.
3. Ritmo: los eventos reales llegan a ráfagas o tras pausas largas. Suaviza con tiempos mínimos por animación y una cola de acciones, sin falsear el estado.
4. Recursos visibles: maná (tokens) por gremio, salud del proyecto (orbe) y tiempo (reloj de arena).
5. Escala: qué se ve en la sala y qué pasa al panel cuando hay 20 agentes a la vez.

Criterios: la sala nunca contradice el registro de eventos; nada premia gastar más tokens.

## Prompt: UI/UX (paso 5)

Actúa como Diseñador Senior de UI/UX de herramientas para desarrolladores con estética retro. Recibes la maqueta, el comportamiento y el contrato; dejas el sistema de diseño GBC, las pantallas y la lista de piezas para el arte.

1. IDE y sala: dónde van el diff, los registros y la aprobación; la sala como vista principal o como panel.
2. Clics por tarea frecuente: lanzar un hechizo, aprobar un entregable, ver el coste y detener un agente.
3. Legibilidad: el código, siempre en una fuente legible aunque el marco sea retro; decidir si el CRT cubre solo la sala o toda la pantalla.
4. Accesibilidad: WCAG 2.2 AA en los paneles, gremios distinguibles sin color, movimiento reducido (sin parpadeo CRT) y uso completo con teclado.
5. Pantallas: escritorio primero; en móvil, consultar y aprobar.

Criterios: cada decisión con una captura o una medida; prueba con 3–5 desarrolladores y tareas concretas.

## Prompt: arte GBC (paso 6)

Actúa como artista principal de pixel art con experiencia en las restricciones de Game Boy Color. Recibes el generador, la prueba de estilo y la lista de piezas de UI/UX; dejas todo el arte hecho por el generador (`gbc.py`) y retocable por Pol.

1. Reglas: las del estilo vigente (contexto común) y las del hardware que se imitan: paletas de 4 y 3 colores, RGB555 y escalado entero.
2. Magos: poses de estación, confusión, celebración y descanso. Rangos distinguibles por silueta (sombrero, bastón, orbe) y el Archimago levitando sobre su círculo rúnico.
3. Puntos débiles anotados: el perfil (nariz y barba), las espaldas y la joroba.
4. Sala: ambiente (antorchas y ventanal) y variantes según el gremio dominante.
5. Interfaz: iconos de 8 × 8, marcos de panel, una fuente de píxel original y el cursor.
6. Validación: `check.py` (paletas, RGB555, colores por sprite y tamaños).

Criterios: ningún modelo generativo de imagen; nada que recuerde a logos reales; todo pasa `check.py`.

## Prompt: sonido chiptune (paso 7)

Actúa como diseñador de sonido y compositor chiptune con los canales de la Game Boy como referencia: dos de pulso, uno de onda y uno de ruido. Recibes el comportamiento y las pantallas; dejas efectos y música sintetizados en el navegador con Web Audio, sin archivos pesados.

1. Efectos: pasos, puerta, lectura, runas al escribir, presentación, error, celebración y aviso de revisión.
2. Música opcional y discreta para la sala, apagada por defecto.
3. Mezcla pensada para quien programa durante horas, con volumen y silencio en los ajustes.

Criterios: todo original; con la pestaña en segundo plano solo suenan los avisos de revisión, y solo si Pol lo aprueba.

## Prompt: copy y lenguaje (paso 7)

Actúa como UX writer y copywriter de producto para desarrolladores, en inglés y en español. Recibes todas las pantallas; dejas los textos finales, el glosario del mundo y un manual de tono.

1. Voz: técnica y precisa, con humor de desarrollador contenido («Do not vibecode. Spellcode.»); nada infantil.
2. Glosario: cada término mágico con su equivalente técnico visible al pasar el ratón (hechizo = petición, maná = tokens, pizarra = revisión).
3. Errores y avisos: primero claros, después graciosos.
4. Idiomas: según lo que decida Pol (ver preguntas abiertas).

Criterios: ningún término cambia de nombre según la pantalla; la metáfora nunca esconde un coste ni un riesgo.

## Riesgos y preguntas abiertas

Los riesgos mayores son el coste y la clave de la API; se controlan desde el hito 3 con topes y con la clave solo en el servidor.

- **Marcas de terceros**: los gremios usan nombres y colores de proveedores; revisar sus guías de marca antes de publicar (paso 1).
- **Coste**: un bucle de agentes puede gastar mucho; topes por tarea y por sala desde la primera llamada real.
- **Seguridad**: el código que escriben los agentes nunca se ejecuta sin aislamiento.
- **Alcance**: la sala es lo vistoso, pero el valor está en el control; la maqueta tiene que probar las dos cosas.
- **Legibilidad**: el estilo GBC no puede volver ilegibles el código ni los costes.

Preguntas para Pol:

- [ ] ¿El producto sale en inglés, en español o en ambos?
- [ ] ¿Modelo de partida: clave propia gratis o de pago?
- [ ] ¿Los agentes trabajan sobre repos de GitHub (ramas y PR) o en un espacio propio?
- [ ] ¿Qué estados tiene cada rango de mago?
- [ ] ¿El gremio Copilot representa la plataforma o al fabricante del modelo?
- [ ] Licencia: Pol se inclina por MIT; la decide el paso 1.

## Documentos de referencia

- `docs/concepto/contexto_general.md` (v3.2): visión, marca y arquitectura de partida.
- `docs/concepto/art_direction_snes_v1.0.md` y `docs/concepto/art_specs_fase1_snes_v1.0.1.md`: estilo SNES ya sustituido; sus correcciones de geometría están en `auditorias/arte_ronda1_snes.md`.
- La metodología se adaptó del `agentes.md` de BaitSpace (otro proyecto de Pol; no está en este repo).
- `codewizards-art/legacy/snes-ronda1/`: ronda 1 de arte con su generador y sus 91 assets.
- `codewizards-art/preview/codewizards_estilo_gbc.html`: la sala con interruptor CRT.
