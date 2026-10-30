const { query } = require('../../../base-de-datos/db');
const { hoyISO, aFechaISO, sumarDias } = require('../../compartido/fechas');
const cat = require('./lesiones.catalogo');

const MAX_INDICACIONES = 500;
const MAX_NOTA = 2000;

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

const esMedico = rol => rol === 'Medico' || rol === 'Médico';

function aLesion(r) {
  return {
    id: Number(r.id),
    zona: r.zona,
    tipo: r.tipo,
    gravedad: r.gravedad,
    restriccion: r.restriccion,
    fechaInicio: aFechaISO(r.fecha_inicio),
    altaEstimada: aFechaISO(r.alta_estimada),
    fechaAlta: aFechaISO(r.fecha_alta),
    indicaciones: r.indicaciones || '',
    registradoPor: r.registrado_por || null,
  };
}

function aNota(r) {
  return {
    id: Number(r.id),
    texto: r.texto,
    visibleAtleta: r.visible_atleta !== false,
    autorId: r.autor_id == null ? null : Number(r.autor_id),
    autor: r.autor_nombre || null,
    fecha: r.created_at,
  };
}

async function existeAtleta(userId) {
  const { rows } = await query('SELECT id FROM usuarios WHERE id = $1', [Number(userId)]);
  if (!rows[0]) throw error('Atleta no encontrado.', 404);
}

async function avisarAtleta(userId, tipo, mensaje) {
  const panel = require('../panel');
  await panel.crearAlerta(Number(userId), tipo, mensaje, new Date().toLocaleDateString('es-CO'))
    .catch(err => console.error('Aviso de lesión:', err.message));
}

/**
 * Estado médico, lesiones y notas clínicas del atleta.
 * Las notas solo las ven los médicos (todas) y el propio atleta (las marcadas como visibles);
 * para el resto de roles no se envían.
 */
