/*
 * Configuración de Five Server (opcional). Lo único que hace es no vigilar
 * node_modules, que tiene miles de archivos. El resto es la configuración
 * estándar: raíz = esta carpeta, recarga al cambiar cualquier archivo servido
 * (incluido spicy-renderer/dist/, que reescribe `npm run dev`).
 */
module.exports = {
	ignore: [/node_modules/],
};
