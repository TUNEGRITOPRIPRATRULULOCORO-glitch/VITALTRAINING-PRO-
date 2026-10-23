const { query } = require('../../../base-de-datos/db');
const { hoyISO, aFechaISO } = require('../../compartido/fechas');
const catalogo = require('./evaluaciones.catalogo');

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

async function deporteDe(userId) {
  const { rows } = await query('SELECT deporte_principal FROM usuarios WHERE id = $1', [Number(userId)]);
  if (!rows[0]) throw error('Atleta no encontrado.', 404);
  return rows[0].deporte_principal || 'Fútbol';
}

function aResultado(r) {
  return {
    id: Number(r.id),
    prueba: r.prueba,
    valor: Number(r.valor),
    fecha: aFechaISO(r.fecha),
    notas: r.notas || '',
    registradoPor: r.registrado_por || null,
  };
}

/** Batería del deporte del atleta con su historial y tendencias. */
async function obtener(userId) {
  const deporte = await deporteDe(userId);
  const { rows } = await query(
    'SELECT id, prueba, valor, fecha, notas, registrado_por FROM evaluaciones WHERE user_id = $1 ORDER BY fecha, id',
    [Number(userId)]
  );
  return catalogo.resumir(deporte, rows.map(aResultado), hoyISO());
}

async function registrar(userId, datos, autor) {
  const deporte = await deporteDe(userId);
  const prueba = String(datos.prueba || '');
  if (!catalogo.pruebasDe(deporte).some(p => p.id === prueba))
    throw error(`Esa prueba no forma parte de la batería de ${deporte}.`, 400);
  const problema = catalogo.validarValor(prueba, datos.valor);
  if (problema) throw error(problema, 400);

  const fecha = datos.fecha ? String(datos.fecha).slice(0, 10) : hoyISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) throw error('Fecha no válida.', 400);
  if (fecha > hoyISO()) throw error('La fecha no puede ser futura.', 400);

  const { rows } = await query(
    `INSERT INTO evaluaciones (user_id, prueba, valor, fecha, notas, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, prueba, valor, fecha, notas, registrado_por`,
    [Number(userId), prueba, Number(datos.valor), fecha, String(datos.notas || '').slice(0, 300), autor?.nombre || null]
  );
  return aResultado(rows[0]);
}

async function eliminar(userId, id) {
  const { rows } = await query(
    'DELETE FROM evaluaciones WHERE id = $1 AND user_id = $2 RETURNING id',
    [Number(id), Number(userId)]
  );
  return rows.length > 0;
}

module.exports = { obtener, registrar, eliminar };
