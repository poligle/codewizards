# Evals del Archimago

Sirven para medir si una configuración (un modelo, las reglas del Archimago, las notas de sistema por rango…) ahorra cuota sin perder calidad. Una técnica de ahorro solo entra en CodeWizards si su eval lo demuestra (`docs/agentes.md`, prompt del paso 3).

## Qué hay

| Ruta | Qué es |
| --- | --- |
| `tasks/<id>/task.json` | La tarea: el hechizo (en inglés), su dificultad (el rango más barato que debería resolverla), el lenguaje y el comando que la comprueba |
| `tasks/<id>/repo/` | El repositorio con el que empieza el mago |
| `tasks/<id>/check/` | Los tests ocultos. El mago no los ve: se copian después, en `.cw-check/` |
| `tasks/<id>/solution/` | La solución de referencia. Sirve para comprobar el banco, nunca se le enseña al mago |
| `configs.json` | Las configuraciones que se comparan |
| `results/` | Los resultados: una línea JSON por ejecución y un resumen en Markdown. No se versionan |

Son 20 tareas: 8 de Aprendiz, 8 de Mago Joven y 4 de Gran Sabio; 14 en JavaScript y 6 en Python. Las 6 marcadas como `pilot` (2 por rango) son las del piloto.

## Cómo se ejecuta

Sin gastar nada (es lo que hace la CI en cada push):

```sh
node tools/evals.mjs --self-check      # cada tarea falla antes y pasa con su solución
node tools/evals.mjs --routing         # qué rango dan las reglas del Archimago a cada tarea
node tools/evals.mjs --oracle --configs sonnet,archimago --tasks all   # el flujo entero con un agente falso
```

Con tu Claude Code (gasta tu plan):

```sh
node tools/evals.mjs --configs haiku,sonnet,archimago --tasks pilot
```

Cada ejecución:

1. Copia el repositorio de la tarea en una carpeta temporal.
2. Lanza tu Claude Code con la misma sala que `codewizards serve`: la misma política, el mismo sandbox y los mismos topes.
3. Cuando el mago presenta, copia los tests ocultos y los ejecuta.

Apunta si pasan, los tokens, la caché, los turnos, el tiempo y cuánto subió el uso de la ventana de 5 h. Se para sola si la ventana pasa del 85 % (`--stop-at`) o si se acaba la cuota.

## Cuánto cuesta (plan Pro)

Cada tarea arranca con unos 24.000 tokens de entrada, que son el prompt de sistema y las herramientas de Claude Code, más el trabajo de la tarea.

El piloto es de 6 tareas × 3 configuraciones, es decir, 18 ejecuciones. En Pro puede llevarse una buena parte de la ventana de 5 h. Por eso conviene lanzarlo en una ventana en la que no uses Claude para otra cosa, y con `--stop-at` como red.

La configuración `opus` puede fallar en Pro: no está claro que el plan incluya Opus en Claude Code. Si falla, quítala o ponle `sonnet` al Gran Sabio en tu `ranks.json`.

## Cómo leer el resumen

| Columna | Qué cuenta |
| --- | --- |
| Pass | Tareas cuyos tests ocultos pasan |
| Input + output | Media de tokens por tarea, sin contar la lectura de caché |
| 5 h window used | Puntos de la ventana de 5 h que se lleva cada tarea, según Claude Code. Es la medida que importa en un plan |

Una configuración gana si mantiene el número de aprobadas y gasta menos ventana. Con 6 tareas, las diferencias pequeñas son ruido: lo que decida qué se cambia en `ranks.json` es el banco entero, con más de una pasada.

## Añadir una tarea

1. Crea `tasks/<id>/` con `task.json`, `repo/`, `check/` y `solution/`. Copia una tarea parecida como plantilla.
2. Comprueba que `node tools/evals.mjs --self-check --tasks <id>` da ✓: los tests fallan con el repositorio y pasan con la solución.
3. Los tests ocultos no pueden depender de nada que el mago no pueda saber por el hechizo.
