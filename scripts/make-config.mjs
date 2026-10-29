/*
 * Genera config.js con la Client Key de Spicy Lyrics de TU versión publicada, a partir de variables
 * de entorno. Así la clave no vive en el repositorio abierto: solo existe en el sitio desplegado.
 *
 *   SPICY_CLIENT_KEY      (obligatoria para que haga algo) clave pública, empieza con sl_pk_
 *   ALLOWED_HOSTS         (opcional) dominios separados por comas, ej: "salty.midominio.com,*.midominio.com"
 *   HIDE_SPICY_KEY_FIELD  (opcional) "true" para ocultar el campo en Configuración
 *
 * Uso (en el paso de build del hosting o de GitHub Actions):  node scripts/make-config.mjs
 * Sin SPICY_CLIENT_KEY no toca nada (config.js queda vacío, como en el repositorio abierto).
 *
 * ⚠ No lo ejecutes en tu computadora con la clave real y luego hagas commit de config.js.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const key = (process.env.SPICY_CLIENT_KEY ?? "").trim();
if (!key) {
  console.log("make-config: no hay SPICY_CLIENT_KEY; config.js queda sin cambios (sin clave por defecto).");
  process.exit(0);
}
if (key.startsWith("sl_sk_")) {
  console.error("make-config: esa es la clave SECRETA (sl_sk_). Usa la pública (sl_pk_); la secreta nunca va al navegador.");
  process.exit(1);
}
if (!/^sl_pk_[\w-]+$/.test(key)) {
  console.error("make-config: la clave debe empezar con sl_pk_ y no tener espacios ni símbolos raros.");
  process.exit(1);
}
const hosts = (process.env.ALLOWED_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const hide = String(process.env.HIDE_SPICY_KEY_FIELD ?? "").toLowerCase() === "true";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", "config.js");
const config = { spicyKey: key, allowedHosts: hosts, hideSpicyKeyField: hide };
writeFileSync(out, `/* Generado por scripts/make-config.mjs al desplegar. NO lo subas al repositorio. */\nwindow.SALTY_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
console.log(`make-config: config.js generado (clave incluida; dominios: ${hosts.length ? hosts.join(", ") : "sin restricción"}; campo ${hide ? "oculto" : "visible"}).`);
