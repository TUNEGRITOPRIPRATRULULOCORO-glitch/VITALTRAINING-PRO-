/**
 * Deportes que admite la app. "Estar en forma" es para quien no compite en ningún deporte.
 * Cada deporte tiene sus rutinas (perfilMedico/rutinas.js) y sus tests físicos
 * (evaluaciones/evaluaciones.catalogo.js); los tests comprueban que coincidan con esta lista.
 */
const DEPORTES = [
  'Fútbol', 'Baloncesto', 'Tenis', 'Béisbol', 'Atletismo', 'Running', 'Natación', 'Boxeo', 'Estar en forma',
];

/** Deportes sin partidos ni competiciones fijas: no se les pide día de partido. */
const SIN_COMPETICION = ['Estar en forma'];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

module.exports = { DEPORTES, SIN_COMPETICION, DIAS_SEMANA };
