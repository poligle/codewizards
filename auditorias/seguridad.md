# Seguridad del repo y CI

22/10/2026 · Estado: entregado para revisión de Pol.

> Nota (v1.2): Pol eligió en el paso 2 el workflow propio para Pages (`.github/workflows/pages.yml`, solo la demo, acciones fijadas por SHA). Hay que cambiar Settings → Pages → Source a «GitHub Actions». La seguridad del núcleo local está en `docs/arquitectura.md` §3.

## 1. Qué pasaba
- El job «Secrets (gitleaks)» falló en el primer push del repo público con `unknown revision` y código de salida 1. Ese push empezaba en el commit raíz, y gitleaks-action escanea el rango `<primer commit>^..<último>`: el raíz no tiene padre. No era cosa de `fetch-depth`, que ya estaba a 0.
- El código 1 es un error de gitleaks; las fugas devuelven 2. El «no leaks found in partial scan» llegó tras escanear 0 bytes, así que el historial no se había escaneado nunca.
- Relanzar ese job repite el fallo, porque usa el mismo evento. Los pushes normales sí funcionan: con un commit la acción usa `-1` y con varios el padre del primero existe.

## 2. Escaneo hecho en este paso
| Comprobación | Resultado |
| --- | --- |
| gitleaks 8.30.1 y 8.24.3 sobre el historial completo y todas las ramas | 0 fugas |
| gitleaks sobre los ficheros, incluidos los ignorados | 0 fugas |
| Barrido propio de todos los blobs y de los metadatos de los commits: claves privadas, tokens, rutas locales, nombres de fichero sensibles y cadenas de alta entropía | Nada (solo un PNG en base64) |
| Metadatos de las 203 imágenes, también las incrustadas en HTML | Sin EXIF ni texto |
| URLs en el repo | 3, todas en documentos; la maqueta no hace peticiones externas |

## 3. Cambios
| Archivo | Cambio | Por qué |
| --- | --- | --- |
| `.github/workflows/secrets.yml` (nuevo) | gitleaks en cada push a cualquier rama, en cada PR, a mano y los lunes; a mano y los lunes escanea el historial completo | En un repo público cualquier rama subida es pública, y hace falta un escaneo completo tras el primer push o tras reescribir el historial |
| `.github/workflows/secrets.yml` | `GITLEAKS_VERSION: 8.30.1` | La acción usa por defecto 8.24.3, que no tiene regla para las claves de la API de Anthropic (llega en 8.28.0); comprobado con una clave falsa |
| `ci.yml` y `secrets.yml` | Acciones fijadas por SHA completo, con la versión en un comentario | Una etiqueta se puede mover a otro commit (caso tj-actions/changed-files, 2025); Dependabot actualiza el SHA y el comentario |
| `ci.yml` y `secrets.yml` | `persist-credentials: false` y `timeout-minutes` | Ningún paso necesita el token de git, y un job colgado no llega a las 6 horas por defecto |
| `.github/dependabot.yml` | Espera de 7 días (`cooldown`) y un solo PR agrupado | No adoptar una versión recién publicada que resulte comprometida; las actualizaciones de seguridad no esperan |
| `COMMIT_MSG.txt` | Sale del índice | Estaba versionado desde el primer commit, y `.gitignore` no afecta a ficheros ya versionados |

`secrets.yml` no lleva `concurrency` a propósito: cancelar un escaneo de push en curso dejaría esos commits sin escanear.

## 4. Validación
- actionlint 1.7.12: 0 problemas.
- zizmor 1.31.1 (sin red): 0 hallazgos; antes, 11 (7 altos, por las acciones sin fijar).
- `ci.yml`, `secrets.yml` y `dependabot.yml` validan contra los esquemas de SchemaStore.
- Con claves falsas de Anthropic, GitHub y Cloudflare, gitleaks 8.30.1 detecta las tres; 8.24.3 no ve la de Anthropic.
- No comprobado: los workflows aún no han corrido en GitHub, y los ajustes del §5 no se ven desde el repo.

## 5. Ajustes de GitHub que deben quedar activos
1. Escaneo de secretos y protección de push: cubren las claves de Anthropic y bloquean el push. Son la segunda capa, además de gitleaks.
2. Alertas y actualizaciones de seguridad de Dependabot.
3. Actions → General: token en solo lectura; Actions sin permiso para crear ni aprobar PRs; aprobación para los PRs de forks externos; y, con las acciones ya fijadas, «Require actions to be pinned to a full-length commit SHA».
4. Ruleset en `main`: sin force push ni borrado.
5. Pages: HTTPS obligatorio. Con dominio propio, verificarlo en GitHub antes de apuntar el DNS y no usar registros comodín.
6. En los repos públicos, los workflows programados se desactivan tras 60 días sin actividad: si pasa, reactivar `secrets`.

## 6. Decide Pol
- ¿Pages desde la rama `main` o con un workflow propio? Desde la rama es lo rápido y publica el repo entero, que ya es público. Con un workflow propio se publica solo la maqueta y sus acciones van fijadas por SHA. Recomendación: workflow propio.

## 7. Pruebas para Pol
1. Tras el push, `ci` y `secrets` en verde.
2. Actions → secrets → Run workflow: «No leaks detected» con todo el historial.
3. Revisar los ajustes del §5.
4. Con Pages activo, activar la política de SHA del §5.3 y relanzar «pages build and deployment». Si falla por acciones sin fijar, hace falta el workflow propio del §6.

## 8. Referencias
- gitleaks-action v3.0.0, `src/index.js` y `src/gitleaks.js`: cómo arma el rango del push y qué significa cada código de salida. https://github.com/gitleaks/gitleaks-action
- gitleaks, `config/gitleaks.toml` de cada versión: la regla `anthropic-api-key` aparece en 8.28.0. https://github.com/gitleaks/gitleaks
- GitHub, «Supported secret scanning patterns»: claves de Anthropic con protección de push. https://docs.github.com/en/enterprise-cloud@latest/code-security/reference/secret-security/supported-secret-scanning-patterns
- GitHub Changelog, 15/08/2025: la política que exige acciones fijadas por SHA. https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/
- CodeQL, `actions/unpinned-tag`: por qué fijar por SHA completo. https://codeql.github.com/codeql-query-help/actions/actions-unpinned-tag
- Wiz, tj-actions/changed-files (CVE-2025-30066): etiquetas movidas y secretos en logs públicos. https://www.wiz.io/es-es/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066
- actions/checkout, README: `persist-credentials`. https://github.com/actions/checkout
- GitHub, «Dependabot options reference»: `cooldown` y `groups`. https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- GitHub, «Disable and enable workflows»: la regla de los 60 días. https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows
- GitHub, «Verifying your custom domain for GitHub Pages»: dominios propios y registros comodín. https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
