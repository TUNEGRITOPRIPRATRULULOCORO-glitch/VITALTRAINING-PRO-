/**
 * Módulo SERIES — registro serie a serie (peso y repeticiones), récords y sugerencia de carga.
 * Tablas propias: series
 */
module.exports = {
  router: require('./series.routes'),
  records: require('./series.service').records, // (userId) → mejor marca de cada ejercicio
};
