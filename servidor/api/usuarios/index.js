/**
 * Módulo USUARIOS — gestión de cuentas (panel admin).
 * Tablas propias: usuarios
 */
const svc = require('./usuarios.service');

module.exports = {
  router: require('./usuarios.routes'),
  buscarIdPorEmail:  svc.buscarIdPorEmail,
  registrarAtleta:   svc.registrarAtleta,
  actualizarDeporte: svc.actualizarDeporte,
};
