const { query } = require('../../data/db');

const CATS_NUTRI = ['Nutrición', 'Plan alimenticio', 'Salud', 'Alimentación'];

function destinatario(categoria) {
  return CATS_NUTRI.includes(categoria) ? 'Nutricionista' : 'Administrador';
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM incidencias WHERE id = $1', [Number(id)]);
  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, userId: r.user_id, comentarios: r.comentarios || [], destinatario: destinatario(r.categoria) };
}

async function listar({ estado, prioridad, userId, destinatario: dest } = {}) {
  let sql = 'SELECT * FROM incidencias WHERE 1=1';
  const params = [];

  if (userId) {
    params.push(Number(userId));
    sql += ` AND user_id = $${params.length}`;
  }
  if (dest === 'Nutricionista') {
    params.push(CATS_NUTRI);
    sql += ` AND categoria = ANY($${params.length})`;
  } else if (dest === 'Administrador') {
    params.push(CATS_NUTRI);
    sql += ` AND categoria != ALL($${params.length})`;
  }
  if (estado && estado !== 'Todos') {
    params.push(estado);
    sql += ` AND estado = $${params.length}`;
  }
  if (prioridad && prioridad !== 'Todas') {
    params.push(prioridad);
    sql += ` AND prioridad = $${params.length}`;
  }
  sql += ' ORDER BY id DESC';

  const { rows } = await query(sql, params);
  return rows.map(r => ({
    ...r,
    userId: r.user_id,
    comentarios: r.comentarios || [],
    destinatario: destinatario(r.categoria)
  }));
}

async function crear(datos, user) {
  const { rows } = await query(
    `INSERT INTO incidencias (user_id, titulo, usuario, categoria, prioridad, estado, fecha, descripcion, comentarios)
     VALUES ($1,$2,$3,$4,$5,'abierta',$6,$7,'[]')
     RETURNING *`,
    [
      user.id, datos.titulo, user.nombre,
      datos.categoria || 'Soporte', datos.prioridad || 'media',
      new Date().toLocaleDateString('es-CO'),
      datos.descripcion || ''
    ]
  );
  const r = rows[0];
  return { ...r, userId: r.user_id, comentarios: r.comentarios || [] };
}

async function actualizarEstado(id, nuevoEstado) {
  const { rows } = await query(
    'UPDATE incidencias SET estado = $1 WHERE id = $2 RETURNING *',
    [nuevoEstado, id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, userId: r.user_id, comentarios: r.comentarios || [] };
}

async function agregarComentario(id, texto, user) {
  const { rows: current } = await query(
    'SELECT comentarios FROM incidencias WHERE id = $1',
    [id]
  );
  if (!current[0]) return null;

  const comentario = {
    autor: user?.nombre || 'Admin',
    fecha: new Date().toLocaleDateString('es-CO'),
    texto
  };
  const comentarios = [...(current[0].comentarios || []), comentario];

  await query(
    'UPDATE incidencias SET comentarios = $1 WHERE id = $2',
    [JSON.stringify(comentarios), id]
  );
  return comentario;
}

module.exports = { listar, getById, crear, actualizarEstado, agregarComentario };