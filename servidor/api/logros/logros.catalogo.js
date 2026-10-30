/**
 * Logros (funciones puras): insignias que se ganan con lo que el atleta ya hace en la app.
 * Cada logro mira un dato (días de racha, sesiones, comidas, récords…) y una meta.
 * Nivel: bronce → plata → oro → diamante (sirve para el color de la insignia).
 */

const LOGROS = [
  // Primeros pasos
  { clave: 'perfil',          grupo: 'Primeros pasos', icono: '📋', nivel: 'bronce',   nombre: 'Todo listo',        desc: 'Completa tu perfil médico y recibe tu plan.',               dato: 'perfil',        meta: 1 },
  { clave: 'salud_1',         grupo: 'Primeros pasos', icono: '🌅', nivel: 'bronce',   nombre: 'Me escucho',        desc: 'Registra cómo amaneciste por primera vez.',                 dato: 'diasSalud',     meta: 1 },
  { clave: 'sesiones_1',      grupo: 'Primeros pasos', icono: '👟', nivel: 'bronce',   nombre: 'Primera sesión',    desc: 'Completa tu primera sesión del plan.',                      dato: 'sesiones',      meta: 1 },
  { clave: 'series_1',        grupo: 'Primeros pasos', icono: '📝', nivel: 'bronce',   nombre: 'Primera serie',     desc: 'Apunta tu primera serie en la rutina.',                     dato: 'series',        meta: 1 },
  { clave: 'tests_1',         grupo: 'Primeros pasos', icono: '⏱', nivel: 'bronce',   nombre: 'Punto de partida',  desc: 'Haz tu primer test físico.',                                dato: 'tests',         meta: 1 },
  // Constancia
  { clave: 'racha_3',         grupo: 'Constancia',     icono: '🔥', nivel: 'bronce',   nombre: 'Encendido',         desc: '3 días seguidos registrando cómo amaneces.',                dato: 'rachaMax',      meta: 3 },
  { clave: 'racha_7',         grupo: 'Constancia',     icono: '🔥', nivel: 'plata',    nombre: 'Semana en llamas',  desc: '7 días seguidos registrando cómo amaneces.',                dato: 'rachaMax',      meta: 7 },
  { clave: 'racha_14',        grupo: 'Constancia',     icono: '🔥', nivel: 'oro',      nombre: 'Imparable',         desc: '14 días seguidos registrando cómo amaneces.',               dato: 'rachaMax',      meta: 14 },
  { clave: 'racha_30',        grupo: 'Constancia',     icono: '🔥', nivel: 'diamante', nombre: 'Hábito de hierro',  desc: '30 días seguidos registrando cómo amaneces.',               dato: 'rachaMax',      meta: 30 },
  { clave: 'semana_completa', grupo: 'Constancia',     icono: '📅', nivel: 'oro',      nombre: 'Semana completa',   desc: 'Cumple todas las sesiones de una semana de tu plan.',       dato: 'semanasCompletas', meta: 1 },
  { clave: 'comidas_10',      grupo: 'Constancia',     icono: '🍽', nivel: 'bronce',   nombre: 'Buen provecho',     desc: 'Apunta 10 comidas.',                                         dato: 'comidas',       meta: 10 },
  { clave: 'comidas_50',      grupo: 'Constancia',     icono: '🥗', nivel: 'plata',    nombre: 'Come con plan',     desc: 'Apunta 50 comidas.',                                         dato: 'comidas',       meta: 50 },
  { clave: 'comidas_150',     grupo: 'Constancia',     icono: '🥑', nivel: 'oro',      nombre: 'Nutrición de élite', desc: 'Apunta 150 comidas.',                                       dato: 'comidas',       meta: 150 },
  // Entrenamiento
  { clave: 'sesiones_10',     grupo: 'Entrenamiento',  icono: '💪', nivel: 'bronce',   nombre: 'En marcha',         desc: 'Completa 10 sesiones.',                                      dato: 'sesiones',      meta: 10 },
  { clave: 'sesiones_25',     grupo: 'Entrenamiento',  icono: '💪', nivel: 'plata',    nombre: 'Disciplina',        desc: 'Completa 25 sesiones.',                                      dato: 'sesiones',      meta: 25 },
  { clave: 'sesiones_50',     grupo: 'Entrenamiento',  icono: '💪', nivel: 'oro',      nombre: 'Medio centenar',    desc: 'Completa 50 sesiones.',                                      dato: 'sesiones',      meta: 50 },
  { clave: 'sesiones_100',    grupo: 'Entrenamiento',  icono: '🏆', nivel: 'diamante', nombre: 'Centenario',        desc: 'Completa 100 sesiones.',                                     dato: 'sesiones',      meta: 100 },
  { clave: 'series_100',      grupo: 'Entrenamiento',  icono: '🏋', nivel: 'plata',    nombre: 'Cien series',       desc: 'Apunta 100 series.',                                         dato: 'series',        meta: 100 },
  { clave: 'series_500',      grupo: 'Entrenamiento',  icono: '🏋', nivel: 'oro',      nombre: 'Máquina',           desc: 'Apunta 500 series.',                                         dato: 'series',        meta: 500 },
  // Progreso
  { clave: 'records_3',       grupo: 'Progreso',       icono: '🎯', nivel: 'plata',    nombre: 'Cazador de récords', desc: 'Ten récord en 3 ejercicios distintos.',                     dato: 'ejerciciosConRecord', meta: 3 },
  { clave: 'records_10',      grupo: 'Progreso',       icono: '🎯', nivel: 'oro',      nombre: 'Coleccionista',     desc: 'Ten récord en 10 ejercicios distintos.',                    dato: 'ejerciciosConRecord', meta: 10 },
  { clave: 'tests_3meses',    grupo: 'Progreso',       icono: '📈', nivel: 'plata',    nombre: 'Me mido',           desc: 'Haz tests físicos en 3 meses distintos.',                    dato: 'mesesConTest',  meta: 3 },
  { clave: 'verificada',      grupo: 'Progreso',       icono: '✅', nivel: 'plata',    nombre: 'Marca oficial',     desc: 'Consigue una marca verificada por tu entrenador.',           dato: 'verificadas',   meta: 1 },
  { clave: 'rango_oro',       grupo: 'Progreso',       icono: '🥇', nivel: 'bronce',   nombre: 'De oro',            desc: 'Llega a Oro en cualquier marca.',                            dato: 'mejorRango',    meta: 6 },
  { clave: 'rango_platino',   grupo: 'Progreso',       icono: '💠', nivel: 'plata',    nombre: 'Platino',           desc: 'Llega a Platino en cualquier marca.',                        dato: 'mejorRango',    meta: 9 },
  { clave: 'rango_diamante',  grupo: 'Progreso',       icono: '💎', nivel: 'oro',      nombre: 'Diamante',          desc: 'Llega a Diamante en cualquier marca.',                       dato: 'mejorRango',    meta: 18 },
  { clave: 'rango_radiante',  grupo: 'Progreso',       icono: '🌟', nivel: 'diamante', nombre: 'Radiante',          desc: 'Llega a Radiante en cualquier marca.',                       dato: 'mejorRango',    meta: 21 },
  // Resiliencia
  { clave: 'regreso',         grupo: 'Resiliencia',    icono: '🩹', nivel: 'oro',      nombre: 'De vuelta',         desc: 'Recupérate de una lesión y recibe el alta médica.',          dato: 'altas',         meta: 1 },
];

