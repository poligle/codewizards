# Arquitectura y software · paso 2 (fase A), ronda 1

22/10/2026 · Estado: entregado para revisión de Pol · Versión v1.2, corregida en v1.2.1 (23/10/2026, §10). La arquitectura resultante está en `docs/arquitectura.md`.

## 0. En pocas líneas

- **Núcleo local en Node con la sala en el navegador.** Escucha solo en 127.0.0.1, con token, comprobación de Host y de Origin y una CSP estricta. `codewizards demo` funciona sin cuenta ni red. `codewizards serve --repo` dirige el Claude Code del usuario: una rama y un worktree por tarea, el diff real en la pizarra y nada se confirma sin aprobar.
- **Contrato de eventos v1**, con validador propio que comprueban el núcleo y los tests: `seq`, `ts` de época, `account`, gremios por fabricante y eventos de bloqueo, cuota, fallo y cancelación.
- **Arreglos**:
  - la limpieza de v1.1, que no había llegado a git (165 ficheros);
  - la sala, que se congelaba con un gremio desconocido;
  - los eventos repetidos, que tenían efectos dobles.
- **CI** de arte, sala y núcleo (Linux, macOS y Windows), más una prueba de humo en Chromium sobre el paquete instalado (26 comprobaciones). **Pages**, con un workflow propio.
- **Pendiente de Pol**: aceptar los términos comerciales de Anthropic y probar `serve` con su cuenta, que es el arranque del hito 3. Lo no comprobado está en el §7.

## 1. Lectura (inventario)

| Qué | Dónde | Estado al empezar |
| --- | --- | --- |
| Plan, protocolo y contrato v0 | `docs/agentes.md` | Vigente |
| Traspaso | `auditorias/traspaso.md` | 6 entradas; encargos para el paso 2 de los pasos 0, 1 y 6 |
| Brief de producto | `auditorias/producto.md` (§4, §6.1 y §9) | App local, CLI oficiales, cuentas del usuario |
| Seguridad del repo | `auditorias/seguridad.md` | Acciones por SHA, gitleaks; pregunta de Pages abierta |
| Maqueta | `apps/maqueta/` (unas 1.300 líneas sin dependencias) | En verde: 3450/3450 tests, `build.py --check` y `check.py` |
| Maqueta en Chromium | — | Un hechizo completo sin errores ni red, con y sin CRT (capturas en la propuesta) |
| Arte | `codewizards-art/` | 64 assets en `meta.json`, pero 30 PNG, 9 paletas y `legacy/` fuera de él |

## 2. Referencias

Consultadas el 22/10/2026. Se toman hechos técnicos y condiciones, nunca arte ni textos.

