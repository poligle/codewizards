# Producto y marca · paso 1 (fase A), ronda 1

22/10/2026 · Estado: entregado, con las decisiones de Pol del 22/10/2026 · Versión v1.1.

## 0. En pocas líneas
- CodeWizards será una **app local y open source** que dirige los **CLI oficiales** de cada proveedor (Claude Code primero) **con las cuentas del propio usuario**: sus planes de pago o sus cuotas gratuitas, sin créditos de pago por token.
- **No tiene servidor ni guarda nada**: ni claves, ni tokens, ni código. Cada CLI inicia sesión con su propio flujo; el código va del ordenador del usuario a su proveedor y a su repo de GitHub, y lo que registre la app se queda en su ordenador.
- Se diferencia por la combinación: **varias cuentas con reparto por cuota** (el maná), **una puerta de revisión** (nada entra sin aprobar el diff) y **un estado legible de un vistazo** (la sala). El pixel art solo no basta: ya existe Pixel Agents.
- `codewizards.app` será la **página de descarga**. Licencias: código **MIT** y arte **CC BY 4.0**; el nombre no se licencia.
- El mayor riesgo son los **términos de los proveedores**: Anthropic permite esta forma de uso con condiciones estrictas (§6.1).

## 1. Lectura (inventario)
| Qué | Dónde | Estado |
| --- | --- | --- |
| Plan, protocolo y contrato de eventos v0 | `docs/agentes.md` | Vigente; en este paso se le añaden las decisiones de Pol (§8) |
| Traspaso | `auditorias/traspaso.md` | 4 entradas antes de esta |
| Maqueta v0 | `apps/maqueta/` | Funciona en Chromium, en escritorio y en móvil (`auditorias/maqueta.md` §6) |
| Arte GBC | `codewizards-art/` | 64 assets validados; 7 gremios, Copilot incluido |
| Concepto v3.2 | `docs/concepto/contexto_general.md` | Visión de partida; su estilo SNES y su arquitectura en Cloudflare quedan sustituidos por el plan y este informe |
| Seguridad y CI | `auditorias/seguridad.md` | Acciones fijadas por SHA, escaneo de secretos y ajustes de GitHub aplicados |
| Ronda SNES y sus documentos | — | Retirados del árbol en v1.1; siguen en el tag `v1.0` |

## 2. Público
Tres perfiles, por orden de prioridad para la v1:

1. **Quien ya paga un plan y trabaja con agentes en local.** Tiene Claude Pro o Max (o ChatGPT Plus) y lanza varias sesiones de Claude Code o Codex en terminales. Su problema: no ve de un vistazo qué agente está bloqueado ni cuánto límite le queda, y revisar lo que cambia cada uno es tedioso. El 66 % de los desarrolladores usa asistentes o agentes de código, y entre quienes usan IA a diario, el 31 % la usa cuatro horas o más al día [SO26-prensa].
2. **Quien combina cuentas gratuitas y de pago.** Gasta la cuota gratuita de Google (1.000 peticiones al día con cuenta personal [GCLI]) en lo sencillo y guarda su plan de pago para lo difícil, cambiando de herramienta a mano. El 27 % de las organizaciones ya usa modelos distintos para trabajos distintos, y al elegir modelo y preparar prompts al 38 % de los desarrolladores le importa el coste (al 75 %, la calidad) [SO26-blog].
3. **El escéptico del vibecoding, o el tech lead de un equipo pequeño.** Quiere agentes, pero que nada entre sin revisión y que todo deje rastro. Solo el 6,6 % confía en la IA para decisiones importantes, y el 78,7 % considera importante que cite sus fuentes [SO26-prensa].

Fuera de foco en la v1: la enseñanza infantil (el terreno de CodeWizardsHQ, §6.2) y las empresas grandes con compras centralizadas.

