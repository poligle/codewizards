# Traspaso entre pasos

> Nota (22/10/2026): la ronda 1 en estilo SNES está archivada en `codewizards-art/legacy/snes-ronda1/`; las rutas de su entrada se refieren a esa carpeta.

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
