/**
 * Módulo EVALUACIONES — tests físicos periódicos (salto, sprint, agilidad, resistencia).
 * Tablas propias: evaluaciones
 */
module.exports = {
  router: require('./evaluaciones.routes'),
  mejoresMarcas: require('./evaluaciones.service').mejoresMarcas, // (userId) → mejor marca de cada prueba
  pruebasDe:     require('./evaluaciones.catalogo').pruebasDe,      // (deporte) → pruebas de su batería
};
