const { query } = require('../../data/db');

async function historialComidas(userId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * Number(limit);
  const [countR, dataR] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM comidas WHERE user_id = $1', [userId]),
    query(
      `SELECT id, user_id AS "userId", nombre, tipo, calorias, proteina, notas, fecha, hora, registrado_por, created_at AS "createdAt"
       FROM comidas WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, Number(limit), offset]
    )
  ]);
  return paginar(dataR.rows, parseInt(countR.rows[0].total), page, limit);
}

async function historialRutinas(userId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * Number(limit);
  const [countR, dataR] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM rutinas WHERE user_id = $1', [userId]),
    query(
      `SELECT id, user_id AS "userId", nombre, tipo, duracion_minutos AS "duracionMinutos", intensidad, descripcion, fecha, registrado_por, created_at AS "createdAt"
       FROM rutinas WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, Number(limit), offset]
    )
  ]);
  return paginar(dataR.rows, parseInt(countR.rows[0].total), page, limit);
}

async function historialAlertas(userId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * Number(limit);
  const [countR, dataR] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM alertas WHERE user_id = $1', [userId]),
    query(
      `SELECT id, user_id AS "userId", tipo, mensaje, leida, fecha, created_at AS "createdAt"
       FROM alertas WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, Number(limit), offset]
    )
  ]);
  return paginar(dataR.rows, parseInt(countR.rows[0].total), page, limit);
}

function paginar(datos, total, page, limit) {
  return {
    datos,
    total,
    pagina:       Number(page),
    totalPaginas: Math.ceil(total / Number(limit))
  };
}

async function marcarAlertaLeida(userId, alertaId) {
  const { rows } = await query(
    'UPDATE alertas SET leida = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [Number(alertaId), userId]
  );
  return rows[0] || null;
}

async function marcarTodasLeidas(userId) {
  await query('UPDATE alertas SET leida = true WHERE user_id = $1', [userId]);
  return { ok: true };
}

async function registrarComida(userId, datos) {
  if (!datos.nombre || !datos.tipo) throw new Error('Nombre y tipo son requeridos.');
  const { rows } = await query(
    `INSERT INTO comidas (user_id, nombre, tipo, calorias, proteina, notas, fecha)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, user_id AS "userId", nombre, tipo, calorias, proteina, notas, fecha, created_at AS "createdAt"`,
    [
      userId, datos.nombre.trim(), datos.tipo,
      Number(datos.calorias) || 0, datos.proteina || null,
      datos.notas || '', datos.fecha || new Date().toISOString().slice(0, 10)
    ]
  );
  return rows[0];
}

async function eliminarComida(userId, comidaId) {
  const { rows } = await query(
    'DELETE FROM comidas WHERE id = $1 AND user_id = $2 RETURNING id',
    [Number(comidaId), userId]
  );
  return rows[0] ? true : null;
}

async function registrarRutina(userId, datos) {
  if (!datos.nombre || !datos.tipo) throw new Error('Nombre y tipo son requeridos.');
  const { rows } = await query(
    `INSERT INTO rutinas (user_id, nombre, tipo, duracion_minutos, intensidad, descripcion, fecha)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, user_id AS "userId", nombre, tipo, duracion_minutos AS "duracionMinutos", intensidad, descripcion, fecha, created_at AS "createdAt"`,
    [
      userId, datos.nombre.trim(), datos.tipo,
      Number(datos.duracionMinutos) || 0,
      datos.intensidad || 'Media',
      datos.descripcion || '',
      datos.fecha || new Date().toISOString().slice(0, 10)
    ]
  );
  return rows[0];
}

async function eliminarRutina(userId, rutinaId) {
  const { rows } = await query(
    'DELETE FROM rutinas WHERE id = $1 AND user_id = $2 RETURNING id',
    [Number(rutinaId), userId]
  );
  return rows[0] ? true : null;
}

async function getCumplimiento(userId) {
  const { rows } = await query(
    `SELECT id, user_id AS "userId", fecha, dia_semana AS "diaSemana", tipo, notas, creado_en AS "creadoEn"
     FROM cumplimiento WHERE user_id = $1 ORDER BY fecha DESC`,
    [userId]
  );
  return rows;
}

async function registrarCumplimiento(userId, datos) {
  const fecha     = datos.fecha     || new Date().toISOString().slice(0, 10);
  const diaSemana = datos.diaSemana || '';

  const { rows: existe } = await query(
    'SELECT id, user_id AS "userId", fecha, dia_semana AS "diaSemana", tipo, notas FROM cumplimiento WHERE user_id = $1 AND fecha = $2 AND dia_semana = $3',
    [userId, fecha, diaSemana]
  );
  if (existe.length > 0) return existe[0];

  const { rows } = await query(
    `INSERT INTO cumplimiento (user_id, fecha, dia_semana, tipo, notas)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, user_id AS "userId", fecha, dia_semana AS "diaSemana", tipo, notas, creado_en AS "creadoEn"`,
    [userId, fecha, diaSemana, datos.tipo || '', datos.notas || '']
  );
  return rows[0];
}

module.exports = {
  historialComidas, historialRutinas, historialAlertas,
  marcarAlertaLeida, marcarTodasLeidas,
  registrarComida, eliminarComida,
  registrarRutina, eliminarRutina,
  getCumplimiento, registrarCumplimiento
};