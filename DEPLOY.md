# Despliegue de SaltyLyrics

`spicy-renderer/dist/` va **commiteado ya compilado**, así que ningún host necesita compilar:
todos publican la **raíz del repo** como sitio estático. Todas las rutas son relativas
(sin `/` inicial), por lo que también funciona bajo `usuario.github.io/repo/`.

Antes de cada despliegue (si tocaste `spicy-renderer/src/`):

```bash
cd spicy-renderer
npm install      # solo la primera vez
npm test
npm run build    # genera dist/ y estampa ?v=<hash> en ../index.html
```
Commitea `spicy-renderer/dist/` **y** `index.html` (el `?v=` cambia). Sin ese commit, los navegadores
podrían seguir con el bundle viejo en caché.

## Render (Static Site)
- Build Command: *(vacío)*
- Publish Directory: `.`

## Vercel
- Framework Preset: **Other**
- Build Command: *(vacío)* · Output Directory: `.`
- No hace falta `vercel.json`.

## GitHub Pages
- Settings → Pages → Source: *Deploy from a branch* → rama principal, carpeta `/ (root)`.
- `.nojekyll` ya está en la raíz (evita que Jekyll ignore carpetas).
- El sitio vive en `https://usuario.github.io/nombre-del-repo/`; las rutas relativas lo soportan.
- No depende de cabeceras personalizadas (el `?v=` hace el cache-busting).

## Servidor propio
- nginx: `deploy/nginx.example.conf` (HTTPS, `Cache-Control: no-cache` para `index.html`, caché larga para `dist/`).
- Apache: `deploy/htaccess.example` → cópialo como `.htaccess` en la raíz.
- Los `.js`/`.css` del bundle usan caché larga porque van protegidos por `?v=`. Las fuentes `.woff2` tienen
  nombre estable (sin hash), por eso llevan una caché más corta (30 días) y no `immutable`.

## Clave de Spicy Lyrics por defecto en TU versión (sin publicarla en el repo)

La idea: el repositorio abierto sigue pidiendo que cada persona escriba su propia Client Key en
**Configuración**, pero el sitio que publicas tú ya trae la tuya. La clave **no se escribe en el código**:
se inyecta al desplegar, en un archivo `config.js` que solo existe en el sitio publicado.

**Cómo funciona**
- `config.js` (en la raíz) se carga antes que la app. En el repo va **vacío** (`spicyKey: ""`).
- `scripts/make-config.mjs` lo regenera durante el despliegue a partir de variables de entorno.
- En la app, la clave que la persona escriba en Configuración **siempre manda** sobre la del despliegue;
  si deja el campo vacío, vuelve a usarse la del despliegue. El campo nunca muestra la clave del despliegue
  y el archivo de "Acceso rápido" tampoco la incluye.

**Variables** (se leen al ejecutar `node scripts/make-config.mjs`)

| Variable | Obligatoria | Qué hace |
|---|---|---|
| `SPICY_CLIENT_KEY` | sí | Tu Client Key **pública** (`sl_pk_...`). Se rechaza la secreta (`sl_sk_...`). Sin ella el script no hace nada. |
| `ALLOWED_HOSTS` | recomendada | Dominios donde se usa la clave, separados por comas. Admite `*.midominio.com`. Fuera de ellos la app se comporta como el repo abierto. |
| `HIDE_SPICY_KEY_FIELD` | no | `true` oculta el campo de la clave en Configuración (solo cuando hay clave por defecto y el dominio está permitido). |

**Dónde ponerlo**
- **Vercel / Render / Netlify**: define las variables en el panel del proyecto y usa como *Build Command*
  `node scripts/make-config.mjs` (Publish/Output Directory: `.`).
- **GitHub Pages**: usa el workflow de ejemplo `deploy/github-pages.example.yml` (la clave va en un *secret*, nunca en el repo).
- **Servidor propio**: crea `config.js` en el servidor (o ejecuta el script allí con las variables). Que no pase por git.

**Ojo con esto**
- Es una clave **pública**: cualquiera que abra tu sitio puede verla en el navegador (pestaña Red / `config.js`).
  Es normal en una app 100 % estática. Lo que la protege es que **Spicy la limite a tus dominios** (como te dijeron)
  y la lista `ALLOWED_HOSTS`, que evita que la app la use en otros sitios.
- **Nunca** pongas la clave secreta (`sl_sk_...`) en el navegador.
- No ejecutes el script en tu computadora con la clave real y luego hagas commit de `config.js`. Si lo haces para
  probar, protégelo antes: `git update-index --assume-unchanged config.js`.
- `config.js` conviene servirlo sin caché larga (igual que `index.html`), para que un cambio de clave se note al instante.

## Checklist por dominio (recordatorio — no se ejecuta solo)

- [ ] **Redirect URI de Spotify (PKCE)**: registrar la URI exacta de cada dominio en el Dashboard de Spotify.
      Según la documentación vigente de Spotify (<https://developer.spotify.com/documentation/web-api/concepts/redirect_uri>):
      HTTPS obligatorio, salvo IP loopback literal (`http://127.0.0.1:PUERTO` o `http://[::1]:PUERTO`);
      **`localhost` no está permitido**. La app usa `origin + pathname` como Redirect URI, así que bajo GitHub Pages
      la URI incluye `/nombre-del-repo/`. En desarrollo con Five Server, abre `http://127.0.0.1:PUERTO/`.
- [ ] `localStorage` es **por origen**: en cada dominio nuevo hay que volver a escribir Client ID y Client Key
      en Configuración (la Client Key de Spicy no hace falta en tu versión publicada si usas `config.js`, ver arriba) (y el renderizador elegido se vuelve a `spicy` por defecto).
- [ ] Confirmar con Spicy Lyrics que tu permiso/Client Key funciona desde **cada dominio** y desde Five Server en desarrollo.
- [ ] **Créditos y aviso AGPL visibles en todos los despliegues**: no quites el crédito a Spicy Lyrics que ya tienes.

## Licencia (AGPL-3.0)

El renderizador deriva del **AMLL TTML Tool (AGPL-3.0)** y del renderizador de Spicy Lyrics (AGPL-3.0-or-later).
El código derivado debe publicarse bajo AGPL salvo que tu permiso con Spicy Lyrics indique otra cosa. En una app
servida por red, la AGPL (§13) además exige ofrecer el código fuente a quien la use: añade un enlace visible al repo
(pendiente: no lo añadí porque no conozco la URL). Conserva las cabeceras de origen y `spicy-renderer/LICENSE`.

Las fuentes `spicy-renderer/public/assets/*.woff2` tienen su propia procedencia: **confirma que puedes redistribuirlas**.
Si no, vacía `spicy-renderer/src/fonts.css`, borra los `.woff2` y reconstruye; el CSS cae a la fuente del sistema.

## Opcional (no creado, solo si lo apruebas)
Un workflow de GitHub Actions que ejecute `npm ci && npm run build` y falle si `dist/` o `index.html` quedaron
desactualizados respecto a `src/`.
