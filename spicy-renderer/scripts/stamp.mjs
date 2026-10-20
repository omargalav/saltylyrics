/*
 * Cache-busting: actualiza `?v=<hash>` en las etiquetas <link>/<script> de
 * ../index.html que cargan el bundle. El hash sale del contenido de
 * dist/spicy-renderer.js + .css (mismo contenido → mismo hash → index.html
 * no cambia en el repositorio si nada cambió).
 *
 * Uso: node scripts/stamp.mjs [ruta/a/index.html]
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const indexPath = resolve(process.argv[2] ?? resolve(root, "..", "index.html"));

const files = ["spicy-renderer.js", "spicy-renderer.css"].map((name) => resolve(dist, name));
for (const file of files) {
	if (!existsSync(file)) {
		console.error(`stamp: falta ${file}. Ejecuta primero "vite build".`);
		process.exit(1);
	}
}
if (!existsSync(indexPath)) {
	console.error(`stamp: no encuentro ${indexPath}`);
	process.exit(1);
}

const hash = createHash("sha1");
for (const file of files) hash.update(readFileSync(file));
const version = hash.digest("hex").slice(0, 10);

const html = readFileSync(indexPath, "utf8");
const tag = /((?:href|src)=")(spicy-renderer\/dist\/spicy-renderer\.(?:js|css))(?:\?v=[^"]*)?"/g;
let count = 0;
const next = html.replace(tag, (_all, attr, path) => {
	count++;
	return `${attr}${path}?v=${version}"`;
});

if (count < 2) {
	console.error(`stamp: esperaba ≥ 2 etiquetas (<link> del css y <script> del js) en ${indexPath} y encontré ${count}.`);
	process.exit(1);
}
if (next !== html) writeFileSync(indexPath, next);
console.log(`stamp: ?v=${version} en ${count} etiquetas de ${indexPath}${next === html ? " (sin cambios)" : ""}`);
