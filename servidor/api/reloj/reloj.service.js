/**
 * Sesiones del reloj (archivo .tcx/.gpx exportado) o del pulsómetro Bluetooth en vivo.
 *
 * El navegador lee el archivo o el sensor y manda un resumen con la curva de pulso (un valor
 * cada pocos segundos). Aquí se calculan las zonas y el esfuerzo, y la sesión se guarda en el
 * registro de entrenamientos (rutinas) para que cuente en la carga, la clasificación y los logros.
 */
const { query } = require('../../../base-de-datos/db');
const calc = require('./reloj.calculos');
const { fichaDeportiva } = require('../panel');
const { aFechaISO } = require('../../compartido/fechas');

const TIPOS = ['Cardio', 'Fuerza', 'Técnica', 'Velocidad', 'Resistencia', 'Flexibilidad', 'Otro'];
const ORIGENES = { archivo: 'Reloj (archivo)', bluetooth: 'Pulsómetro Bluetooth' };
const DURACION_MAX_SEG = 12 * 3600;
const MUESTRAS_MAX = 15000;
const ANTIGUEDAD_MAX_DIAS = 366;

function error(mensaje, status = 400) {
  return Object.assign(new Error(mensaje), { status });
}

const enteroOpcional = (v, max) => {
  const n = Math.round(Number(v));
  return v === undefined || v === null || v === '' || !Number.isFinite(n) || n < 0 || n > max ? null : n;
};

function validar(d = {}) {
  const origen = String(d.origen || '');
  if (!ORIGENES[origen]) throw error('Origen de la sesión no válido.');
  const inicio = new Date(d.inicio);
  if (Number.isNaN(inicio.getTime())) throw error('El archivo no tiene la hora de inicio de la sesión.');
  const edadDias = (Date.now() - inicio.getTime()) / 86400000;
  if (edadDias < -1) throw error('La sesión tiene una fecha futura: revisa la hora del reloj.');
  if (edadDias > ANTIGUEDAD_MAX_DIAS) throw error('La sesión tiene más de un año: solo se importan sesiones recientes.');
  const duracionSeg = Number(d.duracionSeg);
  if (!(duracionSeg >= 60 && duracionSeg <= DURACION_MAX_SEG)) throw error('La sesión debe durar entre 1 minuto y 12 horas.');
  const intervaloSeg = Math.round(Number(d.intervaloSeg) || 5);
  if (intervaloSeg < 1 || intervaloSeg > 60) throw error('Intervalo de pulso no válido.');
  const pulsos = Array.isArray(d.pulsos) ? d.pulsos.map(b => Math.round(Number(b)) || 0) : [];
  if (pulsos.length > MUESTRAS_MAX) throw error('La sesión trae demasiados datos de pulso.');
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || '')) ? d.fecha : inicio.toISOString().slice(0, 10);
  return {
    origen, inicio: inicio.toISOString(), fecha, duracionSeg, intervaloSeg, pulsos,
    nombre: String(d.nombre || '').trim().slice(0, 80) || 'Sesión con reloj',
    tipo: TIPOS.includes(d.tipo) ? d.tipo : 'Cardio',
    distanciaM: enteroOpcional(d.distanciaM, 1000000),
    calorias: enteroOpcional(d.calorias, 20000),
  };
}

async function edadDe(userId) {
  const { rows } = await query(
    'SELECT u.fecha_nacimiento, p.edad FROM usuarios u LEFT JOIN perfiles p ON p.user_id = u.id WHERE u.id = $1', [userId]);
  return rows[0] ? fichaDeportiva(rows[0], rows[0]).edad : null;
}

function descripcionDe(s, r) {
  const partes = [];
  if (s.distanciaM) partes.push(`${(s.distanciaM / 1000).toFixed(1).replace('.', ',')} km`);
  if (r.fcMedia) partes.push(`FC media ${r.fcMedia} ppm (máx. ${r.fcMax})`);
  if (s.calorias) partes.push(`${s.calorias} kcal`);
  return partes.join(' · ');
}

