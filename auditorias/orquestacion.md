# Orquestación y tokens · paso 3, ronda 1

23/10/2026 · Estado: entregado para revisión de Pol · Versión v1.3.0, ampliada en v1.3.1 (§10). Antes, el cierre del paso 2 (v1.2.1 y v1.2.2) está en `auditorias/software.md` §10 y §11.

## 0. En pocas líneas

- **El Archimago v1 no es un modelo.** Son reglas en el núcleo, sin coste de tokens, que eligen el rango de cada hechizo, o respetan el que elijas tú en el grimorio. Cada rango tiene en `ranks.json` su modelo, sus turnos, su estimación y su nota de sistema. Ningún nombre de modelo está en el código.
- **Cuatro rangos, como el concepto:**

  | Rango | Modelo |
  | --- | --- |
  | Aprendiz | `haiku` |
  | Mago Joven (nuevo) | `sonnet` |
  | Gran Sabio | `opus` |
  | Archimago | las reglas |

- **La cuota es real.** Claude Code la informa en cada turno (`rate_limit_event`), y la sala la enseña como maná de la cuenta.
  - Con la ventana de 5 h por encima del 80 %, el Archimago baja un rango.
  - Por encima del 97 % o agotada, el mago espera en el sillón hasta que se recupera, en vez de irse.
- **Contrato de eventos v2:** Mago Joven, el rango y el motivo del Archimago, la cuota por ventana, las órdenes ejecutadas y denegadas, y las integraciones (merge).
- **Banco de 20 evals con tests ocultos.**
  - En la CI se comprueba sin gastar: el banco entero, el flujo con un agente falso y las reglas.
  - Las reglas aciertan el rango etiquetado en 9 de 20 tareas: nunca quedan por debajo, pero ahorran poco.
  - El piloto real con tu plan Pro está por hacer.

## 1. Lectura

| Qué | Estado al empezar |
| --- | --- |
| Router | No había: un hechizo era una tarea, con el rango de `--rank` (Gran Sabio por defecto) y el modelo por defecto de Claude Code |
| Consumo | Solo `tokens.used` al final del turno; topes provisionales del paso 2 |
| Cuota | `quota.updated` solo con estado; sin datos reales de la ventana |
| Rangos | Contrato y arte con 3 (aprendiz, sabio, archimago); el concepto y este prompt, con 4 |
| Evals | Ninguno |
| Prueba real de Pol | Claude Code 2.1.223: un `rate_limit_event` en cada turno grabado (`grep` de Pol, 5 turnos) |

## 2. Referencias

