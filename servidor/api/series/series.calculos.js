/**
 * Registro serie a serie: récords y sugerencia para la próxima sesión (funciones puras).
 *
 * - 1RM estimado con la fórmula de Epley: peso × (1 + reps / 30). Es fiable hasta unas
 *   10-12 repeticiones; con más, el récord se cuenta por repeticiones al mismo peso.
 * - Sugerencia por "doble progresión": si en la sesión anterior completaste las repeticiones
 *   objetivo en todas las series, toca subir un poco el peso; si no, mismo peso y buscar
 *   una repetición más. Nunca se sugiere subir estando lesionado o con el cuerpo pidiendo descanso.
 */

const MAX_REPS_1RM = 12;

const redondear = (v, paso = 0.5) => Math.round(v / paso) * paso;

function e1rm(peso, reps) {
  if (!(peso > 0) || !(reps > 0)) return null;
  return redondear(peso * (1 + Math.min(reps, MAX_REPS_1RM) / 30), 0.5);
}

/** Cuánto subir: 2,5 kg en pesos normales; 1 kg con pesos pequeños (mancuernas ligeras). */
function incremento(peso) {
  return peso < 20 ? 1 : 2.5;
}

/** Agrupa las series por fecha, de la más reciente a la más antigua. */
function porSesion(series) {
  const sesiones = new Map();
  for (const s of [...series].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id - b.id))) {
    if (!sesiones.has(s.fecha)) sesiones.set(s.fecha, []);
    sesiones.get(s.fecha).push(s);
  }
  return [...sesiones].map(([fecha, lista]) => ({
    fecha,
    series: lista.map(s => ({ id: s.id, peso: s.peso, repeticiones: s.repeticiones, verificado: !!s.verificado })),
    volumen: Math.round(lista.reduce((t, s) => t + (s.peso || 0) * s.repeticiones, 0)),
  }));
}

/**
 * Mejor marca: con peso, la del 1RM estimado más alto (y en empate, la más antigua: el récord
 * es de quien lo hizo primero); sin peso (peso corporal), la de más repeticiones.
 */
function mejorMarca(series) {
  let mejor = null;
  for (const s of series) {
    const valor = s.peso > 0 ? e1rm(s.peso, s.repeticiones) : null;
    const candidato = { peso: s.peso || null, repeticiones: s.repeticiones, e1rm: valor, fecha: s.fecha, id: s.id, verificado: !!s.verificado };
    if (!mejor) { mejor = candidato; continue; }
    const supera = valor != null || mejor.e1rm != null
      ? (valor ?? 0) > (mejor.e1rm ?? 0)
      : s.repeticiones > mejor.repeticiones;
    if (supera) mejor = candidato;
  }
  return mejor;
}

/** ¿La serie nueva bate el récord de las anteriores? */
function esRecord(nueva, anteriores) {
  if (!anteriores.length) return false; // la primera marca no es un "récord batido"
  const previo = mejorMarca(anteriores);
  const valor = nueva.peso > 0 ? e1rm(nueva.peso, nueva.repeticiones) : null;
  if (valor != null || previo.e1rm != null) return (valor ?? 0) > (previo.e1rm ?? 0);
  return nueva.repeticiones > previo.repeticiones;
}

/**
 * Sugerencia para hoy a partir de la última sesión.
 * @param ultima      { series: [{ peso, repeticiones }] } o null
 * @param objetivo    repeticiones objetivo de la rutina (null si no hay)
 * @param precaucion  'lesion' | 'descanso' | null
 */
function sugerir(ultima, objetivo, precaucion = null) {
  const objetivoTxt = objetivo ? `${objetivo} repeticiones` : 'las repeticiones de tu rutina';
  if (!ultima?.series.length) {
    return { peso: null, repeticiones: objetivo, texto: `Primera vez: elige un peso con el que hagas ${objetivoTxt} y te sobren 2 o 3.` };
  }
  const pesos = ultima.series.map(s => s.peso || 0);
  const peso = Math.max(...pesos);
  const conPeso = peso > 0;
  const deEsePeso = ultima.series.filter(s => (s.peso || 0) === peso);
  const minReps = Math.min(...deEsePeso.map(s => s.repeticiones));
  const maxReps = Math.max(...deEsePeso.map(s => s.repeticiones));

  if (precaucion) {
    const motivo = precaucion === 'lesion' ? 'Estás en recuperación de una lesión' : 'Hoy tu cuerpo pide descanso';
    return { peso: conPeso ? peso : null, repeticiones: minReps, texto: `${motivo}: no subas. Repite ${conPeso ? `${formatoKg(peso)} × ` : ''}${minReps} o baja si molesta.` };
  }
  if (!conPeso) {
    return { peso: null, repeticiones: maxReps + 1, texto: `La vez pasada llegaste a ${maxReps}. Hoy intenta ${maxReps + 1} repeticiones.` };
  }
  if (objetivo && minReps >= objetivo) {
    const nuevo = redondear(peso + incremento(peso), 0.5);
    return { peso: nuevo, repeticiones: objetivo, texto: `Completaste ${objetivo} repeticiones en todas las series con ${formatoKg(peso)}: hoy prueba ${formatoKg(nuevo)}.` };
  }
  const meta = objetivo ? Math.min(objetivo, minReps + 1) : minReps + 1;
  return { peso, repeticiones: meta, texto: `Mantén ${formatoKg(peso)} y busca ${meta} repeticiones en cada serie${objetivo ? `; al llegar a ${objetivo} en todas, sube el peso` : ''}.` };
}

function formatoKg(kg) {
  return `${String(kg).replace('.', ',')} kg`;
}

module.exports = { e1rm, porSesion, mejorMarca, esRecord, sugerir, formatoKg, MAX_REPS_1RM };