## 3. Posicionamiento
| Producto | Qué hace | Cómo cobra | Frente a CodeWizards |
| --- | --- | --- | --- |
| Cursor | Editor con IA | De $0 a $200 al mes, con un uso semanal incluido de sus propios modelos; los de terceros se pagan a precio de API con crédito prepago. Equipos: $30, $100 o $200 por puesto [CUR] | Es un editor y cobra por token los modelos de terceros; CodeWizards dirige agentes con los planes que ya pagas y convive con tu editor |
| GitHub Copilot | Asistente y agente en el editor y en la web | Free, Pro $10, Pro+ $39 y Max $100 al mes, con créditos de IA [GHC] | Es una cuenta que CodeWizards podría usar, no un rival directo |
| Claude Code | Agente oficial de Anthropic | Incluido en Pro y Max, con un límite por sesión de 5 horas y otro semanal, compartidos con el chat de Claude; o con clave de API [CPM] | Es el primer motor de CodeWizards |
| Devin | Agente autónomo en la nube | Free, Pro $20, Max $200 al mes; Teams desde $80 (fuente secundaria) [DEV] | Autonomía en la nube frente a control en local |
| OpenHands | Plataforma open source (MIT) de agentes | Gratis con tu clave; nube con pago por uso [OH] | Igual de abierto, sin capa de control ni metáfora |
| Vibe Kanban | Tablero local que orquesta Claude Code, Gemini CLI, Codex, Amp y otros | No consta en su README [VK] | Rival más directo en orquestación; no reparte por cuotas ni muestra el estado como CodeWizards |
| Conductor | App de Mac con varios Claude Code y Codex en worktrees, revisión del diff y PR | No consta en su web [CON] | Mismo flujo de ramas y revisión; solo Mac y sin reparto por cuotas |
| Pixel Agents | Oficina en pixel art para agentes de Claude Code (VS Code y `npx`), MIT, 9,8k estrellas | Gratis [PA] | Misma metáfora; solo Claude Code, sin aprobación ni costes (los tiene en su hoja de ruta) |
| Langfuse y similares | Observabilidad de aplicaciones con LLM | Núcleo MIT gratis; nube de pago [LF] | Sirven a quien construye apps con LLM, no a quien dirige agentes de código |

**Dónde gana CodeWizards.** Ninguno de la tabla ofrece la combinación completa:
1. Varias cuentas a la vez, con un reparto de tareas que tiene en cuenta la cuota que queda en cada una.
2. Un flujo con puerta: hechizo → tareas → ramas → revisión del diff → fusión. Nada entra sin aprobación.
3. Un estado legible de un vistazo: quién lee, quién escribe, quién presenta y quién está bloqueado.
4. Local, open source y sin guardar nada.

**Lo que no basta:** el pixel art por sí solo (Pixel Agents ya lo hace y es popular) ni la orquestación en ramas (Vibe Kanban y Conductor ya la hacen). Prometer ahorro de tokens tampoco: el paso 3 tiene que medirlo antes.

## 4. MVP (versión 1 del producto)
Entra:
- App local para macOS, Linux y Windows. La sala sigue siendo web, como la maqueta; el paso 2 decide si va dentro de una app de escritorio o en el navegador.
- Una sala = un repo de GitHub clonado en local. Cada tarea va en su rama (o worktree) y su PR.
- Un motor: Claude Code oficial, sin modificar, con la cuenta del usuario (plan de Claude o clave de API). Va primero porque es el agente más elegido en la encuesta de 2026: 66 %, frente al 59 % de GitHub Copilot [SO26-blog].
- El Archimago parte el hechizo en tareas y asigna un rango (un modelo) a cada una.
- La pizarra muestra el diff: aprobar = la tarea sigue a su PR; rechazar = el mago vuelve a la mesa con el comentario.
- Maná: el consumo de cada tarea y lo que el CLI exponga del límite restante. En Pro y Max ese límite es el mismo para Claude Code y para el chat de Claude [CPM], así que CodeWizards compite con el resto del uso del usuario.
- Registro de eventos local y reproducible.
- Producto en inglés.

