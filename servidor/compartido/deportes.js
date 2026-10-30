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

/**
 * Cómo se llama la competición en cada deporte: no siempre es un "partido".
 * (La interfaz tiene la misma lista en comun.js.)
 */
const COMPETICION = {
  'Fútbol': 'partido', 'Baloncesto': 'partido', 'Béisbol': 'partido', 'Tenis': 'partido o torneo',
  'Atletismo': 'competencia', 'Running': 'carrera', 'Natación': 'competencia', 'Boxeo': 'sparring o pelea',
};

/** { nombre, dia, vispera, pregunta } para mostrar en la app según el deporte. */
function competicionDe(deporte = 'Fútbol') {
  const nombre = COMPETICION[deporte] || 'competencia';
  const mayus = nombre[0].toUpperCase() + nombre.slice(1);
  return { nombre, dia: `Día de ${nombre}`, vispera: `Víspera de ${nombre}`, corto: mayus, pregunta: `¿Qué día tienes ${nombre}?` };
}

/** Estilos de boxeo: cambian los ejercicios de técnica y acondicionamiento de la rutina. */
const ESTILOS_BOXEO = ['Fajador (presión)', 'Estilista (distancia)', 'Contragolpeador', 'Pegador', 'Mixto / todavía no lo sé'];

module.exports = { DEPORTES, SIN_COMPETICION, DIAS_SEMANA, COMPETICION, competicionDe, ESTILOS_BOXEO };
