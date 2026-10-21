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

## Checklist por dominio (recordatorio — no se ejecuta solo)

- [ ] **Redirect URI de Spotify (PKCE)**: registrar la URI exacta de cada dominio en el Dashboard de Spotify.
      Según la documentación vigente de Spotify (<https://developer.spotify.com/documentation/web-api/concepts/redirect_uri>):
      HTTPS obligatorio, salvo IP loopback literal (`http://127.0.0.1:PUERTO` o `http://[::1]:PUERTO`);
      **`localhost` no está permitido**. La app usa `origin + pathname` como Redirect URI, así que bajo GitHub Pages
      la URI incluye `/nombre-del-repo/`. En desarrollo con Five Server, abre `http://127.0.0.1:PUERTO/`.
- [ ] `localStorage` es **por origen**: en cada dominio nuevo hay que volver a escribir Client ID y Client Key
      en Configuración (y el renderizador elegido se vuelve a `spicy` por defecto).
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
