# Traspaso entre pasos

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
