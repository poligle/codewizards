# Salidas grabadas de Claude Code (sintéticas)

Líneas de `claude -p --output-format stream-json --verbose`, escritas a mano a partir de la
documentación de Claude Code (modo headless, `system/init`, `system/api_retry` y los tipos
`SDKMessage` del Agent SDK). **No son grabaciones reales**: en este entorno no hay Claude Code ni
cuenta. `__CWD__` y `__SESSION__` se sustituyen al reproducirlas.

| Fichero | Escenario |
| --- | --- |
| `success.ndjson` | Lee, crea `hello.txt`, edita `README.md`, un `git push` denegado y un `npm test` ejecutado, y termina bien; un `rate_limit_event` con la forma clásica |
| `resume.ndjson` | Turno tras un rechazo: retoca `hello.txt`; un `rate_limit_event` con `unifiedWindows` (5 h y 7 días) |
| `max-turns.ndjson` | Agota `--max-turns` |
| `rate-limit.ndjson` | Reintentos por `rate_limit`, un `rate_limit_event` rechazado y fin por límite de uso (texto de ejemplo, sin verificar) |

En el hito 3, Pol graba las reales con su cuenta y las añade junto a estas como
`real-<versión>-<escenario>.ndjson`, después de pasar el escaneo de secretos.

La forma de `rate_limit_event` sale de SDK de terceros y de capturas publicadas; Pol confirmó que su Claude Code 2.1.223 emite uno por turno (23/10/2026), pero aún no hemos visto el contenido de los suyos.
