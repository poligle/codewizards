# Salidas grabadas de Claude Code (sintéticas)

Líneas de `claude -p --output-format stream-json --verbose`, escritas a mano a partir de la
documentación de Claude Code (modo headless, `system/init`, `system/api_retry` y los tipos
`SDKMessage` del Agent SDK). **No son grabaciones reales**: en este entorno no hay Claude Code ni
cuenta. `__CWD__` y `__SESSION__` se sustituyen al reproducirlas.

| Fichero | Escenario |
| --- | --- |
| `success.ndjson` | Lee, crea `hello.txt`, edita `README.md` y termina bien; un `git push` denegado |
| `resume.ndjson` | Turno tras un rechazo: retoca `hello.txt` |
| `max-turns.ndjson` | Agota `--max-turns` |
| `rate-limit.ndjson` | Reintentos por `rate_limit` y fin por límite de uso (texto de ejemplo, sin verificar) |

En el hito 3, Pol graba las reales con su cuenta y las añade junto a estas como
`real-<versión>-<escenario>.ndjson`, después de pasar el escaneo de secretos.
