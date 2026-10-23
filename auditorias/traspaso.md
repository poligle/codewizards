# Traspaso entre pasos

> Nota (22/10/2026, v1.1; corregida en v1.2): la ronda 1 en estilo SNES se retiró del árbol en v1.1, aunque el borrado no llegó a git hasta v1.2, y sigue en el tag `v1.0`, en `codewizards-art/legacy/snes-ronda1/`; las rutas de su entrada se refieren a esa carpeta del tag. `auditorias/arte.md` se fusionó en `auditorias/arte_ronda1_snes.md`. `Chalk_Font_4x6.png` era de la ronda SNES: el arte GBC usa `codewizards-art/03_effects/Pixel_Font_3x5.png`.

## Paso 6 · Arte (ronda 1, adelantado) · 22/10/2026
- Cambios: escenario completo de la Fase 1 con la escala corregida, sala base compuesta, estandartes con emblema por gremio, Aprendiz en 7 gremios (idle, walk, read, create, present, rest), efectos (halo, polvo, fuente de tiza), paletas `.gpl`, `meta.json` con anclas, generador y validador.
- Archivos tocados: `codewizards-art/` (nuevo), `auditorias/arte.md`, `auditorias/img/arte/`, este traspaso y `COMMIT_MSG.txt`.
- Decisiones de Pol: opción (b), arte pintado por código y retocado a mano; «adelante» a las correcciones de escala, planta, cámara, alfa y paletas (detalle en `auditorias/arte.md` §4).
- Encargos para pasos siguientes:
  - (paso 2, arquitectura) → motor de la sala con las convenciones de `codewizards-art/README.md`: proyección y anclas de `meta.json`, orden por profundidad x + y, mezcla aditiva de luces y halos en tiempo de ejecución, tiza con `Chalk_Font_4x6.png`, cambio de paleta por gremio y escalado entero (×2, ×3).
  - (paso 2) → definir el esquema de eventos del agente que mueve al mago (llegar por la puerta, ir a una estación, leer, crear, presentar, descansar, fallar, acabar).
  - (paso 4, simulación) → asignar evento → estado y decidir CONFUSED y SUCCESS, que aún no están dibujados.
  - (paso 5, UI/UX) → cómo conviven la sala y los paneles del IDE.
- Preguntas abiertas: ¿qué 6 estados tiene el Aprendiz? ¿Muro de 80 px o 64? ¿El gremio Copilot representa la plataforma o el fabricante del modelo?
- Pruebas para Pol: las 4 de `auditorias/arte.md` §9.

## Paso 6 · Arte GBC, Fase 1 · 22/10/2026
- Cambios: arte de la Fase 1 rehecho en estilo GBC (64 assets): suelo con 6 variantes, muros con 4 variantes por lado, esquinas, cantos, puerta con apertura de 4 fotogramas, ventanal y su luz, librerías L y R, mesa, pizarra, antorchas con llama, halos, brillo del orbe, sillón, alfombra, 14 estandartes, sala base, Aprendiz en 7 gremios (reposo y paso en 8 direcciones) y fuente de píxel 3 × 5. Ronda SNES archivada.
- Archivos tocados: `codewizards-art/` (generador GBC, assets, paletas, `meta.json`, demo), `auditorias/arte_gbc_fase1.md`, `auditorias/img/arte/`, `docs/`.
- Decisiones de Pol: estilo «parecido a Game Boy Color» con filtro CRT opcional; mago viejecito encorvado con gran sombrero y orbe del color del gremio; plan de desarrollo aprobado; repo iniciado antes del hito 2.
- Encargos para pasos siguientes: (paso 0, maqueta) → poses de estación, confusión, celebración y descanso, y el Archimago; (paso 2) → motor de la sala con `meta.json` y escalado entero; (paso 4) → estados del mago por evento.
- Preguntas abiertas: las de `docs/agentes.md`, sección «Riesgos y preguntas abiertas».
- Pruebas para Pol: abrir la demo; abrir un PNG en Aseprite (indexado, índice 0 transparente); cargar una `.gpl` de gremio sobre un sprite del Aprendiz y ver que cambia de gremio sin tocar píxeles.

