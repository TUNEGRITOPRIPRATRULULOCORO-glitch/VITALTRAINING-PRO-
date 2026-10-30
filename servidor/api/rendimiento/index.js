/**
 * Módulo RENDIMIENTO — listo para entrenar, carga de entrenamiento y cumplimiento del plan.
 * Tablas propias: ninguna (solo lectura de salud, rutinas, cumplimiento y perfiles_medicos;
 * el estado médico lo pide al módulo lesiones).
 */
module.exports = {
  router: require('./rendimiento.routes'),
  obtenerResumen: require('./rendimiento.service').obtenerResumen,
};