| Fuente | Qué se toma |
| --- | --- |
| [Claude Code, «Legal and compliance»](https://code.claude.com/docs/en/legal-and-compliance) | Ejecutar Claude Code en un producto exige los términos comerciales, el binario sin modificar y que cada usuario se autentique con lo suyo; no se pueden recoger ni intermediar credenciales; sí se permite que el usuario entre con su propia suscripción en el binario oficial |
| [Centro de ayuda, «Use the Claude Agent SDK with your Claude plan»](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) | El paso de `claude -p` y del Agent SDK a un crédito mensual aparte se anunció para el 15/6/2026 y se pausó ese mismo día: por ahora siguen gastando los límites de la suscripción |
| [Claude Code, referencia del CLI](https://code.claude.com/docs/es/cli-reference.md) | Opciones del adaptador (`-p`, `stream-json`, `--session-id`, `--resume`, `--permission-mode`, `--tools`, `--allowedTools`, `--settings`, `--max-turns`, `--max-budget-usd`) y `claude auth status` (JSON; código de salida 0 o 1) |
| [Claude Code, ejecución programática](https://code.claude.com/docs/ja/headless) | `-p` es el Agent SDK por línea de órdenes; eventos `system/init` (con `capabilities`) y `system/api_retry` (con la categoría del error); semántica de `dontAsk`; aviso de que `--bare` será el defecto de `-p` y de que no lee la sesión OAuth |
| [Claude Code, «Sandboxing»](https://code.claude.com/docs/en/sandboxing) | Seatbelt en macOS, bubblewrap en Linux, WSL2 en Windows; `failIfUnavailable` y `allowUnsandboxedCommands: false` |
| [Tipos del Agent SDK (transcripción de tessl)](https://tessl.io/registry/tessl/npm-anthropic-ai--claude-agent-sdk/files/docs/types.md), fuente secundaria | Subtipos de `result` y `permission_denials` |
| [Tauri 2, «Embedding External Binaries»](https://v2.tauri.app/develop/sidecar) | El núcleo en Node podría ir como *sidecar* de una app de escritorio (hito 5) |
| [Registro de npm](https://registry.npmjs.org/) | `codewizards` libre; `ws` 8.22.0 (MIT, sin dependencias, del 26/9/2026); `playwright` 1.56.0 (Apache 2.0) |
| Releases de `actions/upload-artifact`, `configure-pages`, `upload-pages-artifact` y `deploy-pages` en GitHub | Versiones con más de 14 días, fijadas por SHA |
| [The New Stack (14/5/2026)](https://thenewstack.io/?p=22823327), fuente secundaria | Anthropic cita herramientas de terceros que usan el plan del usuario por el Agent SDK |

Licencias de lo que entra en el repo: `ws` (MIT) y `playwright` (Apache 2.0, solo para pruebas); nota en `licenses/README.md`.

## 3. Diagnóstico

| # | Problema | Archivo | Reproducción | Gravedad | Arreglo | Comprobación |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | La limpieza de v1.1 no llegó a git: 165 ficheros que el CHANGELOG da por borrados | `codewizards-art/legacy/` (118), 30 PNG, 9 `.gpl`, 5 `.py`, 2 docs SNES y `auditorias/arte.md` | `git show --stat v1.1`: 12 ficheros y ningún borrado | Alta: el repo público contradice su CHANGELOG | Borrado en este commit; `check.py` falla ante huérfanos y ante `legacy/`; entregas por parche de git | `check.py` nuevo sobre el árbol de v1.1: 40 errores. Sobre v1.2: 0 |
| 2 | Un gremio desconocido congela la sala | `render.js` (`atlas[w.guild]`) y `ui.js` (`gcol`) | En Chromium: `agent.summoned` con `guild: "google"` lanza un TypeError y el reloj se queda en 7,62 s | Alta para el hito 3: el gremio de Google se llamaría `google` | Paleta neutra `unknown` (grises del muro, ya en la paleta GBC); gremios del contrato por fabricante; el bucle programa el fotograma siguiente antes de dibujar y no deja que un fallo lo pare | `room.test.mjs` (6); humo A |
| 3 | El contrato prometía repetir eventos sin efectos dobles, pero no tenían id | `world.js` (`handle`) | Repetir `agent.summoned` devuelve al mago a la puerta; repetir `context.read` encola 5 acciones en vez de 3 | Media: reconexiones y reproducción del registro | `seq` en el contrato v1; la sala ignora lo ya visto | `room.test.mjs` (4): el registro doble deja la misma sala |
| 4 | Huecos: un evento de un agente nunca convocado se perdía | `world.js` | `code.write` de un agente desconocido: ningún mago | Media | El mago entra por la puerta y hace el trabajo | `room.test.mjs` (5); humo A |
| 5 | `ts` sin definir: el simulador lo contaba desde su arranque | `sim.js`, `ui.js` | Con hora de época, el pergamino mostraría millones de minutos | Media | `ts` en milisegundos de época; el pergamino lo muestra relativo | Validador; `room.test.mjs` |
| 6 | Datos de eventos en `innerHTML`: `t.state` entraba sin escapar en un `class` (encargo de seguridad) | `ui.js` | Hoy solo con valores internos | Baja hoy, alta con eventos reales | Estados en lista blanca, escapado también de `'`, validación en el núcleo | Humo (sin errores); revisión |
| 7 | La página autocontenida, con scripts en línea, impedía una CSP útil | `maqueta.html` y `build.py` | — | Media para la app local | Scripts en ficheros (`assets.gen.js` generado); CSP `script-src 'self'` en el núcleo | `server.test.js`; humo C y D |
| 8 | No había prueba en un navegador real en la CI (encargo del paso 0) | `.github/workflows/ci.yml` | El fallo de v1.0 pasaba los tests de node | Media | Job `smoke` con Playwright sobre el paquete instalado | 26/26 en local |
| 9 | El README hablaba de una app de escritorio | `README.md` | — | Baja | «Local app», según la decisión 1 | — |

Hallazgo de la investigación que afecta al producto: el uso de `claude -p` con suscripción podría pasar a un crédito aparte, ahora pausado, y `--bare` podría dejar `-p` sin la sesión de la suscripción. Lo recojo como riesgo en `docs/agentes.md` y en `docs/arquitectura.md` §5. El adaptador nunca pasa `--bare`, y hay que comprobarlo con cada versión de Claude Code (paso 9).

## 4. Decisiones de Pol (22/10/2026)

Su «Continuar» tras la propuesta lo tomo como «adelante» a las seis recomendaciones:

1. Empaquetado en dos fases: proceso local con la sala en el navegador ahora y escritorio en el hito 5. En el README, «local app».
2. Contrato de eventos v1.
3. Aceptar los términos comerciales de Anthropic antes del hito 3 y escribir a ventas para confirmar el caso. Es una acción suya, que sigue pendiente.
4. En Windows nativo, sin Bash; con Bash, solo en WSL2.
5. Pages con un workflow propio que publica solo la demo.
6. Entregas como parche de git, no copiando ficheros.

## 5. Cambios

- **Limpieza de v1.1 aplicada** (los 165 ficheros del §3.1) y `check.py` con detección de huérfanos.
- **Sala** (`apps/maqueta/` pasa a `apps/room/`):
  - la página carga sus scripts como ficheros y `build.py` genera `src/assets.gen.js`;
  - `net.js` nuevo (modo en vivo con token);
  - contrato v1 en el simulador (6 gremios por fabricante);
  - idempotencia, huecos y paleta neutra;
  - eventos nuevos, comentario al rechazar y botón «Detener» con agentes reales;
  - bucle a prueba de fallos;
  - fuera `maqueta.html`; la URL antigua redirige a la demo desde Pages.
- **Contrato** (`packages/contract/contract.js`): versión 1 y validador sin dependencias.
- **Núcleo** (`apps/core/`):
  - CLI `codewizards` (`demo`, `serve`, `doctor`);
  - servidor seguro;
  - registro JSONL con redacción de secretos;
  - sala demo, que ejecuta el simulador dentro del núcleo;
  - sala de Claude Code: política, traductor, ejecución y worktrees;
  - git y `gh` del usuario;
  - 48 tests con un Claude Code falso y grabaciones sintéticas.
- **Prueba de humo** (`tools/smoke.mjs`): demo estática, móvil, núcleo en vivo y `serve` con el Claude Code falso.
- **CI**: jobs `room`, `core` (en tres sistemas) y `smoke`; `pages.yml` nuevo; Dependabot para npm; `package.json` y `package-lock.json` (`ws` y `playwright` fijados).
- **Documentación**:
  - `docs/arquitectura.md` (nuevo) y este informe;
  - en `docs/agentes.md`: contrato v1, estado, decisiones, riesgos y protocolo de entrega por parche;
  - README, CHANGELOG, `licenses/README.md`;
  - notas en `auditorias/maqueta.md` y `auditorias/seguridad.md`.

## 6. Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 54 tests (48 del núcleo y 6 del contrato) y 3142 comprobaciones de la sala: todo en verde |
| `node tools/smoke.mjs` (Chromium 1194, Playwright 1.56.0) | 26/26, con el repo y con el paquete instalado desde `npm pack` |
| `check.py` | 64 assets y 0 errores (con el árbol de v1.1: 40 huérfanos) |
| `python3 apps/room/build.py --check` | Al día |
| `codewizards-art/04_source/gen/build.py` | Regenera el arte sin cambiar ningún fichero versionado |
| `npm pack` | 67 KB y 31 ficheros; se instala y `codewizards --version` funciona |
| actionlint 1.7.12 | 0 problemas |
| zizmor 1.31.1 (sin red) | 1 hallazgo bajo, aceptado: `adhoc-packages` en la instalación del paquete en el job `smoke`, que es justo lo que se quiere probar |
| gitleaks 8.30.1 | Sin fugas, en el árbol y en el commit |
| Parche | `git am` sobre una copia limpia de v1.1: se aplica, borrados incluidos, y los tests pasan |
| Capturas a ×3, con y sin CRT | Demo, núcleo en vivo y `serve`; las sube la CI como artefacto y van con la entrega |

## 7. Lo no comprobado

- **Claude Code real**: aquí no hay binario ni cuenta. No están verificados:
  - el formato real de `stream-json` (las grabaciones son sintéticas, sacadas de la documentación);
  - que `-p` use la suscripción en la versión actual;
  - las claves de sandbox pasadas por `--settings`;
  - `--max-budget-usd` con suscripción;
  - el texto exacto del límite de uso.
- **macOS y Windows**: el núcleo solo se ha ejecutado en Linux; los tests de los otros sistemas corren en la CI tras el push. La primera CI falló en ambos (§10).
- **Firefox y Safari**: no probados; solo Chromium.
- **GitHub**: el workflow de Pages y Dependabot para npm aún no han corrido. `gh pr create` y `git push` reales no se han probado; están testeados con argumentos y con un repo local.
- **Hito 5**: los precios y condiciones de firma para macOS y Windows.

## 8. Encargos

- **Pol**:
  - aceptar los términos comerciales de Anthropic y escribir a ventas (decisión 3);
  - cambiar Pages a «GitHub Actions»;
  - probar `codewizards serve` con su cuenta en un repo de pruebas;
  - grabar salidas reales de Claude Code para los tests;
  - decidir si se publica ya en npm para reservar el nombre.
- **Paso 3**:
  - el Archimago reparte el hechizo en tareas (hoy, un hechizo es una tarea);
  - calibrar los topes del `docs/arquitectura.md` §10;
  - averiguar qué cuota expone Claude Code;
  - tabla rango → modelo para `--model`, sin nombres fijos en el código.
- **Paso 4**: maná por cuenta con `quota.updated`; comportamiento de `agent.blocked`, `task.failed` y `task.cancelled` (hoy, uno mínimo).
- **Paso 5**:
  - comentario de rechazo, botón «Detener» y pantalla de cuentas (hoy son mínimos);
  - el diff de la pizarra en una vista de revisión cómoda;
  - aviso de no afiliación.
- **Paso 6**: renombrar en el arte el gremio `gemini` a `google`, quitar Copilot y, si hace falta, un sprite propio para el gremio desconocido.
- **Paso 7**: todos los textos de la sala en inglés; están en el objeto `T` de `ui.js`.
- **Paso 9**:
  - publicar en npm con *trusted publishing* y quitar `private`;
  - un workflow de release;
  - comprobar en cada versión de Claude Code que `-p` sigue funcionando con suscripción (`--bare`) y revisar sus términos.

## 9. Pruebas para Pol

1. Aplicar el parche, sobre `main` en v1.1 (con Nix, `nix develop` antes de npm; ver §10):

   ```sh
   git am paso-2.patch        # o bien: git pull --ff-only paso-2.bundle paso-2
   npm ci --ignore-scripts
   npm test
   ```

2. Abrir la sala servida por el núcleo, `node apps/core/bin/codewizards.js demo`, en el navegador: lanzar un hechizo y aprobar y rechazar con comentario. En la barra de direcciones no debe quedar el token.
3. `node apps/core/bin/codewizards.js doctor`.
4. Con Claude Code instalado y la sesión iniciada, en un repo de pruebas: `node apps/core/bin/codewizards.js serve --repo RUTA`, un hechizo pequeño, aprobar, y ver la rama `cw/t1-…` con el commit.
5. Tras el push: CI en verde en los tres sistemas; Settings → Pages → Source: «GitHub Actions»; ejecutar `pages` y abrir `https://poligle.github.io/codewizards/` y la URL antigua de la maqueta.

## 10. Corrección tras la primera CI (23/10/2026, v1.2.1)

Pol aplicó v1.2 (árbol idéntico al entregado) y fusionó dos PR de Dependabot (Playwright 1.64.1 y `setup-python` 7.0.0). Entonces:

- la CI falló en macOS y en Windows;
- Pages seguía mostrando el README;
- Pol usa Nix y no tiene npm instalado.

| # | Problema | Causa | Arreglo | Comprobación |
| --- | --- | --- | --- | --- |
| 1 | macOS: `code.write` llegaba con una ruta absoluta en vez de `hello.txt` (log de la CI) | `os.tmpdir()` cuelga de `/var`, un enlace a `/private/var`: el CLI informa rutas bajo el directorio real y el traductor comparaba con la ruta del enlace. Le pasaría a cualquiera con la carpeta de datos tras un enlace | Los worktrees cuelgan de la ruta real (`realpathSync.native`) y el traductor acepta las dos | Reproducido en Linux con un `TMPDIR` enlazado; test nuevo con un enlace (en Windows, una *junction*) que falla sin el arreglo; 49/49 con y sin enlace |
| 2 | Windows: no he visto el log | Por análisis, el mismo tipo de fallo: nombres cortos (`RUNNER~1`) frente a largos en el test de git y, según cómo informe el CLI, en el de la sala | `realpathSync.native` en los dos | Sin verificar hasta la próxima CI: si sigue en rojo, hace falta el log del job de Windows |
| 3 | Pages abre el README | Pages sigue en «Deploy from a branch» y, sin `index.html` en la raíz, publica el README; el workflow `pages` necesita la fuente «GitHub Actions» | Instrucciones en el propio workflow y aquí. Fuera `configure-pages`: una web estática no lo necesita y así el job de build solo tiene lectura | Tras cambiar la fuente y ejecutar `pages` |
| 4 | Sin npm (Nix) | — | `flake.nix` con dos entornos: `nix develop` (node 22 con npm, git y Python con numpy y Pillow) y, en Linux, `nix develop .#smoke`, con el Chromium de nixpkgs para la prueba de humo (`CW_CHROMIUM`) | Sintaxis comprobada con alejandra 4.0.0. Sin evaluar: aquí no hay Nix. La primera vez crea `flake.lock`, que hay que subir |
| 5 | Con un Chromium completo, como el de Nix, la prueba de humo veía un 404 | El navegador pide `/favicon.ico` | `<link rel="icon" href="data:,">` en la sala | 26/26 con Playwright 1.64.1 y un Chromium completo |

Validación de v1.2.1:

- `npm test`: 55 tests (49 del núcleo y 6 del contrato) y 3142 comprobaciones de la sala.
- Prueba de humo: 26/26.
- actionlint: 0 problemas. zizmor: el mismo hallazgo bajo aceptado.
- gitleaks: sin fugas.
- El parche se aplica sobre `main` (`4fd69c3`).

Pruebas para Pol:

```sh
git am paso-2-fix.patch
nix develop
npm ci --ignore-scripts && npm test
node apps/core/bin/codewizards.js demo
nix develop .#smoke -c npm run smoke        # opcional, la prueba de humo con el Chromium de nixpkgs
git push && git tag -a v1.2.1 -F TAG_MSG.txt && git push origin v1.2.1
```

Después:

1. En GitHub, Settings → Pages → Build and deployment → Source: «GitHub Actions».
2. En Actions → pages, «Run workflow».
3. Abrir `https://poligle.github.io/codewizards/`.
4. Confirmar que la CI queda en verde en los tres sistemas; si Windows sigue en rojo, pásame su log.