## Paso 0 · Maqueta (Claude, en el Proyecto) · 22/10/2026
- Cambios: maqueta v0 del hito 0 (`apps/maqueta/`): mundo con rutas A* y estaciones, simulador del contrato de eventos v0, renderizador en canvas (orden por profundidad, bocadillos, partículas, Archimago con círculo rúnico, luz en tiempo de ejecución) e interfaz (grimorio, tareas, maná por gremio, pizarra con aprobar/rechazar, pergamino, velocidad, aprobación automática y CRT). Rango Gran Sabio (estrella en el sombrero) y pose de trabajo en el generador. CI y Dependabot. README en inglés.
- Archivos tocados: `apps/maqueta/`, `codewizards-art/04_source/gen/gbc.py`, `.github/`, `README.md`, `codewizards-art/README.md`, `docs/agentes.md`, `auditorias/maqueta.md`.
- Decisiones de Pol: commits y README en inglés; licencia probablemente MIT, la decide el paso 1.
- Encargos para pasos siguientes: (paso 1) licencia e idioma del producto; (paso 2) pruebas en navegador real con Playwright en CI y despliegue de la maqueta; (paso 4) revisar la máquina de estados y el ritmo; (paso 5) escala de la sala en móvil (hoy ×1); (paso 6) sprite propio del Archimago, poses de estación y sentarse en el sillón.
- Preguntas abiertas: las de `docs/agentes.md`.
- Pruebas para Pol: las de `auditorias/maqueta.md` §5.

## Paso 2 (adelantado) · Seguridad del repo y CI (Claude) · 22/10/2026
- Cambios: escaneo de secretos en su propio workflow (push a cualquier rama, PR, a mano y semanal con el historial completo) con gitleaks 8.30.1; acciones fijadas por SHA; `persist-credentials: false` y timeouts; Dependabot con espera de 7 días y PR agrupado; `COMMIT_MSG.txt` sale del índice. Historial completo escaneado: 0 fugas.
- Archivos tocados: `.github/workflows/ci.yml`, `.github/workflows/secrets.yml` (nuevo), `.github/dependabot.yml`, `auditorias/seguridad.md` (nuevo), este traspaso y `COMMIT_MSG.txt`.
- Decisiones de Pol: repo público; abrir GitHub Pages para la maqueta.
- Encargos para pasos siguientes: (paso 2) → despliegue con acciones fijadas por SHA y los secretos de despliegue en un environment protegido; (paso 3) → la clave de la API, solo como secreto del Worker, y validar los campos de los eventos reales antes de meterlos en `innerHTML` (hoy `t.state` entra sin escapar en un `class`).
- Preguntas abiertas: ¿Pages desde la rama `main` o con un workflow propio que publique solo la maqueta? Recomendación: workflow propio.
- Pruebas para Pol: las de `auditorias/seguridad.md` §7.

## Paso 0 · Maqueta, corrección (Claude) · 22/10/2026
- Cambios: la maqueta se congelaba en el primer fotograma en cualquier navegador real (`dt` negativo → reloj bajo cero → `drawImage` sin imagen). Ahora el `dt` del bucle nunca es negativo, y `Sim.tick` y `World.update` ignoran un `dt` negativo o NaN. Test de regresión y `maqueta.html` regenerada. Detalle en `auditorias/maqueta.md` §6.
- Archivos tocados: `apps/maqueta/src/ui.js`, `apps/maqueta/src/sim.js`, `apps/maqueta/src/world.js`, `apps/maqueta/test/maqueta.test.mjs`, `apps/maqueta/maqueta.html`, `auditorias/maqueta.md`, este traspaso y `COMMIT_MSG.txt`.
- Decisiones de Pol: ninguna nueva; es un arreglo pequeño y evidente, según el protocolo.
- Encargos para pasos siguientes: (paso 2) → prueba de humo con Playwright en la CI que cargue la maqueta, lance un hechizo y falle ante cualquier error de página. Este fallo pasaba los tests de node y solo se veía en un navegador.
- Preguntas abiertas: ¿«adelante» a la maqueta para cerrar el hito 0?
- Pruebas para Pol: abrir la maqueta en GitHub Pages, pulsar «Lanzar» y ver entrar a los magos; después, las de `auditorias/maqueta.md` §5.

