/**
 * Módulo RENDIMIENTO — listo para entrenar, carga de entrenamiento y cumplimiento del plan.
 * Tablas propias: ninguna (solo lectura de salud, rutinas, cumplimiento y perfiles_medicos).
 */
module.exports = {
  router: require('./rendimiento.routes'),
  obtenerResumen: require('./rendimiento.service').obtenerResumen,
};