No entra en la v1: otros motores (Codex y el CLI de Google llegan en el hito 4), equipos, sincronización en la nube, móvil más allá de mirar, y sonido.

Criterio de éxito: un hechizo real de punta a punta con Claude Code, con cada diff aprobado o rechazado por el usuario y el consumo de cada tarea visible antes de fusionar.

## 5. Modelo de negocio
| Opción | A favor | En contra | Coste técnico |
| --- | --- | --- | --- |
| **A. Gratis y local, con las cuentas del usuario** (elegida) | Cero coste de inferencia; nada que guardar; encaja con los términos de los proveedores (§6.1) | Sin ingresos directos | Bajo: un programa descargable y una web estática |
| B. Claves de API del usuario | Vale para cualquier proveedor | El usuario paga por token, justo lo que Pol no quiere | Medio |
| C. Plan de pago con tokens incluidos | Ingresos | Anthropic prohíbe pagar, revender o intermediar el uso de Claude de los usuarios finales [CCL]; sus términos comerciales prohíben revender sin aprobación [CT] | Alto: facturación, márgenes y abuso |

Decisión de Pol: **A**, con B solo como opción para quien no tenga plan. Ingresos futuros, si llegan, sin tocar el uso de los modelos (por ejemplo, patrocinios o donaciones): se revisa en el paso 8.

## 6. Riesgos

### 6.1 Términos de los proveedores (el mayor)
- **Anthropic** [CCL]:
  - Se permite que el usuario inicie sesión con su propio plan en el binario oficial de Claude Code, sin modificar, también cuando otro producto lo ejecuta.
  - Para ejecutar Claude Code dentro de un producto hay que aceptar sus términos comerciales; no se puede modificar el binario ni quitar sus métodos de autenticación, y nadie puede pagar, revender o intermediar el uso de otros.
  - Prohibido: ofrecer «iniciar sesión con Claude» en una app propia, enrutar peticiones con las credenciales de planes Free, Pro o Max de otros, y recoger, guardar o intermediar credenciales o tokens de sesión. Los productos que usen el Agent SDK deben ir con clave de API.
  - Los límites de Pro y Max se anuncian para un uso individual normal, y Anthropic puede actuar sin avisar.
- **OpenAI**: desde el DevDay del 29/9/2026, «Sign in with ChatGPT» deja usar el plan Plus o Pro en apps de terceros; las apps locales y open source pueden integrarlo, y los servicios comerciales alojados necesitan aprobación (fuente secundaria [OAI]). La otra vía es su CLI oficial, Codex.
- **Google**: su CLI oficial da 1.000 peticiones al día gratis con una cuenta personal, 1.500 con AI Pro y 2.000 con AI Ultra. Desde el 18/6/2026, el CLI del plan gratuito es Antigravity CLI [GCLI].
- **GitHub Copilot**: el uso de la suscripción desde un agente de terceros solo está anunciado para OpenCode, mediante un acuerdo formal [GHO]. Hay que verificar si se puede usar con su CLI oficial.
- **Varias cuentas del mismo proveedor para sumar límites: no.** Al introducir los límites semanales, Anthropic citó compartir cuentas y revender acceso como infracciones [WL].
- Mitigación: un adaptador por CLI; binarios oficiales sin modificar; CodeWizards nunca toca credenciales; revisar los términos en cada versión (paso 9); aceptar los términos comerciales de Anthropic antes de distribuir la primera versión que ejecute Claude Code.

### 6.2 Marcas
- **Gremios** (decisión de Pol): nombre de fantasía, con el proveedor como dato; emblemas propios, sin logos; aviso «no afiliado».
  - Anthropic permite decir en texto plano que un producto ejecuta Claude Code, pero no usar sus nombres o logos en el nombre del producto, en el logo ni de forma que sugiera respaldo [CCL], [TMA].
  - OpenAI no permite nombres de modelo en el título de una app ni la marca GPT en nombres de productos [OAB].
  - La licencia de Llama exige mostrar «Built with Llama» y no concede marca más allá de eso [LL].