## Paso 1 · Producto y marca (A) · 22/10/2026
- Cambios:
  - `auditorias/producto.md`: público, posicionamiento, MVP, modelo de negocio, riesgos, métricas y encargos.
  - Giro de producto: CodeWizards pasa a ser una app local y open source que dirige los CLI oficiales (Claude Code primero) con las cuentas del usuario. No tiene servidor ni guarda claves, tokens o código; `codewizards.app` será la página de descarga.
  - Licencias: `LICENSE` (código, MIT) y `codewizards-art/LICENSE` (arte, CC BY 4.0).
  - README nuevo (imagen de la sala en `docs/img/room.png`, estado, principios, hoja de ruta, estructura, licencias y aviso de no afiliación) y `CHANGELOG.md`.
  - Limpieza: fuera la ronda SNES (`codewizards-art/legacy/`, 118 archivos) y sus dos documentos de estilo; los restos SNES del arte GBC (28 hojas Read, Create, Present y Rest del Aprendiz, `Chalk_Font_4x6.png`, `Dust_Puff_Sheet.png` y 9 paletas SNES); 5 módulos del generador sin uso; y `auditorias/arte.md`, fusionado en `arte_ronda1_snes.md`. Todo sigue en el tag `v1.0`.
  - `docs/agentes.md` al día con las decisiones: contexto, hoja de ruta, prompts de los pasos 2, 3, 4, 7 y 8, riesgos y preguntas. Nota de vigencia en `docs/concepto/contexto_general.md`.
- Archivos tocados: `auditorias/producto.md` (nuevo), `README.md`, `CHANGELOG.md` (nuevo), `LICENSE` (nuevo), `codewizards-art/LICENSE` (nuevo), `codewizards-art/README.md`, `docs/img/room.png` (nuevo), `docs/agentes.md`, `docs/concepto/contexto_general.md`, `auditorias/arte_ronda1_snes.md`, `.gitignore`, este traspaso, `COMMIT_MSG.txt` y `TAG_MSG.txt`. Borrados: los de la limpieza.
- Decisiones de Pol: app local con sus cuentas (planes de pago o cuotas gratuitas), sin modelo por token y sin guardar nada; página de descarga en `codewizards.app`; open source, con código MIT y arte CC BY 4.0; producto solo en inglés; agentes en repos de GitHub, con ramas y PR; 6 gremios con nombre de fantasía y el fabricante como dato, y Copilot fuera como gremio; limpieza completa con tag `v1.0`. Su «todo funciona» en la maqueta lo tomo como el «adelante» que cierra el hito 0.
- Encargos para pasos siguientes (detalle en `auditorias/producto.md` §9):
  - (paso 2) → arquitectura de la app local y empaquetado; un adaptador por CLI que lance el binario oficial sin modificar, primero Claude Code; credenciales intocables; ramas o worktrees y PR por tarea; tests de contrato con salidas grabadas y prueba de humo con Playwright; confirmar si hay que aceptar los términos comerciales de Anthropic; proponer si los eventos llevan la cuenta.
  - (paso 3) → reparto por cuota restante entre cuentas; qué información de cuota expone cada CLI; estimación, consumo real y topes.
  - (paso 4) → 6 gremios, maná por cuenta y estados «sin cuota» y «esperando al usuario».
  - (paso 5) → pantalla de cuentas, avisos de no afiliación y de privacidad por proveedor, interfaz en inglés.
  - (paso 6) → quitar el gremio Copilot del arte y decidir el uso de la paleta que queda libre; emblemas sin parecido con logos reales.
  - (paso 7) → textos en inglés y nombres de los gremios (propuesta en `auditorias/producto.md` §6.2).
  - (paso 8) → búsqueda de la marca CodeWizards, página de descarga con analítica sin cookies y política de privacidad.
  - Quedan sin efecto los encargos que suponían Cloudflare Workers o la clave de Pol en un servidor, como la primera mitad del encargo de seguridad para el paso 3. Siguen en pie la prueba de humo con Playwright y escapar los campos de los eventos reales antes de meterlos en `innerHTML`.
