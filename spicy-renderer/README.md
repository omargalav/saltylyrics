# spicy-renderer

Port a **TypeScript + DOM puro** del renderizador de Spicy Lyrics (en la versión del
[AMLL TTML Tool](https://github.com/Steve-xmh/amll-ttml-tool) de la comunidad de Spicy Lyrics) para **SaltyLyrics**.
Sin dependencias de runtime. Se compila a un único script clásico (`window.SpicyRenderer`).

## Comandos

Dentro de `spicy-renderer/`:

```bash
npm install        # dependencias de desarrollo: vite, typescript, vitest, jsdom
npm run dev        # vite build --watch (con sourcemaps): reescribe dist/ en cada guardado
npm run build      # tsc --noEmit + bundle de producción + cache-busting (?v=) en ../index.html
npm test           # vitest
npm run typecheck  # tsc --noEmit
```

`dist/` **se commitea compilado**: ningún host compila nada. Después de cambiar algo en `src/`,
ejecuta `npm run build` y commitea `dist/` y `index.html` (por el `?v=`).

> `.npmrc` fija `legacy-peer-deps=true`: sin él, `npm install` con npm 10.9 falló en este
> entorno con `Cannot read properties of null (reading 'edgesOut')` (peers opcionales de jsdom).

## Desarrollo local con Five Server (sin el dev server de Vite)

1. Terminal 1: `cd spicy-renderer && npm run dev`
2. Five Server abierto sobre `index.html` (raíz del proyecto).

Cada guardado en `src/` reescribe `dist/` y Five Server recarga. Se añadió `fiveserver.config.js`
en la raíz solo para ignorar `node_modules/`.

⚠️ Para iniciar sesión con Spotify en local, abre la app como **`http://127.0.0.1:PUERTO`**:
Spotify no admite `localhost` como Redirect URI (sí la IP loopback literal).

## API (`window.SpicyRenderer`)

```js
const r = SpicyRenderer.create(container, {
  getTimeMs: () => nowMs() + lyricsOffsetMs, // tiempo de la LETRA, en ms
  isPlaying: () => clock.playing,
  onSeek: ms => seekTo(ms - lyricsOffsetMs), // ms = tiempo de letra de la línea pulsada
  // Fase 2 (ya soportadas, sin UI): simple, forceLineSynced, romanized, showTranslation
});
r.render(body);   // body = data.Body de la API; devuelve nº de líneas de letra pintadas
r.sync();         // llamar cada frame desde TU loop (o sync(tMs))
r.destroy();
```

El renderizador **no crea ningún `requestAnimationFrame`**: el loop es el de la app.
Detecta seeks por sí mismo (salto hacia atrás > 120 ms o hacia delante > 1000 ms entre frames).

## Estructura

| Archivo | Origen en el TTML Tool (`src/components/SpicyLyrics/`) |
|---|---|
| `model.ts`, `math.ts`, `animation-curves.ts`, `active-line.ts` | mismos nombres (lógica sin cambios; `model.ts` solo cambia el import de tipos) |
| `createSpicyAnimator.ts`, `token-animation.ts` | mismos nombres (refs → `Map`s, sin FPS) |
| `preview-scroll.ts` | `src/modules/playback-clock/preview-scroll.ts` (sin `reveal`) |
| `dom.ts` | `SpicyLyricLines.tsx` (JSX → funciones DOM) |
| `SpicyRenderer.ts` | `useSpicyLyrics.ts` (hook → clase) |
| `style.css`, `fonts.css` | `index.module.css` (CSS plano bajo `.spicy-root`, sin fondo ni FPS) |
| `fromSpicyBody.ts`, `types.ts`, `index.ts` | nuevos |

## Fuentes

`public/assets/*.woff2` (fuente "SpicyLyrics") vienen del TTML Tool **sin licencia propia en el repo**:
confirma que puedes redistribuirlas. Si no, vacía `src/fonts.css`, borra `public/assets/*.woff2` y
`npm run build`: el CSS ya cae a `system-ui`.

## Licencia

Código derivado del AMLL TTML Tool (AGPL-3.0) y del renderizador de Spicy Lyrics
(AGPL-3.0-or-later): **AGPL-3.0-or-later**, ver `LICENSE`. Conserva las cabeceras de origen de cada archivo.
