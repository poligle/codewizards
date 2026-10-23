# Maqueta · hito 0 (paso 0)

22/10/2026 · Estado: v0 entregada para revisión de Pol.

> Nota (v1.2): informe histórico. La maqueta pasó a ser la sala de la app en `apps/room/` (paso 2): ya no hay `maqueta.html` autocontenido, la página carga sus scripts y `build.py` genera `src/assets.gen.js`; el test es `apps/room/test/room.test.mjs` y el contrato, v1. La URL antigua de GitHub Pages redirige a la demo.

## 1. Qué hay
- `apps/maqueta/maqueta.html` (unos 157 KB, autocontenida): sala GBC con filtro CRT, grimorio (hechizo, tareas y maná por gremio), pizarra (entrega en diff, aprobar y rechazar) y pergamino (registro de eventos).
- `apps/maqueta/src/`: `world.js` (rejilla, rutas A*, estaciones y comportamiento de los magos), `sim.js` (simulador que emite el contrato de eventos v0), `render.js` (canvas) y `ui.js` (interfaz). La lógica no depende del DOM y se prueba en node.
- `apps/maqueta/build.py`: incrusta el arte como datos indexados con RLE (sin PNG, así la salida es determinista) y genera la página.
- `apps/maqueta/test/maqueta.test.mjs`: rutas, contrato v0 y un hechizo completo de punta a punta.

## 2. Cómo se comporta
1. «Lanzar» crea de 3 a 5 tareas; el Archimago, sentado en su círculo rúnico sobre la alfombra, las anota.
2. Cada tarea convoca a un mago de un gremio distinto, que entra por la puerta.
3. Lee en la librería, escribe en la mesa (runas), presenta en la pizarra (tiza) y espera revisión con «!».
4. Un 15 % de las tareas falla una vez (bocadillo «?» y humo) y vuelve a escribir.
5. Al aprobar, celebra, descansa («z») y, al rato, sale por la puerta.

## 3. Criterios de terminado del hito 0
- [x] Un hechizo completo en menos de 2 minutos de simulación (lo comprueba el test).
- [x] 7 gremios y 2 rangos distinguibles sin color: emblema y nombre en tareas y maná; estrella del Gran Sabio en el sombrero.
- [x] El filtro CRT se activa, se desactiva y se recuerda.
- [x] Sin errores de consola en escritorio y móvil: comprobado en Chromium (escritorio 1440 × 900 y móvil 390 × 844) después de corregir el fallo del primer fotograma (§6). Sin comprobar en Firefox ni Safari.
- [x] El simulador emite exactamente el contrato de eventos v0 (lo comprueba el test).

## 4. Decisiones tomadas en este paso
- El Archimago ocupa el centro de la alfombra (bloquea 2 × 2 casillas) con círculo rúnico y libros que orbitan; hoy usa el sprite del Gran Sabio con una paleta dorada.
- Los estados se muestran con bocadillos al estilo GBC: «?», «!», «z», «…», libro, pluma, pizarra y estrella.
- Las entregas son diffs de plantilla: es una maqueta y no llama a ninguna API.
- La interfaz está en español y todos sus textos están juntos en `ui.js` para traducirlos.
- En móvil la sala se ve a ×1 para mantener el escalado entero.

## 5. Pruebas para Pol
1. Abrir `apps/maqueta/maqueta.html`, pulsar «Lanzar» y ver que los magos entran por la puerta y recorren las tres estaciones.
2. Aprobar y rechazar desde la pizarra; un rechazo devuelve al mago a la mesa.
3. Apagar el CRT, recargar y comprobar que sigue apagado.
4. Probar ×4 y «Aprobar solo».
5. Abrirla en el móvil: una columna, con la sala arriba.

## 6. Corrección del 22/10/2026
- En un navegador real, la maqueta se congelaba al cargar: dibujaba la sala una vez y «Lanzar» no creaba tareas. El primer fotograma de `requestAnimationFrame` puede llegar con una marca de tiempo anterior a la que se tomó con `performance.now()`. Ese `dt` negativo dejaba el reloj por debajo de cero, el índice de la llama de las antorchas valía −1 y `drawImage` lanzaba una excepción que paraba el bucle. En node no aparecía porque el reloj de los tests solo avanza.
- Arreglo: en el bucle (`ui.js`) el `dt` nunca es negativo, y `Sim.tick` y `World.update` ignoran un `dt` negativo o NaN. Test nuevo en `maqueta.test.mjs`, que falla con el código anterior.
- Comprobado en Chromium, en escritorio (×3) y en móvil (×1): un hechizo completo con un rechazo y aprobaciones a mano, «Aprobar solo» a ×4 y el CRT recordado al recargar; 0 errores de página o de consola y ninguna petición de red.
