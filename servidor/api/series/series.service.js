const { query } = require('../../../base-de-datos/db');
const { hoyISO, aFechaISO } = require('../../compartido/fechas');
const calc = require('./series.calculos');

const MAX_PESO = 600;
const MAX_REPS = 100;
const SESIONES_HISTORIAL = 8;

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

function aSerie(r) {
  return {
    id: Number(r.id),
    ejercicio: r.ejercicio,
    fecha: aFechaISO(r.fecha),
    peso: r.peso == null ? null : Number(r.peso),
    repeticiones: Number(r.repeticiones),
    verificado: r.verificado === true,
    verificadoPor: r.verificado_por || null,
  };
}

function nombreValido(nombre) {
  const limpio = String(nombre || '').trim().slice(0, 120);
  if (limpio.length < 2) throw error('Falta el ejercicio.', 400);
  return limpio;
}

async function seriesDe(userId, ejercicio) {
  const { rows } = await query(
    'SELECT * FROM series WHERE user_id = $1 AND ejercicio = $2 ORDER BY fecha, id',
    [Number(userId), ejercicio]
  );
  return rows.map(aSerie);
}

/** Lesión o cuerpo cansado: la sugerencia no sube peso. */
async function precaucionDe(userId) {
  const r = await require('../rendimiento').obtenerResumen(Number(userId)).catch(() => null);
  if (r?.estadoMedico && r.estadoMedico.estado !== 'apto') return 'lesion';
  if (r?.listo?.nivel === 'bajo') return 'descanso';
  return null;
}

/** Apunta una serie. Devuelve la serie y si es un récord nuevo en ese ejercicio. */
async function registrar(userId, datos) {
  const ejercicio = nombreValido(datos?.ejercicio);
  const repeticiones = Number(datos?.repeticiones);
  if (!Number.isInteger(repeticiones) || repeticiones < 1 || repeticiones > MAX_REPS)
    throw error(`Las repeticiones van de 1 a ${MAX_REPS}.`, 400);
  const sinPeso = datos?.peso === null || datos?.peso === undefined || datos?.peso === '' || Number(datos.peso) === 0;
  const peso = sinPeso ? null : Number(datos.peso);
  if (!sinPeso && (!Number.isFinite(peso) || peso < 0 || peso > MAX_PESO)) throw error(`El peso va de 0 a ${MAX_PESO} kg.`, 400);
  const fecha = datos?.fecha ? String(datos.fecha).slice(0, 10) : hoyISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) throw error('Fecha no válida.', 400);
  if (fecha > hoyISO()) throw error('La fecha no puede ser futura.', 400);

  const anteriores = await seriesDe(userId, ejercicio);
  const { rows } = await query(
    'INSERT INTO series (user_id, ejercicio, fecha, peso, repeticiones) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [Number(userId), ejercicio, fecha, peso, repeticiones]
  );
  const serie = aSerie(rows[0]);
  return { serie, record: calc.esRecord(serie, anteriores), e1rm: calc.e1rm(serie.peso, serie.repeticiones) };
}

/** Un entrenador (o médico/admin) confirma que vio la serie: cuenta como marca verificada. */
async function verificar(userId, id, autor) {
  if (Number(autor?.id) === Number(userId)) throw error('No puedes verificar tus propias series: lo hace tu entrenador.', 403);
  const { rows } = await query(
    'UPDATE series SET verificado = true, verificado_por = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [autor?.nombre || 'Entrenador', Number(id), Number(userId)]
  );
  if (!rows[0]) throw error('Serie no encontrada.', 404);
  return aSerie(rows[0]);
}

async function eliminar(userId, id) {
  const { rows } = await query('DELETE FROM series WHERE id = $1 AND user_id = $2 RETURNING id', [Number(id), Number(userId)]);
  return rows.length > 0;
}

/**
 * Todo lo que hace falta para apuntar un ejercicio hoy: las series de hoy, la sesión anterior,
 * el récord, la sugerencia y las últimas sesiones.
 */
async function ejercicio(userId, nombre, objetivoReps = null) {
  const ejercicioNombre = nombreValido(nombre);
  const objetivo = Number.isInteger(Number(objetivoReps)) && Number(objetivoReps) > 0 ? Number(objetivoReps) : null;
  const hoy = hoyISO();
  const [todas, precaucion] = await Promise.all([seriesDe(userId, ejercicioNombre), precaucionDe(userId)]);
  const sesiones = calc.porSesion(todas);
  const deHoy = sesiones.find(s => s.fecha === hoy) || null;
  const anterior = sesiones.find(s => s.fecha < hoy) || null;
  const record = calc.mejorMarca(todas);
  return {
    ejercicio: ejercicioNombre,
    objetivo,
    hoy: deHoy?.series || [],
    anterior,
    record,
    sugerencia: calc.sugerir(anterior, objetivo, precaucion),
    historial: sesiones.filter(s => s.fecha < hoy).slice(0, SESIONES_HISTORIAL).map(s => ({
      fecha: s.fecha, volumen: s.volumen, mejor: calc.mejorMarca(s.series.map(x => ({ ...x, fecha: s.fecha }))),
    })),
  };
}

/** Cuántas series lleva hoy en cada ejercicio (para las etiquetas de la rutina). */
async function resumenHoy(userId) {
  const { rows } = await query('SELECT ejercicio FROM series WHERE user_id = $1 AND fecha = $2', [Number(userId), hoyISO()]);
  const cuenta = {};
  for (const r of rows) cuenta[r.ejercicio] = (cuenta[r.ejercicio] || 0) + 1;
  return cuenta;
}

/** Mejor marca de cada ejercicio, del entrenado más recientemente al más antiguo. */
async function records(userId) {
  const { rows } = await query('SELECT * FROM series WHERE user_id = $1 ORDER BY fecha, id', [Number(userId)]);
  const porEjercicio = {};
  for (const s of rows.map(aSerie)) (porEjercicio[s.ejercicio] ||= []).push(s);
  return Object.entries(porEjercicio)
    .map(([nombre, lista]) => ({
      ejercicio: nombre,
      record: calc.mejorMarca(lista),
      ultimaVez: lista.at(-1).fecha,
      sesiones: new Set(lista.map(s => s.fecha)).size,
    }))
    .sort((a, b) => (a.ultimaVez < b.ultimaVez ? 1 : -1));
}

module.exports = { registrar, eliminar, verificar, ejercicio, resumenHoy, records };