| Fuente | Qué se toma |
| --- | --- |
| [Claude Code, configuración de modelos](https://code.claude.com/docs/en/model-config) | Los alias `default`, `sonnet`, `opus` y `haiku` apuntan a la última versión de cada familia. En Pro, el modelo por defecto es Sonnet |
| [Tipos del SDK de Claude Code en Rust (docs.rs)](https://docs.rs/claude-codes/latest/claude_codes/io/struct.RateLimitEvent.html) y [en Elixir (hexdocs)](https://hexdocs.pm/claude_code/ClaudeCode.Message.RateLimitEvent.html) | Forma de `rate_limit_event`: estado (`allowed`, `allowed_warning`, `rejected`), reinicio, uso y tipo de ventana |
| [Switchboard, PR #820 (21/10/2026)](https://github.com/zemdregon/switchboard/pull/820) | `unifiedWindows` con las ventanas de 5 h y 7 días en cada turno; `/usage` en modo `-p` no llama al modelo |
| [Flywheel, issue #417 (24/9/2026)](https://github.com/suzworx/flywheel/issues/417) | Pausar antes de llegar al límite usando `utilization` y `resetsAt` |
| [Morph, «Claude Code Models» (2026)](https://www.morphllm.com/claude-code-models), fuente secundaria | Pro incluiría Sonnet y Haiku pero no Opus en Claude Code. Sin confirmar en la documentación oficial |
| Prueba de Pol (23/10/2026) | Unos 24.000 tokens de entrada como mínimo por tarea: el prompt de sistema y las herramientas de Claude Code |

La forma de `rate_limit_event` no sale de la documentación oficial. El traductor acepta las dos variantes conocidas, el uso en fracción o en porcentaje y el reinicio en segundos o en milisegundos. Falta ver uno de los de Pol (§7).

## 3. Decisiones de Pol (23/10/2026)

- «Todo sí» a la propuesta:
  - cuatro rangos;
  - router v1 con reglas y elección manual, y un Archimago con modelo solo si un eval lo justifica;
  - contrato v2;
  - Firefox en la prueba de humo;
  - extensión de VS Code como segunda vía, después del hito 3;
  - `codewizards` en el PATH dentro de `nix develop`.
- Tiene el plan Pro.
- Las tareas hechas desaparecen cuando su mago sale por la puerta. Interpretación: si un cambio aprobado sigue solo en su rama, la tarea se queda en la lista como «por integrar» hasta que se integra; las canceladas también se van.
- Solo se ven los gremios de las cuentas conectadas: de momento, solo Anthropic, también en la demo.
- Un mago sin cuota no se va: espera, y la parte de arte le dará una sala de descanso.
- Un botón para integrar el cambio cuando `serve` no se lanzó con `--merge`.
- Una release automática con cada push. Se publica cuando el push trae una versión nueva en `package.json`; ver §5.
- Pendiente, para el siguiente parche:
  - crear salas desde la interfaz (sobre un repo existente o en uno nuevo, eligiendo la ruta) y abrirlas;
  - la publicación en npm, que se hará paso a paso con Pol.
- Para la interfaz y el arte, apuntado en `docs/agentes.md` (pasos 5 y 6):
  - una sala de descanso para los que esperan;
  - la pizarra colgada en una pared;
  - una planta en cruz, como una iglesia;
  - vidrieras de colores;
  - partículas en los magos y en las pociones de la mesa.

## 4. Cómo funciona el Archimago

El Archimago v1 es código, no un modelo. Para cada hechizo:

1. **Rango.**
   - Si en el grimorio elegiste uno, se usa ese.
   - Si no, aplica las reglas en este orden:
     - una palabra de trabajo grande (refactor, arquitectura, migra, rendimiento, seguridad…), cuatro ficheros nombrados o más, o un hechizo de más de 600 caracteres → Gran Sabio;
     - una palabra de trabajo pequeño (typo, renombra, comentario, readme, hello world…) en un hechizo corto que nombre como mucho un fichero → Aprendiz;
     - lo demás → Mago Joven.
2. **Cuota.**
   - Con la ventana de 5 h por encima del 80 % (`downgradeAt`), baja un rango; nunca si lo elegiste tú.
   - Si está agotada o por encima del 97 % (`pauseAt`), el mago entra y espera en el sillón hasta el reinicio, sin gastar nada.
3. **Modelo, turnos y nota.** Salen de `ranks.json`. La nota se añade al prompt de sistema de Claude Code.
4. **Estimación.** Es la de la tabla hasta que hay tres tareas reales de ese rango; desde entonces, la mediana de las últimas diez. Aparece en la lista de tareas.

Por qué no es un modelo, de momento:

- Clasificar es un trabajo fácil, así que no haría falta un modelo pesado: bastaría con `haiku`.
- Pero cada llamada a Claude Code parte de unos 24.000 tokens de entrada, de modo que el Archimago costaría casi lo mismo que una tarea de Aprendiz.
- Solo merece la pena si los evals muestran que reparte mejor que las reglas y que ese acierto ahorra más de lo que cuesta.
- Una vía más barata, por medir: Claude Code sin herramientas y con un prompt de sistema propio.

**La tabla.** El fichero `ranks.json` va en `~/.config/codewizards/` en Linux (`docs/arquitectura.md` §9 tiene las demás rutas). Se puede cambiar cualquier campo, por ejemplo:

```json
{ "ranks": { "sabio": { "model": "sonnet" } } }
```

## 5. Cambios

- **Contrato v2** (`packages/contract/contract.js`): solo añade a v1, así que los registros escritos con v1 se siguen reproduciendo.
  - El rango `joven`.
  - `task.created` con `rank` y `reason`.
  - `quota.updated` con `window` y `utilization`.
  - `agent.blocked` con `until`.
  - Eventos nuevos: `command.run`, `command.denied` y `task.merged`.
- **Traductor de Claude Code.**
  - `rate_limit_event` pasa a `quota.updated`, uno por ventana.
  - El resultado de un Bash pasa a `command.run`, y una herramienta rechazada, a `command.denied`. Ya no se pintan como error del mago.
  - Guarda los turnos y la duración de cada turno.
- **Archimago** (`apps/core/src/router/`): la tabla `ranks.default.json`, su carga y validación, las reglas, la cuota y las estimaciones. `--ranks FILE` usa otra tabla, y `--rank` y `--model` siguen forzando uno para todo.
- **Sala de Claude Code.**
  - Usa el Archimago.
  - La espera por cuota, antes de empezar o a mitad, reanuda la misma sesión.
  - La orden `merge` (el botón).
  - `.claude/settings.local.json` nunca entra en un commit.
- **La sala en el navegador.**
  - El selector «Quién lo hace».
  - Maná por cuenta conectada: lo que queda de la ventana de 5 h y la hora de reinicio.
  - El estado «esperando cuota», con el mago en el sillón.
  - El estado «por integrar», con el botón «Integrar en mi rama».
  - Las tareas se van con su mago.
  - Las órdenes aparecen en el pergamino.
  - La demo, solo con Anthropic y con los tres rangos.
- **Evals.**
  - `evals/` (20 tareas, configuraciones y README).
  - `tools/evals.mjs`, con autocomprobación, `--routing`, agente oráculo y ejecución real.
  - Escenario `oracle` en el Claude Code falso.
- **CI.**
  - Job `evals`, sin tokens.
  - Job `smoke-firefox`, que no bloquea hasta que esté verde una vez.
  - La demo de la prueba de humo, servida como Pages.
  - Job `release`: tras todos los demás, en un push a `main` cuya versión de `package.json` aún no tenga release, crea el tag y la release con las notas del CHANGELOG y el paquete adjunto. Ya no hace falta crear el tag a mano.
- **Windows.** El test de `--merge` comparaba bytes y Git para Windows convierte los saltos de línea al hacer checkout. Los repos de los tests desactivan esa conversión y el test normaliza.
- **Nix.** `codewizards` en el PATH dentro de `nix develop`.

## 6. Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 77 tests (69 del núcleo y 8 del contrato) y 5143 comprobaciones de la sala, también con `TMPDIR` tras un enlace |
| `node tools/evals.mjs --self-check` | 20/20 tareas válidas |
| `node tools/evals.mjs --oracle --configs sonnet,archimago --tasks all` | 40/40 ejecuciones pasan por el flujo completo (sala, worktree y tests ocultos) |
| `node tools/evals.mjs --routing` | Las reglas dan su etiqueta a 9 de 20 tareas (tabla abajo) |
| `node tools/smoke.mjs` (Chromium, Playwright 1.64.1) | 34/34, con la demo servida como Pages, el núcleo en vivo y `serve` con el falso: elegir rango, por integrar, el botón y el maná por cuenta |
| actionlint 1.7.12 y zizmor 1.31.1 | 0 problemas; el mismo hallazgo bajo aceptado |
| gitleaks 8.30.1 | Sin fugas |

Las reglas frente a las etiquetas (filas: la etiqueta; columnas: lo que deciden las reglas):

| Etiqueta \ reglas | aprendiz | joven | sabio |
| --- | --- | --- | --- |
| aprendiz | 1 | 7 | 0 |
| joven | 0 | 8 | 0 |
| sabio | 0 | 4 | 0 |

Las reglas son prudentes: nunca dan menos rango del necesario, pero casi todo cae en Mago Joven. La pregunta para el piloto es doble:

- ¿El Aprendiz resuelve sus 8 tareas gastando menos ventana? Si es así, merece la pena reconocer mejor los trabajos pequeños.
- ¿El Mago Joven resuelve las 4 del Gran Sabio? Si es así, el Gran Sabio sobra en Pro.

## 7. Lo no comprobado

- **Ninguna ejecución real de los evals.** El piloto lo lanza Pol: gasta su plan.
- **La forma exacta del `rate_limit_event` de Claude Code 2.1.223.** Se puede mirar con `grep rate_limit_event ~/.local/share/codewizards/rooms/*/tasks/*/turn-1.ndjson`.
- **Si `opus` funciona en un plan Pro.**
- **La espera por cuota de punta a punta**, con un límite de verdad. Solo está probada con el falso.
- **La prueba en Firefox.** Se verá en la CI, que de momento no la deja bloquear.
- **El job `release`.** Se verá en el primer push con la versión 1.3.0.
- **Los entornos de Nix**: siguen sin evaluar aquí.

## 8. Encargos

- **Pol.**
  - Lanzar el piloto (§9).
  - Pegarme una línea `rate_limit_event` de una grabación.
  - Decir si `opus` funciona en su plan.
- **Siguiente parche (pasos 2 y 3).**
  - Crear y abrir salas desde la interfaz, con la ruta del repo (existente o nuevo). Nombres provisionales: «Fundar sala», «Entrar en una sala» y, para el vestíbulo, «La Torre».
  - Ajustar las reglas y la tabla con los datos del piloto.
  - La guía paso a paso para publicar en npm.
- **Paso 4.** Comportamiento de la espera por cuota (dónde y cómo espera el mago), de `command.run` y `command.denied` y de una tarea «por integrar».
- **Paso 5.**
  - La sala grande.
  - El explorador de archivos.
  - El selector de rango y el maná por cuenta (hoy son mínimos).
  - Los motivos del Archimago en español, que hoy salen en inglés desde el núcleo.
- **Paso 6.**
  - Sprite del Mago Joven (hoy se dibuja como Aprendiz).
  - Sala de descanso, pizarra en la pared, planta en cruz, vidrieras de colores y partículas en los magos y en las pociones.
- **Paso 7.** Los textos nuevos de la sala, en inglés.

## 9. Pruebas para Pol

1. Aplicar el parche:

   ```sh
   git am paso-3.patch
   nix develop
   npm ci --ignore-scripts
   npm test
   git push
   ```

   Con el push, la CI publica sola la release v1.3.0.
2. Probar la sala con `codewizards serve --repo /tmp/prueba`. Ahora funciona sin `node apps/core/bin/` delante, dentro de `nix develop`. Prueba a:
   - elegir «Aprendiz» y lanzar «Fix the typo in README»;
   - aprobar y pulsar «Integrar en mi rama»;
   - mirar el maná de «Claude Code».
3. El piloto, en una ventana de 5 h libre, desde `nix develop`:

   ```sh
   node tools/evals.mjs --routing
   node tools/evals.mjs --configs haiku,sonnet,archimago --tasks pilot
   ```

   Pásame el `.md` que deja en `evals/results/`.

## 10. Tras probar la v1.3.0 (23/10/2026, v1.3.1)

Pol probó la v1.3.0:
- La CI y la release automática funcionaron.
- `codewizards` no aparecía en el PATH.
- Al abrir una sala con historia, entraban todos los magos de tareas anteriores a hacer la animación y volver a salir.

Además pidió:
- un panel de tareas pendientes, hechas (historial) y por hacer (un editor de notas);
- la sala grande en el centro, el grimorio debajo y un panel redimensionable a cada lado;
- saber qué versión de cada modelo y qué esfuerzo usa cada rango, y poder elegirlos.

| # | Problema o petición | Arreglo |
| --- | --- | --- |
| 1 | `codewizards: orden no encontrada` dentro de `nix develop` | El script se llama `codewizards.js`: la carpeta en el PATH no ofrecía `codewizards`. El shell ahora crea un enlace con ese nombre en una carpeta temporal. Probado con el mismo hook en bash; sin evaluar en Nix aquí |
| 2 | Al abrir la sala, el pasado se escenificaba otra vez | El núcleo marca el final del registro (`ctl: live`). Lo anterior se aplica sin animar: lo terminado va a «Hechas» y los magos que siguen trabajando aparecen en su sitio |
| 3 | Pendientes, historial y por hacer | «En curso», «Hechas» y «Por hacer». Las notas se guardan junto al registro de la sala (`notes.md`), y «Al grimorio» pasa una línea al hechizo |
| 4 | Distribución | Sala grande en el centro, grimorio debajo, paneles laterales redimensionables (se recuerda el ancho). En 1920 × 1080 la sala sale a ×5 |
| 5 | ¿Qué modelos y qué esfuerzo? | Versiones fijadas en la tabla: `claude-haiku-5-5` con esfuerzo bajo, `claude-sonnet-5-5` con medio y `claude-opus-5-5` con alto. El grimorio permite elegir modelo y esfuerzo por hechizo. El esfuerzo va con `--effort`, y se quita `CLAUDE_CODE_EFFORT_LEVEL` del entorno porque Claude Code le daría prioridad |

Sobre los cuatro rangos: trabajan tres (Aprendiz, Mago Joven y Gran Sabio), cada uno con su modelo. El cuarto, el Archimago, es quien reparte, y en v1 son reglas, no un modelo.

Fuentes del esfuerzo:
- [wmedia, «Claude Code effort» (comprobado en 2.1.220)](https://wmedia.es/es/tips/claude-code-effort-no-es-el-que-crees): valores `low`, `medium`, `high`, `xhigh` y `max`; la variable de entorno manda sobre `--effort`.
- [Mejba, «Claude Code Effort Levels»](https://www.mejba.me/blog/claude-code-effort-levels): el esfuerzo por defecto es medio.

Ambas son fuentes secundarias.

Validación de v1.3.1:
- `npm test`: 80 tests y 5147 comprobaciones de la sala.
- Los 20 evals, válidos.
- Prueba de humo: 39/39, que incluye estrechar un panel, la sala a ×4 o más en 1920 × 1080, la reapertura de una sala sin animar el pasado, las notas al recargar y el esfuerzo elegido.

Sin verificar con el Claude Code real:
- que `claude-opus-5-5` funcione en Pro;
- los cinco niveles de esfuerzo.