- **Propuesta de nombres para el paso 7**, que los cierra con Pol y comprueba que estén libres:

  | Proveedor | Color | Nombre propuesto |
  | --- | --- | --- |
  | Anthropic | ámbar | Amber Order |
  | OpenAI | azul cielo | Cerulean Circle |
  | Google | carmesí | Crimson Court |
  | DeepSeek | índigo | Indigo Lodge |
  | Qwen | jade | Jade Cloister |
  | Meta | violeta | Violet Conclave |

  Criterio: nombres originales, sin aludir a nombres ni logos de los proveedores.
- **El nombre CodeWizards.**
  - CodeWizardsHQ, una escuela de programación infantil de EE. UU., tiene marcas «CODEWIZARDSHQ» en la USPTO (estado sin verificar) [CWHQ].
  - La marca «CODE WIZARDS» (USPTO 88396870, clase 41) se abandonó en 2020 [CW].
  - Hay muchas herramientas llamadas «Code Wizard».
  - Antes del paso 8 hay que buscar la marca en EUIPO, OEPM y USPTO (clases 9 y 42) y valorar registrarla. Esto no es asesoramiento legal.

### 6.3 Privacidad
- CodeWizards no guarda nada en ningún servidor. El código viaja del ordenador del usuario a su proveedor con su propia cuenta, y se rige por los términos de esa cuenta. El registro de eventos y los diffs se quedan en el ordenador del usuario. En los términos comerciales, Anthropic no entrena con el contenido de sus clientes [CT]; en los planes de consumo mandan los términos y la configuración de privacidad del usuario.
- DeepSeek guarda en servidores de China los datos que recoge, según su política de privacidad [DS]. Hay que avisarlo en la interfaz al conectar esa cuenta.
- Como no se guardan datos, la política de privacidad será breve; la web de descarga usará analítica sin cookies (§7).

### 6.4 Dependencia técnica
Los CLI cambian sus opciones y su salida, y los proveedores cambian sus límites. Mitigación: adaptadores aislados y tests de contrato con salidas grabadas (paso 2).

### 6.5 Competencia
Pixel Agents, Vibe Kanban o Conductor pueden añadir lo que hoy nos diferencia. Mitigación: un MVP pequeño, rápido y centrado en las tres diferencias del §3.

### 6.6 Consumo
Un bucle de agentes agota el límite del plan del usuario. Mitigación: topes por tarea, un aviso antes de lanzar y una estimación visible. Anthropic citó tener Claude funcionando 24/7 en segundo plano como uno de los patrones que motivaron sus límites semanales [WL].

## 7. Métricas sin rastreo invasivo
- La app no envía telemetría. Las métricas de uso se calculan en local y son para el propio usuario: hechizos, tareas aprobadas y rechazadas, consumo por tarea y por cuenta, y tiempo hasta aprobar.
- Para el proyecto: descargas de las releases de GitHub, estrellas, issues y visitas a `codewizards.app` con Cloudflare Web Analytics, que no usa cookies ni localStorage ni identifica a nadie por huella [CWA].
- Si algún día hiciera falta más: telemetría opcional, agregada y sin contenido, y solo con el «adelante» de Pol.

## 8. Decisiones de Pol (22/10/2026)
| Tema | Decisión |
| --- | --- |
| Producto | App local que dirige los CLI oficiales con las cuentas del usuario (planes de pago o gratuitos); sin modelo de consumo por token; claves de API solo como opción |
| Datos | CodeWizards no guarda nada: ni claves, ni tokens, ni código. Sin servidor propio; lo que registre la app se queda en el ordenador del usuario |
| Distribución | Página de descarga en `codewizards.app` |
| Licencia | Open source: código MIT y arte CC BY 4.0; el nombre y el logo no se licencian |
| Idioma | Producto solo en inglés; el plan, los informes y el traspaso siguen en español |
| Dónde trabajan los agentes | En repos de GitHub, con ramas y PR |
| Gremios | 6, uno por fabricante: Anthropic, OpenAI, Google, DeepSeek, Qwen y Meta; Copilot deja de ser gremio (puede volver como cuenta) |
| Nombres de gremio | De fantasía, con el proveedor como dato |
| Limpieza | Completa; el estado anterior queda en el tag `v1.0` |

