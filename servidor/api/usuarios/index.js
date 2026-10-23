/**
 * Módulo USUARIOS — gestión de cuentas (panel admin).
 * Tablas propias: usuarios, fotos_perfil
 */
const svc = require('./usuarios.service');
const fotos = require('./fotos.routes');

module.exports = {
  router: require('./usuarios.routes'),
  cuentaRouter: fotos.cuenta,     // /api/cuenta  → cada usuario gestiona su foto
  fotosRouter:  fotos.ver,   // /api/fotos   → imagen de cualquier usuario (requiere sesión)
  buscarIdPorEmail:  svc.buscarIdPorEmail,
  registrarAtleta:   svc.registrarAtleta,
  actualizarDeporte: svc.actualizarDeporte,
  cambiarPassword:   svc.cambiarPassword,
  contacto:          svc.contacto,
  contactosPorRol:   svc.contactosPorRol,
};