async function obtener(userId, lector) {
  await existeAtleta(userId);
  const { rows } = await query(
    `SELECT * FROM lesiones WHERE user_id = $1 ORDER BY fecha_inicio DESC, id DESC`,
    [Number(userId)]
  );
  const lesiones = rows.map(aLesion);
  const activas = lesiones.filter(l => !l.fechaAlta);

  let notas = null;
  const propio = Number(lector?.id) === Number(userId);
  if (esMedico(lector?.rol) || propio) {
    const { rows: filas } = await query(
      `SELECT * FROM notas_clinicas WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
      [Number(userId)]
    );
    notas = filas.map(aNota).filter(n => esMedico(lector?.rol) || n.visibleAtleta);
  }

  return {
    estado: cat.estadoDesde(activas),
    activas,
    historial: lesiones.filter(l => l.fechaAlta),
    notas,
  };
}

/** Datos de una lesión con los campos de la petición (los que no vienen se quedan como estaban). */
function leerDatos(body = {}) {
  const datos = {};
  for (const campo of ['zona', 'tipo', 'gravedad', 'restriccion', 'fechaInicio', 'altaEstimada']) {
    if (body[campo] !== undefined && body[campo] !== null && body[campo] !== '') datos[campo] = String(body[campo]).slice(0, 40);
  }
  if (body.altaEstimada === '' || body.altaEstimada === null) datos.altaEstimada = null;
  if (body.indicaciones !== undefined) datos.indicaciones = String(body.indicaciones || '').trim().slice(0, MAX_INDICACIONES);
  return datos;
}

async function registrar(userId, body, autor) {
  await existeAtleta(userId);
  const hoy = hoyISO();
  const datos = { restriccion: 'no_apto', fechaInicio: hoy, ...leerDatos(body) };
  const problema = cat.validarLesion(datos, hoy);
  if (problema) throw error(problema, 400);

  const { rows } = await query(
    `INSERT INTO lesiones (user_id, zona, tipo, gravedad, restriccion, fecha_inicio, alta_estimada, indicaciones, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [Number(userId), datos.zona, datos.tipo, datos.gravedad, datos.restriccion, datos.fechaInicio,
      datos.altaEstimada || null, datos.indicaciones || '', autor?.nombre || null]
  );
  const lesion = aLesion(rows[0]);
  await avisarAtleta(userId, 'lesion', lesion.restriccion === 'no_apto'
    ? `🩹 Tu médico registró una lesión (${lesion.zona}): estás de baja y no debes entrenar hasta el alta.`
    : `🩹 Tu médico registró una lesión (${lesion.zona}): entrena solo lo que te indicó.`);
  return lesion;
}

async function buscar(userId, id) {
  const { rows } = await query('SELECT * FROM lesiones WHERE id = $1 AND user_id = $2', [Number(id), Number(userId)]);
  if (!rows[0]) throw error('Lesión no encontrada.', 404);
  return aLesion(rows[0]);
}

/** Cambia la restricción, la gravedad, el alta estimada o las indicaciones de una lesión. */
async function actualizar(userId, id, body) {
  const actual = await buscar(userId, id);
  const cambios = leerDatos(body);
  const datos = { ...actual, ...cambios };
  const problema = cat.validarLesion(datos, hoyISO(), { parcial: true });
  if (problema) throw error(problema, 400);

  const { rows } = await query(
    `UPDATE lesiones SET zona = $1, tipo = $2, gravedad = $3, restriccion = $4, fecha_inicio = $5,
            alta_estimada = $6, indicaciones = $7
     WHERE id = $8 AND user_id = $9 RETURNING *`,
    [datos.zona, datos.tipo, datos.gravedad, datos.restriccion, datos.fechaInicio,
      datos.altaEstimada || null, datos.indicaciones || '', Number(id), Number(userId)]
  );
  const lesion = aLesion(rows[0]);
  if (!actual.fechaAlta && actual.restriccion !== lesion.restriccion) {
    await avisarAtleta(userId, 'lesion', lesion.restriccion === 'adaptado'
      ? `🩹 Buenas noticias: ya puedes entrenar adaptado (${lesion.zona}). Sigue las indicaciones de tu médico.`
      : `🩹 Tu médico cambió tu estado a baja médica (${lesion.zona}): no entrenes hasta el alta.`);
  }
  return lesion;
}

async function darAlta(userId, id, fecha) {
  const actual = await buscar(userId, id);
  if (actual.fechaAlta) throw error('Esta lesión ya tiene el alta.', 400);
  const hoy = hoyISO();
  const alta = fecha ? String(fecha).slice(0, 10) : hoy;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(alta) || Number.isNaN(Date.parse(alta))) throw error('Fecha no válida.', 400);
  if (alta > hoy) throw error('El alta no puede ser una fecha futura.', 400);
  if (alta < actual.fechaInicio) throw error('El alta no puede ser anterior al inicio de la lesión.', 400);

  const { rows } = await query(
    'UPDATE lesiones SET fecha_alta = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
    [alta, Number(id), Number(userId)]
  );
  await avisarAtleta(userId, 'lesion', `✅ Alta médica (${actual.zona}): ya puedes volver a tu plan. Empieza suave los primeros días.`);
  return aLesion(rows[0]);
}

async function eliminar(userId, id) {
  const { rows } = await query(
    'DELETE FROM lesiones WHERE id = $1 AND user_id = $2 RETURNING id',
    [Number(id), Number(userId)]
  );
  return rows.length > 0;
}

async function agregarNota(userId, body, autor) {
  await existeAtleta(userId);
  const texto = String(body?.texto || '').trim();
  if (!texto) throw error('Escribe la nota.', 400);
  if (texto.length > MAX_NOTA) throw error(`La nota no puede pasar de ${MAX_NOTA} caracteres.`, 400);
  const visible = body?.visibleAtleta !== false;

  const { rows } = await query(
    `INSERT INTO notas_clinicas (user_id, autor_id, autor_nombre, texto, visible_atleta)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [Number(userId), Number(autor.id), autor.nombre || null, texto, visible]
  );
  if (visible) await avisarAtleta(userId, 'nota medica', '📋 Tu médico dejó una nota nueva en tu expediente.');
  return aNota(rows[0]);
}

/** Cada médico solo puede borrar sus propias notas. */
async function eliminarNota(userId, id, autor) {
  const { rows } = await query(
    'DELETE FROM notas_clinicas WHERE id = $1 AND user_id = $2 AND autor_id = $3 RETURNING id',
    [Number(id), Number(userId), Number(autor.id)]
  );
  return rows.length > 0;
}

/**
 * Estado médico de varios atletas a la vez, para otros módulos (rendimiento, asistente).
 * periodos: días en que cada lesión estuvo activa, para no contarlos como sesiones falladas.
 * @returns {Object<string, {estado, etiqueta, mensaje, zonas, activas, periodos}>}
 */
async function estadosDe(userIds) {
  const porUsuario = Object.fromEntries(userIds.map(id => [String(id), []]));
  if (userIds.length) {
    // IN ($1,$2,...) en vez de ANY($1), igual que en rendimiento (pg-mem)
    const ids = userIds.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await query(`SELECT * FROM lesiones WHERE user_id IN (${ids})`, userIds.map(Number));
    rows.forEach(r => porUsuario[String(r.user_id)]?.push(aLesion(r)));
  }
  return Object.fromEntries(Object.entries(porUsuario).map(([id, lesiones]) => {
    const activas = lesiones.filter(l => !l.fechaAlta);
    const periodos = lesiones.map(l => ({ desde: l.fechaInicio, hasta: l.fechaAlta ? sumarDias(l.fechaAlta, -1) : cat.SIN_FIN }));
    return [id, { ...cat.estadoDesde(activas), activas, periodos }];
  }));
}

async function estadoDe(userId) {
  return (await estadosDe([Number(userId)]))[String(userId)];
}

function catalogos() {
  return { zonas: cat.ZONAS, tipos: cat.TIPOS, gravedades: cat.GRAVEDADES, restricciones: cat.RESTRICCIONES };
}

module.exports = {
  obtener, registrar, actualizar, darAlta, eliminar, agregarNota, eliminarNota,
  estadosDe, estadoDe, catalogos, esMedico,
};
