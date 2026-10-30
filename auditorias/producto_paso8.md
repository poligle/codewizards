# Producto y marca (B) · paso 8

30/10/2026 · v1.8.0.

## 0. En pocas líneas

- **codewizards.app**: una página introductoria en inglés con la estética de la sala. Explica el proyecto, enlaza al repositorio y a la demo (en `/demo/`) y da los pasos de instalación. Se publica con GitHub Pages; los pasos del dominio están en `docs/web.md`.
- **Capturas y GIF** de la sala, sacados de la demo por `tools/capture.mjs` y `capture.py`.
- **Marca**: hay una marca cercana viva en EE. UU. (CODE WIZARD, clase 9). Hace falta una búsqueda profesional antes de invertir en el nombre (`auditorias/marca.md`).
- **Privacidad**: una política breve (`site/privacy.html`). CodeWizards no recoge nada.
- **Plan de las 4 primeras semanas** en `auditorias/lanzamiento.md`.
- **Extensión de VS Code**: tiene sentido y está hecha, en preview, en `apps/vscode/`; no se publica hasta que Pol la pruebe.
- **Fallo arreglado**: el workflow de Pages no copiaba `ui.gen.css`, y la demo publicada salía sin fuente de píxel, iconos ni rollos.

## 1. Lectura

- `docs/agentes.md`, `auditorias/traspaso.md` y los encargos de `auditorias/producto.md` §9.
- `.github/workflows/pages.yml`: copiaba `index.html`, `style.css` y `*.js`, pero no `ui.gen.css`.
- El CSS de la sala (`style.css` y `ui.gen.css`): las variables `--roll-*`, `--parch` y `--edges`, el cursor por escala (`html.pxN`) y la fuente «CW Pixel», de la que solo se usan mayúsculas.

## 2. La web

- **Dirección**: la página es la pantalla de la sala.
  - La oscuridad de la sala (`#181828`) y el CRT, aquí quieto porque es una página para leer.
  - Pergaminos con los rollos y el papel del arte, el cursor de varita y la fuente de píxel en los títulos, siempre a `8 × --px` para que cada píxel de la letra sea un píxel de arte.
  - El texto largo en letra normal, como en la sala.
  - Colores de la sala: pergamino `#f8f0d8`, sepia `#784028`, oro `#f8c040` y tinta `#181828`.
- **Primera pantalla**:
  - el lema en grande;
  - una frase que dice qué es y cuál es el control (juzgas cada cambio antes del commit);
  - «Try the demo» e «Install»;
  - la sala en movimiento a escala entera: ×3, ×2 o ×1 según el ancho.
- **Secciones**:
  - cómo un hechizo se convierte en un cambio, numerado porque es una secuencia;
  - qué gasta y dónde corre;
  - las palabras de la torre, desde `words.js`;
  - los gremios, con sus emblemas del arte y el aviso de no afiliación;
  - la instalación, con requisitos y comandos;
  - un pie con las licencias y los enlaces.
- **Accesibilidad**:
  - enlace para saltar al contenido y foco visible;
  - textos alternativos;
  - con movimiento reducido, la sala sale quieta;
  - contraste alto, porque el texto va sobre pergamino o sobre la oscuridad;
  - en un móvil no hay desplazamiento lateral.
- **Una sola fuente**: los términos, los gremios, el aviso y la versión salen de `words.js` y de `package.json` al construir la web, así que no se pueden contradecir con la sala.

## 3. Capturas

- `site/img/room.gif`: la sala sola, a ×1 (240 × 170); la página la escala a ×3, ×2 o ×1.
- `site/img/room.png`: la imagen fija, para movimiento reducido.
- `site/img/window.webp`: la ventana entera, con CRT.
- `site/img/og.png` (1200 × 630): para las vistas previas de los enlaces.
- `site/img/favicon.png`.
- `docs/img/room.gif` (×2) y `docs/img/room.png` (la ventana sin CRT), para el README.
- El icono de la extensión.
- Se rehacen con `node tools/capture.mjs && python3 tools/capture.py`.

## 4. Privacidad

`site/privacy.html` dice lo que hace el código, comprobado en él:

- escucha solo en 127.0.0.1 y con token;
- lo que registra se queda en su carpeta de datos (`--record` enmascara los secretos);
- no comprueba actualizaciones ni envía nada;
- el CLI del agente manda el código a su fabricante, con la cuenta del usuario;
- la web no usa cookies, analítica ni terceros, y GitHub, como anfitrión, puede registrar la IP.

La política no es asesoramiento legal.

## 5. Extensión de VS Code: valoración y lo hecho

- **A favor**:
  - los usuarios viven en VS Code y la hoja de ruta (hito 5) ya la preveía;
  - es fina: unas 130 líneas que reutilizan la sala y el núcleo sin copiarlos.
- **En contra**:
  - el núcleo tiene que dejarse mostrar dentro de un marco;
  - los espacios de trabajo remotos no funcionan;
  - no he podido probarla a mano en VS Code;
  - publicarla pide una cuenta de editor en el Marketplace.
- **Decisión**: hacerla en preview y no publicarla hasta que Pol la pruebe.
- **Cómo funciona**:
  - ejecuta el `codewizards` instalado: `serve` para la carpeta, `tower` o `demo`;
  - el núcleo recibe `--frame-ancestor vscode-webview:`, de modo que solo los paneles de VS Code pueden mostrar la sala en un marco y cualquier otra página sigue rechazada;
  - cerrar el panel para el núcleo;
  - las opciones son ajustes de máquina, así que la configuración de un repositorio no puede cambiar lo que se ejecuta;
  - necesita un espacio de trabajo de confianza.
- **Probarla**: `code --install-extension codewizards-0.1.0.vsix`, o abrir `apps/vscode` en VS Code y pulsar F5.
- **Publicarla más adelante**: Marketplace con el editor `poligle` y Open VSX con `ovsx`.

## 6. Validación

- `npm test`: 99/99, con 3 pruebas nuevas de la extensión contra el núcleo real; `room.test`: 6040/6040.
- Prueba de humo en Chromium: 77/77.
  - Apartado F, la web construida: imágenes, fuente, gremios, términos, aviso, enlaces, anclas, 404, la dirección vieja de la demo, «Try the demo», ningún error, ninguna petición fuera de la máquina y móvil sin desplazamiento lateral.
  - Apartado G, la sala dentro de otra página: funciona con `--frame-ancestor` y se rechaza sin él.
- `tools/glossary.mjs --check` y `build.py --check`, en verde.
- `.vsix`: empaquetada con @vscode/vsce 3 (8 KB), sin errores.

## 7. Lo no comprobado

- La web publicada de verdad, con el dominio y HTTPS.
- La extensión a mano en VS Code, en espacios remotos y en Windows.
- Firefox, que no está en este contenedor (la CI lo prueba).
- La marca en EUIPO y OEPM.

## 8. Encargos

- **(paso 9)**: README rehecho con las capturas nuevas, publicación en npm y quitar de la web la nota «Before the first npm release».
- **(Pol)**:
  - el dominio, según `docs/web.md`;
  - la búsqueda profesional de la marca;
  - probar la extensión;
  - buscar Amber Order, Indigo Lodge y Jade Cloister.
