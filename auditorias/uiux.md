# UI/UX · paso 5, ronda 1

23/10/2026 · Estado: entregado para revisión de Pol · Versión v1.5.0. El paso 4 queda validado por Pol el 23/10/2026; el parche del paso 5 va encima del suyo.

## 0. En pocas líneas

Esta ronda cierra lo que los pasos 2, 3 y 4 dejaron a la interfaz y lo que Pol ha pedido sobre la marcha:

- **Explorador de archivos.**
  - Muestra el árbol de lo que está en commit en la rama del usuario.
  - Un fichero se abre en la pizarra, con números de línea y en solo lectura.
  - El núcleo lo lee con git, nunca del disco, y solo da rutas que git lista, con el mismo token que la sala.
- **Revisión del diff.**
  - Un bloque plegable por fichero, con sus líneas añadidas y quitadas.
  - Sin las cabeceras internas de git.
  - Las líneas largas se desplazan en horizontal en vez de partirse.
- **Motivos del Archimago en español.** El núcleo los manda en inglés y la sala traduce los conocidos.
- **Teclado y movimiento.**
  - Ctrl o Cmd + Intro lanza el hechizo.
  - Quien pide movimiento reducido al sistema empieza con el CRT apagado y sin sus animaciones.
- Lo que ya estaba de los pasos anteriores sigue igual: paneles redimensionables, sala grande, «En curso», «Hechas» y «Por hacer», maná, salud y reloj.

## 1. Decisiones

| Punto del prompt | Decisión | Medida |
| --- | --- | --- |
| IDE y sala | La sala es la vista principal, en el centro. El diff, la aprobación y el registro van en el panel derecho; las tareas, las notas, los archivos y los recursos, en el izquierdo | En 1920 × 1080 la sala se ve a ×5, y a ×3 en 1440 × 900 (`tools/smoke.mjs`) |
| Clics por tarea frecuente | Ver el detalle abajo | Contados sobre la interfaz actual |
| Legibilidad | El código (diff, ficheros y notas) siempre en monoespaciada legible; el CRT cubre solo la sala | Capturas de la prueba de humo |
| Accesibilidad | Los gremios se distinguen por emblema además de por color; los separadores de paneles se manejan con las flechas; movimiento reducido sin CRT | Falta la auditoría WCAG 2.2 AA completa |
| Pantallas | Escritorio primero; por debajo de 1100 px, una columna con la sala arriba | Prueba de humo en 390 × 844 a ×1 |

Clics por tarea frecuente:
- **Lanzar:** escribir y pulsar Ctrl + Intro, o un clic en «Lanzar».
- **Aprobar:** un clic en la tarea y otro en «Aprobar».
- **Ver el coste:** ningún clic; está en la lista de tareas.
- **Detener:** un clic en la tarea y otro en «Detener».

## 2. Lo que queda (ronda 2)

- **«La Torre»**, el vestíbulo para fundar una sala (sobre un repo existente o en uno nuevo, eligiendo la ruta) y para entrar en una. El núcleo tiene que llevar varias salas a la vez, así que va en su propio parche.
- La auditoría WCAG 2.2 AA completa (contraste de los paneles en los dos temas y orden del foco) y la prueba con 3 a 5 desarrolladores, como pide el prompt.
- En el explorador: ver los ficheros de la rama de una tarea, no solo los de la rama del usuario.
- Móvil: consultar y aprobar cómodamente; hoy funciona en una columna, sin diseño propio.

## 3. Validación

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 85 tests y 5178 comprobaciones de la sala |
| `node tools/smoke.mjs` (Chromium) | 44/44. Incluye el diff por fichero con sus cuentas, el motivo en español y abrir `README.md` desde el explorador |

## 4. Pruebas para Pol

1. Aplicar, en orden, el parche del paso 4 y el del paso 5:

   ```sh
   git am paso-4.patch paso-5.patch
   npm ci --ignore-scripts && npm test
   git push
   ```

   La CI publica la v1.5.0.
2. En `codewizards serve --repo /tmp/prueba`:
   - despliega «Archivos del repo» y abre un fichero;
   - lanza un hechizo con Ctrl + Intro;
   - revisa el diff fichero a fichero.
