# Lanzamiento · las 4 primeras semanas · paso 8

30/10/2026 · Criterios: ninguna cifra sin fuente, no prometer ahorro de tokens sin medirlo (paso 3) y métricas sin rastreo.

## 0. Antes de la semana 1 (la puerta)

- [ ] v1.9.0 publicada en npm y en GitHub (`docs/publicar-npm.md`).
- [ ] codewizards.app con su dominio y HTTPS (`docs/web.md`).
- [ ] Una decisión sobre la marca (`auditorias/marca.md`).
- [ ] Los términos comerciales de Anthropic aceptados y el caso consultado (pendiente desde el paso 2).
- [ ] Una tarea real de punta a punta grabada con `--record`, revisada para que no salga ningún secreto, para el vídeo.

## Semana 1 · Lanzamiento discreto

Objetivo: que 3–5 desarrolladores usen CodeWizards con tareas reales, siguiendo el guion de `auditorias/uiux.md`.

- **Pol**: instalar desde npm en máquinas limpias (Linux; macOS y Windows con WSL2, si puede).
- **Invitar** a 5–10 personas que ya usen Claude Code, y pedir a cada una una issue con lo que la frena.
- **Preparar** el GIF, un vídeo corto de un hechizo real y el texto de presentación.
- **Salida**: una lista de fallos y fricciones, y los arreglos en una 1.9.x.

## Semana 2 · Publicación abierta

- **Show HN**: «Show HN: CodeWizards – Claude Code as a tower of pixel-art wizards», a primera hora de la mañana en EE. UU. (es costumbre, no un dato medido).
- **Comunidades**: r/ClaudeAI y las de Claude Code, respetando sus normas sobre autopromoción.
- **Redes**: Mastodon, Bluesky y X, con el GIF.
- **Respuestas**: todo en las primeras 48 horas. Cada pregunta repetida se convierte en una línea del README.
- **Riesgo**: un pico de issues. Plantillas de issue (fallo e idea) y la etiqueta «good first issue» antes de publicar.

## Semana 3 · Profundidad

- **Un artículo**: «Do not vibecode. Spellcode.», sobre el control frente al vibecoding, cómo se revisa cada cambio, qué gasta (maná) y qué no hace.
- **La extensión de VS Code**: si las pruebas de Pol salen bien, publicarla en el Marketplace y en Open VSX.
- **Evals reales** del piloto pequeño del paso 3, para poder hablar de consumo con datos.

## Semana 4 · Retrospectiva y hoja de ruta

- **Revisar** las métricas y las issues, y decidir el siguiente hito: el gremio Cerulean Circle (con Codex) o la app de escritorio.
- **Publicar** la hoja de ruta en una discusión de GitHub.

## Métricas sin rastreo

| Métrica | Dónde | Para qué |
| --- | --- | --- |
| Descargas semanales | Página del paquete en npm | Uso real |
| Estrellas, forks, issues y PR | GitHub | Interés y fricción |
| Visitas y clones del repositorio (últimos 14 días) | GitHub → Insights → Traffic | De dónde llega la gente |
| Respuestas en HN y Reddit | A mano | Qué se entiende y qué no |

La web no tiene analítica, por decisión de privacidad, así que no hay cifras de visitas de codewizards.app.

## El mensaje

- **En una frase**: «CodeWizards runs Claude Code with your own plan and shows its work as wizards in a pixel-art tower; you judge every change before it is committed.»
- **Lo que no se dice**:
  - ahorro de tokens, porque no está medido;
  - soporte de otros proveedores, porque está planeado;
  - Windows nativo completo, porque los magos no tienen Bash sin WSL2.