/** Guarda la sesión y devuelve su resumen. 409 si esa sesión ya se había importado. */
async function registrar(userId, datos) {
  const id = Number(userId);
  const s = validar(datos);
  const { rows: ya } = await query('SELECT id FROM sesiones_reloj WHERE user_id = $1 AND inicio = $2', [id, s.inicio]);
  if (ya.length) throw error('Esta sesión ya estaba importada.', 409);

  const r = calc.resumir({ duracionSeg: s.duracionSeg, pulsos: s.pulsos, intervaloSeg: s.intervaloSeg, edad: await edadDe(id) });
  const { rows: [rutina] } = await query(
    `INSERT INTO rutinas (user_id, nombre, tipo, duracion_minutos, intensidad, descripcion, fecha, rpe, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [id, s.nombre, s.tipo, r.minutos, r.intensidad || 'Media', descripcionDe(s, r), s.fecha, r.rpe, ORIGENES[s.origen]]
  );
  const curva = calc.reducir(s.pulsos, s.intervaloSeg);
  const { rows: [sesion] } = await query(
    `INSERT INTO sesiones_reloj (user_id, rutina_id, inicio, origen, distancia_m, calorias, fc_media, fc_max, fc_max_usada, zonas, trimp, intervalo_seg, pulsos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [id, rutina.id, s.inicio, s.origen, s.distanciaM, s.calorias, r.fcMedia, r.fcMax, r.fcMaxUsada,
      r.zonas ? JSON.stringify(r.zonas) : null, r.trimp, curva.intervaloSeg, JSON.stringify(curva.pulsos)]
  );
  return {
    id: Number(sesion.id), rutinaId: Number(rutina.id), nombre: s.nombre, fecha: s.fecha,
    distanciaM: s.distanciaM, calorias: s.calorias, ...r,
    carga: r.rpe ? r.minutos * r.rpe : null,
  };
}

const COLUMNAS = `s.id, s.rutina_id, s.inicio, s.origen, s.distancia_m, s.calorias, s.fc_media, s.fc_max, s.fc_max_usada,
                  s.zonas, s.trimp, r.nombre, r.tipo, r.duracion_minutos, r.rpe, r.intensidad, r.fecha`;

const aJSON = v => (typeof v === 'string' ? JSON.parse(v) : v);

function aSesion(f, conCurva = false) {
  const minutos = Number(f.duracion_minutos);
  return {
    id: Number(f.id), rutinaId: Number(f.rutina_id), inicio: f.inicio, origen: f.origen,
    nombre: f.nombre, tipo: f.tipo, fecha: aFechaISO(f.fecha),
    minutos, rpe: f.rpe == null ? null : Number(f.rpe), intensidad: f.intensidad,
    carga: f.rpe == null ? null : minutos * Number(f.rpe),
    distanciaM: f.distancia_m, calorias: f.calorias, fcMedia: f.fc_media, fcMax: f.fc_max, fcMaxUsada: f.fc_max_usada,
    zonas: aJSON(f.zonas), trimp: f.trimp,
    ...(conCurva ? { intervaloSeg: f.intervalo_seg, pulsos: aJSON(f.pulsos) || [] } : {}),
  };
}

/** Últimas sesiones con datos del reloj (sin la curva). */
async function listar(userId, limite = 20) {
  const { rows } = await query(
    `SELECT ${COLUMNAS} FROM sesiones_reloj s JOIN rutinas r ON r.id = s.rutina_id
      WHERE s.user_id = $1 ORDER BY s.inicio DESC LIMIT $2`, [Number(userId), Math.min(100, Number(limite) || 20)]);
  return rows.map(f => aSesion(f));
}

/** Una sesión con su curva de pulso (para la gráfica). */
async function detalle(userId, sesionId) {
  const { rows } = await query(
    `SELECT ${COLUMNAS}, s.intervalo_seg, s.pulsos FROM sesiones_reloj s JOIN rutinas r ON r.id = s.rutina_id
      WHERE s.user_id = $1 AND s.id = $2`, [Number(userId), Number(sesionId)]);
  if (!rows[0]) throw error('Sesión no encontrada.', 404);
  return aSesion(rows[0], true);
}

/**
 * Sesión sin pulso (el archivo no lo traía): el atleta dice qué tan dura fue (1-10) y con eso
 * cuenta en la carga como cualquier sesión registrada a mano (minutos × esfuerzo).
 */
async function ponerEsfuerzo(userId, sesionId, rpe) {
  const esfuerzo = Number(rpe);
  if (!Number.isInteger(esfuerzo) || esfuerzo < 1 || esfuerzo > 10) throw error('El esfuerzo va de 1 a 10.');
  const s = await detalle(userId, sesionId);
  if (s.fcMedia) throw error('Esta sesión ya tiene su esfuerzo calculado con el pulso.', 409);
  await query('UPDATE rutinas SET rpe = $1, intensidad = $2 WHERE id = $3 AND user_id = $4',
    [esfuerzo, calc.intensidadDe(esfuerzo), s.rutinaId, Number(userId)]);
  return detalle(userId, sesionId);
}

module.exports = { registrar, listar, detalle, ponerEsfuerzo };
