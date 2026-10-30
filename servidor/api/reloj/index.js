/**
 * Módulo RELOJ — sesiones con pulso desde el reloj (archivo .tcx/.gpx) o un pulsómetro Bluetooth.
 * Tablas propias: sesiones_reloj (zonas, pulso y curva; la sesión en sí va a rutinas)
 */
module.exports = {
  router: require('./reloj.routes'),
};
