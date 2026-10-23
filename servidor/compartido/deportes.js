/**
 * Deportes que admite la app. "Gimnasio" y "Estar en forma" son para quien entrena por afición
 * (verse y sentirse bien) sin competir.
 * Cada deporte tiene sus rutinas (perfilMedico/rutinas.js) y sus tests físicos
 * (evaluaciones/evaluaciones.catalogo.js); los tests comprueban que coincidan con esta lista.
 */
const DEPORTES = [
  'Fútbol', 'Baloncesto', 'Tenis', 'Béisbol', 'Atletismo', 'Running', 'Natación', 'Boxeo', 'Gimnasio', 'Estar en forma',
];

/** Deportes sin partidos ni competiciones fijas: no se les pide día de partido. */
const SIN_COMPETICION = ['Gimnasio', 'Estar en forma'];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

module.exports = { DEPORTES, SIN_COMPETICION, DIAS_SEMANA };
