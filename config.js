/* Configuración OPCIONAL de cada despliegue. Se carga antes que la app.
 *
 * En el repositorio abierto este archivo va VACÍO: cada persona escribe su propia Client Key de
 * Spicy Lyrics en Configuración. La versión que publica el autor genera este archivo al desplegar
 * (ver DEPLOY.md → "Clave de Spicy Lyrics por defecto") y NO se sube al repositorio.
 *
 *   spicyKey          Client Key PÚBLICA (empieza con sl_pk_). Nunca pongas la secreta (sl_sk_).
 *   allowedHosts      Dominios donde se usa la clave por defecto. Vacío = sin restricción.
 *                     Admite comodín al inicio: "*.midominio.com".
 *   hideSpicyKeyField true = oculta el campo de la clave en Configuración (solo si hay clave por defecto).
 */
window.SALTY_CONFIG = {
  spicyKey: "",
  allowedHosts: [],
  hideSpicyKeyField: false
};
