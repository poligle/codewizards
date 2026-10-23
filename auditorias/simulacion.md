# Simulación y comportamiento · paso 4, ronda 1

23/10/2026 · Estado: entregado para revisión de Pol · Versión v1.4.0. Incluye los arreglos que Pol pidió tras probar la v1.3.2.

## 0. En pocas líneas

- **Máquina de estados del mago**, escrita en código (`world.stateOf`) y en la tabla del §2: llegando, caminando, en cola, leyendo, escribiendo, presentando, esperando, confuso, celebrando, descansando, saliendo y fuera.
- **Colas.** Una estación llena ya no apila magos en la misma plaza: el que llega espera en una casilla libre al lado y entra en cuanto se libera una.
- **Ritmo.** Una ráfaga de lecturas o escrituras en la misma estación alarga la visita en vez de encadenar paseos. Un retraso de más de 6 acciones se comprime, conservando siempre la última visita y el orden de las esperas, y el mago apura el paso. La sala nunca muestra algo que el registro no diga.
- **Escala.** Caben 10 magos dentro; el resto espera fuera de la puerta y entra por orden de llegada en cuanto sale alguien. El panel dice cuántos esperan.
- **Recursos visibles.** En el panel izquierdo:
  - maná por cuenta (lo que queda de la ventana de 5 h);
  - salud del proyecto, que sube con lo aprobado y terminado y baja con fallos, errores y rechazos;
  - reloj de arena: cuánto falta para que se renueve la ventana.

  Gastar tokens no mueve la salud. El orbe y el reloj de arena dibujados en la sala quedan para el paso 6.
- **Arreglos pedidos:**
  - el error de Opus;
  - la tabla, otra vez con alias;
  - el grimorio, sin ejemplo.

## 1. El error de Opus

Pol vio `API Error: 400 Claude Code 2.1.223 does not support this model; version 2.1.280 or newer is required`. No dice que su plan Pro no incluya Opus: dice que su versión de Claude Code (la de nixpkgs) es anterior a `claude-opus-5-5`. Con las versiones fijadas de la v1.3.1, lo más probable es que también fallaran Sonnet y Haiku 5.5.

- **La tabla vuelve a los alias** (`haiku`, `sonnet`, `opus`). Claude Code elige el modelo más nuevo de esa familia que su versión conoce, así que funcionan con cualquier versión. El modelo exacto que usa cada mago se ve en la pizarra y en el pergamino, porque Claude Code lo dice al arrancar.
- **Mensaje claro.** Si un modelo fijado en `ranks.json` pide un Claude Code más nuevo, la tarea falla con un texto que dice qué versión hace falta y que un alias lo evita.
- **Si Pro incluye Opus** está sin comprobar. Lo dirá la primera tarea de Gran Sabio con el alias: si el plan no lo incluye, el error será otro y entonces el Gran Sabio pasará a `sonnet`.

## 2. Máquina de estados

| Evento | Estado | Estación y gesto |
| --- | --- | --- |
| `agent.summoned` | llegando, o fuera si la sala está llena | Se abre la puerta y entra; fuera, espera su turno |
| `agent.assigned` | quieto | «…» |
| `context.read` | caminando → leyendo | Librería; páginas |
| `code.write` | caminando → escribiendo | Mesa; runas |
| `command.run` | escribiendo | Runas en la mesa |
| `command.denied` | (sin cambio) | «!» un momento |
| `artifact.present` | caminando → presentando | Pizarra; la tiza escribe |
| `review.requested` | esperando | Junto a la pizarra, «!» |
| `review.approved` | celebrando | Salta y suelta chispas |
| `review.rejected` | escribiendo | «…» y vuelve a la mesa con el siguiente evento |
| `agent.error` | confuso | «?» y humo |
| `agent.blocked` (cuota) | esperando | Al sillón, «z», hasta `agent.unblocked` |
| `agent.blocked` (otro) | esperando | «!» donde esté |
| `task.done` | descansando → saliendo | Sillón o alfombra; sale a los 14 s |
| `task.failed` | confuso → descansando → saliendo | «?», humo, sillón y puerta |
| `task.cancelled` | saliendo | A la puerta |
| (estación llena) | en cola | Casilla libre al lado, «…» |
| (sala llena) | fuera | No se dibuja; el panel lo cuenta |

Faltan dibujos para dos estados: confuso y celebrando todavía usan el sprite normal con un globo, y su pose es del paso 6.

## 3. Criterios

- **La sala nunca contradice el registro.** La compresión solo descarta visitas intermedias; el mago acaba donde dice el último evento. Lo comprueba `room.test.mjs` (§9) con una ráfaga de 24 eventos.
- **Nada premia gastar más tokens.** La salud no se mueve con `tokens.used`, también comprobado en `room.test.mjs`. El brillo del orbe del bastón al gastar es solo un latido, sin efecto en ningún recurso.

## 4. Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 84 tests y 5178 comprobaciones de la sala (aforo, colas, ritmo, salud y estados incluidos) |
| `node tools/evals.mjs --self-check` | 20/20 |
| `node tools/smoke.mjs` (Chromium) | 41/41, con el grimorio vacío al abrir |

## 5. Encargos

- **Paso 5:** la línea de recursos (salud, magos fuera y reloj) en un diseño propio.
- **Paso 6:**
  - el orbe de la salud y el reloj de arena dibujados en la sala;
  - las poses de confuso y celebrando;
  - la sala de descanso para los que esperan cuota;
  - una cola visible junto a la puerta.
- **Pol:** actualizar Claude Code (en NixOS, un nixpkgs más nuevo o el instalador oficial) para poder usar los modelos 5.5 fijados. Con los alias no hace falta.

## 6. Pruebas para Pol

1. Aplicar el parche:

   ```sh
   git am paso-4.patch
   npm ci --ignore-scripts && npm test
   git push
   ```

   La release v1.4.0 sale sola.
2. `codewizards serve --repo /tmp/prueba`. Elige Gran Sabio y lanza un hechizo pequeño.
   - Si funciona: Opus está en tu plan, y la pizarra dice qué versión ha usado.
   - Si falla: pásame el mensaje.
3. Lanza varios hechizos seguidos y mira cómo se reparten las plazas y la cola de la pizarra.
