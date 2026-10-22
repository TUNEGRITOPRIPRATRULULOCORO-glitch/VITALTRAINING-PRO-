/**
 * Módulo PANEL — panel del atleta: perfil, dashboard, historial.
 * Tablas propias: perfiles, comidas, rutinas, alertas, cumplimiento
 */
const historial = require('./historial.service');
const { fichaDeportiva } = require('./ficha');

module.exports = {
  router: require('./panel.routes'),
  crearAlerta:             historial.crearAlerta,
  registrarComidaAsignada: historial.registrarComidaAsignada,
  registrarRutinaAsignada: historial.registrarRutinaAsignada,
  fichaDeportiva,          // (usuario, perfil) → deporte, posición, peso, altura, edad...
};
