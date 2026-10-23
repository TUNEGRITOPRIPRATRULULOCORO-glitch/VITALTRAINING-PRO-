const bcrypt = require('bcrypt');
const { query } = require('../../../base-de-datos/db');

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

  const rolesValidos = ['Atleta', 'Futbolista', 'Nutricionista', 'Administrador', 'Medico'];
  const rolUsuario = rolesValidos.includes(datos.rol) ? datos.rol : 'Atleta';
  const { rows } = await query(
    `INSERT INTO usuarios (nombre, email, password, rol, estado)
     VALUES ($1,$2,$3,$4,'Activo')
     RETURNING id, nombre, email, rol, estado`,
    [datos.nombre, datos.email, hashed, rolUsuario]
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

async function buscarIdPorEmail(email) {
  const { rows } = await query(
    'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return rows[0]?.id ?? null;
}

// Alta de un atleta desde el registro público (la contraseña ya llega hasheada)
async function registrarAtleta({ nombre, email, hashedPassword, rol, deportePrincipal, datos }) {
  const { rows } = await query(
    `INSERT INTO usuarios
       (nombre, email, password, rol, estado, deporte_principal, peso, altura, fecha_nacimiento, posicion, frecuencia, pie, objetivo, fecha_registro)
     VALUES ($1,$2,$3,$4,'Activo',$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      nombre, email, hashedPassword, rol, deportePrincipal,
      datos.peso || null, datos.altura || null, datos.fechaNacimiento || null,
      datos.posicion || null, datos.frecuencia || null, datos.pie || null,
      datos.objetivo || null, new Date().toLocaleDateString('es-CO')
    ]
  );
  return rows[0];
}

async function actualizarDeporte(id, deportePrincipal) {
  const { rows } = await query(
    'UPDATE usuarios SET deporte_principal = $1 WHERE id = $2 RETURNING deporte_principal AS "deportePrincipal"',
    [deportePrincipal, id]
  );
  return rows[0]?.deportePrincipal ?? null;
}

/** Cambia la contraseña (ya hasheada) de un usuario. */
async function cambiarPassword(id, hashedPassword) {
  const { rows } = await query('UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING id', [hashedPassword, id]);
  return rows.length > 0;
}

/** Nombre y correo de un usuario activo, para enviarle avisos. */
async function contacto(id) {
  const { rows } = await query(
    "SELECT id, nombre, email FROM usuarios WHERE id = $1 AND estado = 'Activo'",
    [id]
  );
  return rows[0] || null;
}

/** Nombre y correo de los usuarios activos con alguno de esos roles. */
async function contactosPorRol(roles) {
  if (!roles.length) return [];
  const marcadores = roles.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `SELECT id, nombre, email FROM usuarios WHERE estado = 'Activo' AND rol IN (${marcadores})`,
    roles
  );
  return rows;
}

module.exports = { listar, crear, actualizar, eliminar, buscarIdPorEmail, registrarAtleta, actualizarDeporte, cambiarPassword, contacto, contactosPorRol };