/** Racha más larga de días seguidos en una lista de fechas 'YYYY-MM-DD'. */
function rachaMaxima(fechas) {
  const dias = [...new Set(fechas)].sort((a, b) => a.localeCompare(b));
  let max = 0, actual = 0, anterior = null;
  for (const f of dias) {
    const seguido = anterior && (new Date(`${f}T00:00:00Z`) - new Date(`${anterior}T00:00:00Z`)) === 86400000;
    actual = seguido ? actual + 1 : 1;
    max = Math.max(max, actual);
    anterior = f;
  }
  return max;
}

/**
 * Semanas (lunes a domingo, ya terminadas) en las que se cumplieron todas las sesiones del plan.
 * dias: el calendario de cumplimiento del módulo rendimiento ([{ fecha, estado, hoy }], de lunes a domingo).
 */
function semanasCompletas(dias, hoy) {
  let n = 0;
  for (let i = 0; i + 7 <= dias.length; i += 7) {
    const semana = dias.slice(i, i + 7);
    if (semana.at(-1).fecha >= hoy) continue; // la semana aún no terminó
    const tocaban = semana.filter(d => !['descanso', 'sin-plan', 'lesion'].includes(d.estado));
    if (tocaban.length && tocaban.every(d => d.estado === 'completo')) n++;
  }
  return n;
}

/** Estado de cada logro con los datos del atleta: progreso y si está conseguido. */
function evaluar(datos) {
  return LOGROS.map(l => {
    const actual = Number(datos[l.dato]) || 0;
    return { ...l, progreso: { actual: Math.min(actual, l.meta), meta: l.meta }, conseguido: actual >= l.meta };
  });
}

module.exports = { LOGROS, rachaMaxima, semanasCompletas, evaluar };