## 9. Encargos
- **Paso 2 · arquitectura:**
  - Replantear la arquitectura para la app local: empaquetado (CLI con la sala en el navegador, app de escritorio o extensión) y qué se descarga desde `codewizards.app`.
  - Un adaptador por CLI que lance el binario oficial sin modificar y traduzca su salida (hooks, salida JSON o lo que cada CLI ofrezca) al contrato v0. Primero Claude Code.
  - Credenciales: nunca se tocan. Cada CLI se autentica con su flujo, y las claves de API opcionales las gestiona cada CLI con su propia configuración; CodeWizards no las guarda. El acceso a GitHub, con el `git` y el `gh` que el usuario ya tiene.
  - Ramas o worktrees por tarea y PR por tarea. Registro de eventos local. Tests de contrato con salidas grabadas de cada CLI y prueba de humo con Playwright.
  - Proponer si los eventos llevan la cuenta además del gremio (`agent.summoned`, `tokens.used`); cambiar el contrato exige el «adelante» de Pol.
  - Confirmar con Anthropic si una app local open source que ejecuta Claude Code debe aceptar sus términos comerciales (mi lectura: sí).
- **Paso 3 · orquestación:** el Archimago elige rango, modelo y cuenta según la cuota restante. Hay que averiguar qué información de límite expone cada CLI. Estimación antes, consumo real después y tope por tarea. En Pro y Max la cuota se comparte con el chat de Claude [CPM]. Ningún nombre de modelo fijo en el código. Nada de prometer ahorro sin evals.
- **Paso 4 · simulación:** 6 gremios; el maná pasa a ser por cuenta (una cuenta como Copilot puede alimentar a varios gremios); estados de «sin cuota» y «bloqueado esperando al usuario».
- **Paso 5 · UI/UX:**
  - Pantalla de cuentas: conectar, ver la cuota y ver qué gremios alimenta cada una.
  - Nombre de fantasía con el proveedor como dato.
  - Aviso «no afiliado».
  - Aviso de privacidad por proveedor, por ejemplo para DeepSeek.
  - Interfaz solo en inglés.
- **Paso 6 · arte:** quitar el gremio Copilot (paletas, estandartes y aprendices) y decidir qué hacer con la paleta de sprites que queda libre; revisar que ningún emblema recuerde a un logo real.
- **Paso 7 · copy:** todos los textos en inglés; cerrar los nombres de los gremios (§6.2); textos de privacidad («we never store your keys or code») y de no afiliación.
- **Paso 8 · producto B:** búsqueda de marca para CodeWizards (§6.2); página de descarga en `codewizards.app` con Cloudflare Web Analytics; política de privacidad breve; revisar el modelo de ingresos.

## 10. Lo no comprobado
- Los precios de Devin y los detalles de «Sign in with ChatGPT» vienen de fuentes secundarias. La página oficial de ayuda de OpenAI no se pudo leer.
- Si la suscripción de Copilot sirve desde su CLI oficial dentro de otra app.
- El estado de las marcas «CODEWIZARDSHQ»: la página del registro no cargó.
- Qué información de cuota exponen Claude Code y los demás CLI.
- Precios y licencias de Vibe Kanban y Conductor.
- Si los términos comerciales de Anthropic aplican a una app local open source. Es mi lectura prudente de su documentación, no una confirmación.