- Preguntas abiertas:
  - ¿Qué estados tiene cada rango de mago? (paso 4)
  - Titular del copyright en `LICENSE`: ¿«poligle» o tu nombre completo?
  - ¿Aceptas los términos comerciales de Anthropic antes de distribuir la primera versión que ejecute Claude Code? (lo prepara el paso 2)
  - La versión de trabajo de `docs/agentes.md` en Claude Docs no tiene estos cambios: ¿se sustituye por la del repo?
- Pruebas para Pol:
  1. Tras el push, abrir el repo en GitHub: imagen de la sala, insignias de CI y de licencias, y enlaces del README (maqueta, licencias y ronda SNES en el tag `v1.0`).
  2. Leer `auditorias/producto.md` §0 y §8 y confirmar que las decisiones son las tuyas.
  3. Ver la release v1.1 en GitHub con sus notas.
  4. Comprobar que la maqueta sigue igual en GitHub Pages.

## Paso 2 · Arquitectura y software (A), fase A, ronda 1 · 22/10/2026
- Cambios (detalle en `auditorias/software.md` §5 y arquitectura en `docs/arquitectura.md`):
  - Limpieza de v1.1 aplicada: sus 165 borrados no habían llegado a git. `check.py` ahora falla ante huérfanos y ante `legacy/`.
  - Núcleo local en `apps/core/`: `codewizards demo`, `serve --repo` (experimental, Claude Code del usuario) y `doctor`. Servidor solo en 127.0.0.1 con token, Host, Origin y CSP; registro JSONL con redacción de secretos; adaptador de Claude Code en modo headless, con el hechizo por stdin, permisos `dontAsk`, sandbox obligatorio y topes; rama y worktree por tarea; commit solo al aprobar; `--open-prs` con el `gh` del usuario.
  - Contrato de eventos v1 en `packages/contract/`: `seq`, `ts` de época, `account`, `cost_usd`, gremios por fabricante y eventos de bloqueo, cuota, fallo y cancelación.
  - La maqueta pasa a `apps/room/`: scripts en ficheros (`assets.gen.js` generado), modo en vivo (`net.js`), idempotencia, huecos, paleta neutra para gremios desconocidos, comentario al rechazar, botón «Detener» y bucle a prueba de fallos.
  - CI: jobs `room`, `core` (Linux, macOS y Windows) y `smoke` (Playwright sobre el paquete instalado); `pages.yml` publica solo la demo; Dependabot para npm.
- Archivos tocados: `apps/room/` (antes `apps/maqueta/`), `apps/core/`, `packages/contract/`, `tools/smoke.mjs`, `package.json`, `package-lock.json`, `.github/`, `.gitignore`, `codewizards-art/04_source/gen/check.py`, `codewizards-art/README.md`, `docs/agentes.md`, `docs/arquitectura.md` (nuevo), `auditorias/software.md` (nuevo), notas en `auditorias/maqueta.md` y `auditorias/seguridad.md`, `licenses/README.md` (nuevo), `README.md`, `CHANGELOG.md`, este traspaso, `COMMIT_MSG.txt` y `TAG_MSG.txt`. Borrados: los de la limpieza de v1.1 y `maqueta.html`.
- Decisiones de Pol: su «Continuar» tras la propuesta lo tomo como «adelante» a las seis recomendaciones (`auditorias/software.md` §4): proceso local con la sala en el navegador y escritorio en el hito 5; contrato v1; aceptar los términos comerciales de Anthropic antes del hito 3; Windows nativo sin Bash; Pages con workflow propio; entregas como parche de git.
- Encargos para pasos siguientes (detalle en `auditorias/software.md` §8):
  - (Pol) → aceptar los términos comerciales de Anthropic y escribir a ventas; Pages a «GitHub Actions»; probar `serve` con su cuenta; grabar salidas reales de Claude Code para los tests.
  - (paso 3) → el Archimago reparte el hechizo en tareas (hoy, un hechizo es una tarea); calibrar los topes; qué cuota expone Claude Code; tabla rango → modelo para `--model`.
  - (paso 4) → maná por cuenta con `quota.updated`; comportamiento de `agent.blocked`, `task.failed` y `task.cancelled`.
  - (paso 5) → comentario de rechazo, «Detener», pantalla de cuentas, vista de revisión del diff y aviso de no afiliación.
  - (paso 6) → `gemini` pasa a `google` en el arte, fuera Copilot, y quizá un sprite para el gremio desconocido.
  - (paso 7) → textos de la sala en inglés (objeto `T` de `ui.js`).
  - (paso 9) → publicar en npm con *trusted publishing* y quitar `private`; workflow de release; comprobar en cada versión de Claude Code que `-p` sigue funcionando con suscripción (`--bare`).
