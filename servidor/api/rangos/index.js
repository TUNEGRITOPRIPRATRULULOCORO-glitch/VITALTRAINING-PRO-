/**
 * Módulo RANGOS — rangos de Bronce a Radiante en ejercicios de fuerza (módulo series) y tests
 * físicos (módulo evaluaciones), ajustados por peso corporal y sexo.
 * Tablas propias: rangos (el más alto alcanzado en cada marca: nunca se baja de rango)
 */
const cat = require('./rangos.catalogo');

/** Puntuación 0-21 (con decimales) de una marca de test, ajustada por sexo. null si la prueba no tiene referencias. */
function puntuarTest(pruebaId, valor, sexo) {
  const def = cat.TESTS[pruebaId];
  return def ? cat.pasoExacto(Number(valor), cat.referenciasPara(def, sexo)) : null;
}

/** Puntuación 0-21 de un levantamiento: máximo estimado ÷ peso corporal, ajustada por sexo. */
function puntuarFuerza(defId, e1rm, pesoCorporal, sexo) {
  const def = cat.FUERZA.find(f => f.id === defId);
  if (!def || !(e1rm > 0) || !(pesoCorporal > 0)) return null;
  return cat.pasoExacto(e1rm / pesoCorporal, cat.referenciasPara(def, sexo));
}

module.exports = {
  router: require('./rangos.routes'),
  // Para la clasificación (módulo clasificacion): mismas escalas que los rangos
  puntuarTest,
  puntuarFuerza,
  ejercicioDeFuerza: cat.ejercicioDeFuerza,               // (nombre del ejercicio) → { id, nombre } o null
  levantamientos: () => cat.FUERZA.map(f => ({ id: f.id, nombre: f.nombre, mancuerna: !!f.mancuerna })),
  rangoDe: cat.rangoDe,
  PASO_MAX: cat.PASO_MAX,
};