## 11. Referencias
Fuentes consultadas el 22/10/2026; lo que se toma de cada una:
- [SO26-prensa] Stack Overflow, nota de prensa de la encuesta 2026 (6/10/2026): uso de agentes, horas al día, confianza y atribución. https://stackoverflow.co/company/press/archive/stack-overflow-annual-developer-survey-ai-trust-conditional
- [SO26-blog] Stack Overflow, resultados de la encuesta 2026: modelos distintos por trabajo, coste frente a calidad y agentes más elegidos. https://stackoverflow.blog/2026/10/06/the-results-of-the-2026-developer-survey-are-here/
- [CCL] Claude Code, «Legal and compliance»: qué se permite con suscripciones y productos de terceros. https://code.claude.com/docs/en/legal-and-compliance
- [CPM] Centro de ayuda de Claude, «Use Claude Code with your Pro or Max plan»: Claude Code en Pro y Max, y límites de 5 horas y semanales compartidos con el chat. https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan
- [CT] Anthropic, términos comerciales: reventa y entrenamiento con contenido de clientes. https://www.anthropic.com/legal/commercial-terms
- [TMA] Anthropic, guía de marcas: nada de usos que sugieran afiliación. https://www.anthropic.com/legal/trademark-guidelines
- [WL] Stark Insider (28/7/2025): motivos de los límites semanales de Claude. https://www.starkinsider.com/2025/07/anthropic-adds-weekly-limits-to-claude-cites-abuses.html
- [OAI] Xenospectrum (2/10/2026), fuente secundaria: «Sign in with ChatGPT» en apps de terceros. https://xenospectrum.com/en/chatgpt-sign-in-subscription-apps/
- [OAB] OpenAI, guía de marca: nombres de modelo y uso de logos. https://openai.com/brand/
- [GCLI] Gemini CLI, cuotas y precios: peticiones al día por tipo de cuenta y paso a Antigravity CLI. https://geminicli.com/docs/resources/quota-and-pricing/
- [GHO] GitHub Changelog (16/1/2026): Copilot con OpenCode. https://github.blog/changelog/2026-01-16-github-copilot-now-supports-opencode/
- [GHC] GitHub Docs, planes individuales de Copilot. https://docs.github.com/en/copilot/concepts/billing/individual-plans
- [CUR] Cursor, modelos y precios. https://cursor.com/docs/models-and-pricing
- [DEV] Fast.io, fuente secundaria: planes de Devin. https://fast.io/resources/devin-ai-core-plan.md
- [OH] OpenHands, blog (18/6/2025): licencia y oferta en la nube. https://www.openhands.dev/blog/openhands-cloud-self-hosted-secure-convenient-deployment-of-ai-software-development-agents
- [VK] Vibe Kanban, README (vía scour.ing): agentes compatibles y funcionamiento. https://scour.ing/p/https://github.com/BloopAI/vibe-kanban
- [CON] Conductor, web: flujo con worktrees y revisión. https://www.conductor.build/workflows/run-parallel-claude-codes
- [PA] Pixel Agents, repositorio: qué hace, licencia y estrellas. https://github.com/pablodelucca/pixel-agents
- [LF] Langfuse, precios del autoalojamiento: núcleo MIT. https://langfuse.com/pricing-self-host.md
- [LL] Licencia comunitaria de Llama 4 (copia de Wind River): «Built with Llama» y marca. https://open.windriver.com/info/uni-license-list/licenses/llama-4-cla-2025.html
- [DS] TechTarget (21/3/2025): dónde guarda DeepSeek los datos. https://www.techtarget.com/searchEnterpriseAI/tip/Does-using-DeepSeek-create-security-risks
- [CW] Justia, marca «CODE WIZARDS» (USPTO 88396870). https://trademarks.justia.com/883/96/code-88396870.html
- [CWHQ] Justia, marcas de CodeWizardsHQ Inc. https://trademarks.justia.com/owners/codewizardshq-inc-4275224
- [CWA] Cloudflare Web Analytics: sin estado en el cliente y sin huella. https://cloudflare.com/web-analytics
