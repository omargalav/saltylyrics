/// <reference types="vitest/config" />
import { defineConfig } from "vite";

/*
 * Build del renderizador Spicy para SaltyLyrics.
 *
 * - Library mode, formato IIFE, global `window.SpicyRenderer` (funciona con un
 *   <script src> clásico, también desde file://).
 * - Salidas con nombres estables y sin hash en `dist/`:
 *     dist/spicy-renderer.js
 *     dist/spicy-renderer.css
 *     dist/assets/<fuente>.woff2
 * - `base: './'` → las rutas dentro del CSS son relativas al propio CSS.
 * - `npm run dev` = `vite build --watch --mode development` (con sourcemaps).
 */
export default defineConfig(({ mode }) => {
	const dev = mode === "development";
	return {
		base: "./",
		publicDir: "public",
		build: {
			outDir: "dist",
			emptyOutDir: true,
			sourcemap: dev,
			minify: dev ? false : "esbuild",
			target: "es2020",
			cssCodeSplit: false,
			// Las fuentes viven en public/assets/ y se copian tal cual a dist/assets/
			// (en library mode Vite incrustaría en base64 cualquier archivo que
			// importe el CSS). fonts.css las referencia como url("/assets/…") y
			// con base "./" Vite las reescribe relativas al propio CSS.
			assetsInlineLimit: 0,
			lib: {
				entry: "src/index.ts",
				name: "SpicyRenderer",
				formats: ["iife"],
				fileName: () => "spicy-renderer.js",
				cssFileName: "spicy-renderer",
			},
			rollupOptions: {
				output: {
					assetFileNames: (asset) =>
						asset.names.some((name) => name.endsWith(".css"))
							? "[name][extname]"
							: "assets/[name][extname]",
				},
			},
		},
		test: {
			environment: "node",
			include: ["src/**/*.test.ts"],
		},
	};
});