- Preguntas abiertas:
  - ¿Se publica ya una versión de prueba en npm para reservar el nombre `codewizards`?
  - ¿Añadimos `command.run` al contrato (v2) para auditar cada orden de un agente?
  - Siguen las del paso 1: titular del copyright y la versión de `docs/agentes.md` en Claude Docs.
- Pruebas para Pol: las de `auditorias/software.md` §9.

## Paso 2 · Corrección tras la primera CI (A) · 23/10/2026
- Cambios: worktrees bajo la ruta real (la CI de macOS fallaba porque `/var` es un enlace a `/private/var`; en Windows, por análisis, los nombres cortos), con un test de regresión con enlace; la sala ya no pide `/favicon.ico`; `pages.yml` sin `configure-pages`; `flake.nix` con `nix develop` y `nix develop .#smoke`; la prueba de humo acepta `CW_CHROMIUM`; versión 1.2.1. Detalle en `auditorias/software.md` §10.
- Archivos tocados: `apps/core/src/rooms/claude-room.js`, `apps/core/src/agents/claude-code/translate.js`, `apps/core/test/claude-room.test.js`, `apps/core/test/git.test.js`, `apps/room/src/index.html`, `tools/smoke.mjs`, `.github/workflows/pages.yml`, `flake.nix` (nuevo), `.gitignore`, `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`, `docs/arquitectura.md`, `licenses/README.md`, `auditorias/software.md`, este traspaso, `COMMIT_MSG.txt` y `TAG_MSG.txt`.
- Decisiones de Pol: ninguna nueva. Usa Nix: los comandos de desarrollo van con `nix develop`.
- Encargos para pasos siguientes: (paso 9) → valorar un paquete Nix (`nix run`) además del de npm.
- Preguntas abiertas: si Windows sigue en rojo, hace falta el log de su job.
- Pruebas para Pol: las de `auditorias/software.md` §10.

## Paso 2 · Primera prueba real y mejoras (A) · 23/10/2026
- Cambios (detalle en `auditorias/software.md` §11):
  - El mago entra cuando Claude Code arranca, con su modelo real, que la pizarra y el pergamino muestran.
  - La pizarra dice dónde quedó el cambio aprobado (rama, `git merge`, PR).
  - `--merge`: avance rápido de la rama del usuario, que nunca se fuerza.
  - `--record`: salida real de cada turno, con los secretos enmascarados.
  - `serve` no pasa `ANTHROPIC_API_KEY` ni `ANTHROPIC_AUTH_TOKEN` salvo con `--use-api-key`, y `doctor` lo avisa.
  - README con la sección «Workflow». Versión 1.2.2.
- Archivos tocados: `apps/core/src/agents/claude-code/env.js` (nuevo), `runner.js`, `apps/core/src/rooms/claude-room.js`, `apps/core/src/git.js`, `apps/core/src/cli.js`, `apps/room/src/ui.js`, `apps/room/src/style.css`, tests del núcleo (`env.test.js` nuevo, `claude-room.test.js`, `cli.test.js`), `tools/smoke.mjs`, `README.md`, `CHANGELOG.md`, `docs/agentes.md`, `docs/arquitectura.md`, `auditorias/software.md`, este traspaso, `package.json`, `package-lock.json`, `COMMIT_MSG.txt` y `TAG_MSG.txt`.
- Decisiones de Pol: «adelante» a `--merge`, al modelo real, a `--record` y a la clave de API fuera por defecto; el flujo, explicado en el README; para el paso 5, que la sala ocupe gran parte de la pantalla y ver el directorio del repo desde la interfaz.
- Encargos para pasos siguientes:
  - (paso 5) → las dos peticiones de interfaz de Pol y lo que quedó a medias (`docs/agentes.md`, prompt del paso 5, puntos 6 y 7).
  - (paso 3) → contar el mínimo de unos 24k tokens de entrada por tarea de Claude Code.
  - (paso 2 o paso 9) → listado de solo lectura del repo para el explorador de archivos, cuando el paso 5 lo concrete.
  - (Pol) → grabar con `--record` y pasar una grabación revisada para los tests.
