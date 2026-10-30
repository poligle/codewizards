# La web: codewizards.app

30/10/2026 · paso 8 · La web es estática: `site/` y la demo de la sala en `/demo/`. La construye `tools/site.mjs` y la publica `.github/workflows/pages.yml` en GitHub Pages.

## Cómo está hecha

- Las páginas son `site/index.html`, `privacy.html` y `404.html`, en inglés, con `site.css`.
- Rollos, pergamino, bordes, cursor de varita y fuente de píxel son los de la sala: la página carga `demo/ui.gen.css`, así que un cambio del arte llega a la web sin tocarla.
- `node tools/site.mjs build [DIR]` monta la web:
  - copia `site/`, toda la carpeta `apps/room/src` en `demo/` y el logo del arte;
  - rellena los marcadores con las palabras de la torre (`apps/room/src/words.js`): términos del glosario, los gremios con sus emblemas, el aviso de no afiliación y la versión;
  - falla si queda un marcador o si un término no existe.
- `node tools/site.mjs serve` la construye en una carpeta temporal y la sirve en 127.0.0.1, como la serviría Pages.
- Las imágenes de `site/img/` y `docs/img/` salen de la demo con `node tools/capture.mjs` y `python3 tools/capture.py`. El favicon y el icono de la extensión salen del cursor de varita del arte.
- No hay cookies, ni analítica, ni fuentes o scripts de terceros. La prueba de humo (apartado F) comprueba que ninguna petición sale de la máquina.

## Publicar

1. En el repositorio: Settings → Pages → Build and deployment → Source: «GitHub Actions». Si ya estaba así para la demo, no cambia nada.
2. Cada push a `main` que toque la web, la sala, el arte de la interfaz o `package.json` la vuelve a publicar. También se puede lanzar a mano: Actions → pages → Run workflow.
3. Mientras no haya dominio, la web vive en https://poligle.github.io/codewizards/ y la demo, en `/demo/`. La página 404 enlaza a la raíz del dominio, así que solo funciona del todo con el dominio propio.

## El dominio, paso a paso

Antes de nada, `codewizards.app` tiene que estar registrado a tu nombre. Desde el contenedor no pude comprobar si lo está.

1. **Verifica el dominio en GitHub antes de tocar el DNS**, para que nadie más pueda usarlo:
   - en tu perfil: Settings → Pages → «Add a domain» → `codewizards.app`;
   - GitHub te da un registro TXT (`_github-pages-challenge-poligle.codewizards.app`): añádelo en tu proveedor de DNS y pulsa «Verify».
2. **Añade el dominio al repositorio**: Settings → Pages → Custom domain → `codewizards.app` → Save. Con un workflow de Actions lo que cuenta es este ajuste; `site/CNAME` va en la web por si acaso y no molesta.
3. **Registros del dominio raíz** (`@`):
   - A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`;
   - AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` y `2606:50c0:8003::153`;
   - si tu proveedor tiene ALIAS o ANAME, basta con uno apuntando a `poligle.github.io`.
4. **`www`**: un CNAME de `www` a `poligle.github.io`.
   - GitHub redirige entre `www` y la raíz por su cuenta.
   - No uses comodines (`*.codewizards.app`).
5. **Comprueba** con `dig codewizards.app +noall +answer -t A` (y `-t AAAA`): deben salir las direcciones de arriba. El DNS puede tardar hasta 24 horas.
6. **HTTPS**: cuando GitHub emita el certificado, marca «Enforce HTTPS» en Settings → Pages.
   - Los navegadores exigen HTTPS en `.app`, así que hasta entonces la web no se verá con el dominio.
   - Es normal.
7. **Prueba** https://codewizards.app, https://codewizards.app/demo/ y https://www.codewizards.app.

Fuente: documentación de GitHub Pages en docs.github.com («Managing a custom domain for your GitHub Pages site» y «Verifying your custom domain for GitHub Pages»), consultada el 30/10/2026.
