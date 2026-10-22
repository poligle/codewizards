# CodeWizards

IDE web multiagente que muestra el trabajo de los LLM como una torre de magos en pixel art isométrico, con estilo «parecido a Game Boy Color» y filtro CRT opcional. Cada proyecto es una sala y cada agente, un mago de su gremio. «Do not vibecode. Spellcode.»

Dominio: `codewizards.app` · Estado: arte de la Fase 1 hecho; siguiente hito, la maqueta.

## Qué hay

| Ruta | Contenido |
| --- | --- |
| `docs/agentes.md` | Plan de desarrollo: contexto común, contrato de eventos v0, protocolo, hoja de ruta y prompt de cada agente |
| `docs/concepto/` | Documentos de concepto originales (contexto general v3.2; dirección de arte y especificación de la Fase 1, escritas para estilo SNES) |
| `codewizards-art/` | Arte de la Fase 1 en estilo GBC, generado por código y retocable: 64 assets, paletas `.gpl`, `meta.json` con anclas |
| `codewizards-art/preview/codewizards_estilo_gbc.html` | Demo de la sala animada con interruptor de filtro CRT (ábrela en el navegador) |
| `codewizards-art/legacy/snes-ronda1/` | Ronda 1 en estilo SNES, archivada como referencia de geometría y método |
| `auditorias/` | Informes de cada paso y `traspaso.md` entre agentes |

## Arte

```sh
python3 -m pip install -r codewizards-art/04_source/requirements.txt   # numpy y Pillow
python3 codewizards-art/04_source/gen/build.py   # regenera assets, paletas, meta.json, vistas previas y demo
python3 codewizards-art/04_source/gen/check.py   # valida: indexado, alfa 1 bit, RGB555, paletas, colores, nombres
```

Para retocar un PNG a mano en Aseprite, añade su nombre a `codewizards-art/04_source/retocados.txt`: `build.py` ya no lo sobrescribirá.

## Hoja de ruta

| Hito | Qué | Puerta para pasar al siguiente |
| --- | --- | --- |
| 0 · Maqueta | Sala GBC, grimorio y pizarra con agentes simulados | «Adelante» de Pol a la maqueta |
| 1 · Especialización | Pasos 1 a 7 de los agentes sobre la maqueta | Contrato de eventos estable y maqueta pulida |
| 2 · GitHub y Cloudflare | Monorepo, CI y despliegue de prueba | CI en verde y despliegue de prueba en marcha |
| 3 · API de Claude | Gremio Anthropic real, clave de Pol y topes de gasto | Una tarea real de punta a punta, con su coste medido |
| 4 · Multigremio y ahorro | Otros proveedores y ahorro de tokens medido con evals | Ahorro medido sin perder calidad |
| 5 · Lanzamiento | Landing, plan de lanzamiento y versión publicada | — |

Detalle en `docs/agentes.md`.

## Primer commit

```sh
git init -b main
git add .
git commit -F COMMIT_MSG.txt
git remote add origin git@github.com:<usuario>/codewizards.git
git push -u origin main
```

`COMMIT_MSG.txt` está en `.gitignore`: cada entrega trae el suyo y no se versiona.

## Reglas que no se rompen

- La clave de la API nunca va al repo ni al navegador: solo como secreto del servidor.
- El arte se pinta por código, sin modelos generativos de imagen, y se retoca a mano.
- Escalado siempre entero (`image-rendering: pixelated`).

## Licencia

Pendiente de decidir.