- Preguntas abiertas: las de antes (npm, `command.run`, titular del copyright).
- Pruebas para Pol: las de `auditorias/software.md` §11.

## Paso 3 · Orquestación y tokens, ronda 1 · 23/10/2026
- Cambios (detalle en `auditorias/orquestacion.md` §5):
  - El Archimago v1, que son reglas sin modelo con la tabla de rangos en `ranks.json`.
  - El Mago Joven.
  - La cuota real (`rate_limit_event` pasa a maná por cuenta).
  - La espera por cuota, que reanuda la misma sesión.
  - El botón de integrar.
  - El contrato v2.
  - 20 evals con tests ocultos y su runner.
  - Firefox en la prueba de humo.
  - La release automática.
  - `codewizards` en el PATH de `nix develop`.
  - El arreglo del test de Windows (fines de línea).
  - Versión 1.3.0.
- Archivos tocados:
  - Nuevos: `apps/core/src/router/`, `evals/`, `tools/evals.mjs`, `tools/release-notes.mjs`, `auditorias/orquestacion.md`, y los tests `router.test.js` y `release-notes.test.js`.
  - Contrato, traductor, sala de Claude Code, git, servidor, CLI y sala demo.
  - `apps/room/src/` (`sim.js`, `world.js`, `ui.js`, `net.js`, `index.html` y `style.css`) y los tests de la sala y del núcleo.
  - El Claude Code falso, `tools/smoke.mjs`, la CI, `flake.nix` y `.gitignore`.
  - README, CHANGELOG, `docs/agentes.md`, `docs/arquitectura.md`, este traspaso y `package.json`.
- Decisiones de Pol: en `docs/agentes.md`, «Decididas el 23/10/2026, en el paso 3».
- Encargos para pasos siguientes:
  - (Pol) → lanzar el piloto de evals y pasarme el resumen; pegarme una línea `rate_limit_event`; decir si `opus` funciona en Pro.
  - (siguiente parche) → crear y abrir salas desde la interfaz; ajustar reglas y tabla con el piloto; la guía de npm.
  - (paso 4) → comportamiento de la espera, de las órdenes y de «por integrar».
  - (paso 5) → lo del punto 8 de su prompt.
  - (paso 6) → el punto 7 de su prompt: sala de descanso, pizarra en la pared, planta en cruz, vidrieras, partículas y el sprite del Mago Joven.
  - (paso 7) → los textos nuevos, en inglés.
- Preguntas abiertas: si `opus` está en el plan Pro (lo dirá el piloto); el titular del copyright y la versión de `docs/agentes.md` en Claude Docs, como antes.
- Pruebas para Pol: las de `auditorias/orquestacion.md` §9.

## Paso 3 · Tras probar la v1.3.0 (A) · 23/10/2026
- Cambios (detalle en `auditorias/orquestacion.md` §10):
  - La sala se reconstruye del registro sin animar el pasado (marca `ctl: live`).
  - Tareas en «En curso», «Hechas» y «Por hacer» (notas por sala).
  - Sala grande con el grimorio debajo y paneles laterales redimensionables.
  - Modelo y esfuerzo por rango (versiones fijadas) y por hechizo.
  - `codewizards` en el PATH de `nix develop`, ahora de verdad.
  - Versión 1.3.1.
- Decisiones de Pol: en `docs/agentes.md`, «Decididas el 23/10/2026, tras probar la v1.3.0».
- Encargos: (paso 5) pulir la nueva distribución, «Hechas» y «Por hacer»; el resto, como en la entrada anterior.
- Pruebas para Pol: las de `auditorias/orquestacion.md` §9, más reabrir una sala con historia.
