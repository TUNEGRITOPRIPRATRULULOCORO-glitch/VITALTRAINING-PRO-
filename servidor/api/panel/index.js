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
  revisarCargaAlta:        historial.revisarCargaAlta,
  actualizarPerfil:        require('./perfil.service').actualizarPerfil, // sexo y día de competición del registro   // tras una sesión: ¿la carga entró en riesgo alto?
  fichaDeportiva,          // (usuario, perfil) → deporte, posición, peso, altura, edad...
};
