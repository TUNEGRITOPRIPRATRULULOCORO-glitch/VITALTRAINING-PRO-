const bcrypt = require('bcrypt');
const { query } = require('../../data/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listar({ q, rol, estado } = {}) {
  let sql = 'SELECT id, nombre, email, rol, estado FROM usuarios WHERE 1=1';
  const params = [];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const n = params.length;
    sql += ` AND (LOWER(nombre) LIKE $${n} OR LOWER(email) LIKE $${n})`;
  }
  if (rol && rol !== 'Todos los roles') {
    params.push(rol);
    sql += ` AND rol = $${params.length}`;
  }
  if (estado && estado !== 'Todos los estados') {
    params.push(estado);
    sql += ` AND estado = $${params.length}`;
  }

  const { rows } = await query(sql, params);
  return rows;
}

async function crear(datos) {
  if (!datos.nombre || !datos.nombre.trim())
    throw Object.assign(new Error('El nombre es requerido.'), { status: 400 });
  if (!datos.email || !EMAIL_RE.test(datos.email))
    throw Object.assign(new Error('El correo electrónico no tiene un formato válido.'), { status: 400 });

  const { rows: existe } = await query(
    'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)',
    [datos.email]
  );
  if (existe.length > 0)
    throw Object.assign(new Error('Ya existe una cuenta con ese correo.'), { status: 409 });

  if (!datos.password || datos.password.length < 8)
    throw Object.assign(new Error('La contraseña es requerida y debe tener al menos 8 caracteres.'), { status: 400 });
  const plain  = datos.password;
  const hashed = await bcrypt.hash(plain, 10);

  const { rows } = await query(
    `INSERT INTO usuarios (nombre, email, password, rol, estado)
     VALUES ($1,$2,$3,$4,'Activo')
     RETURNING id, nombre, email, rol, estado`,
    [datos.nombre, datos.email, hashed, datos.rol || 'Futbolista']
  );
  return rows[0];
}

async function actualizar(id, datos) {
  const { password, ...cambios } = datos;
  const permitidos = ['nombre', 'email', 'rol', 'estado'];
  const campos = Object.keys(cambios).filter(k => permitidos.includes(k));
  if (!campos.length) return null;

  const sets = campos.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await query(
    `UPDATE usuarios SET ${sets} WHERE id = $1 RETURNING id, nombre, email, rol, estado`,
    [id, ...campos.map(k => cambios[k])]
  );
  return rows[0] || null;
}

async function eliminar(id) {
  const { rows } = await query(
    'DELETE FROM usuarios WHERE id = $1 RETURNING nombre',
    [id]
  );
  return rows[0] ? { nombre: rows[0].nombre } : null;
}

module.exports = { listar, crear, actualizar, eliminar };