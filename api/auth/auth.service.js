const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { query } = require('../../data/db');

const JWT_SECRET  = process.env.JWT_SECRET || 'vt-super-secret-key-2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  ADVERTENCIA: JWT_SECRET no está definido en .env — usando clave de desarrollo. NO usar en producción.');
}

async function login(email, password) {
  const { rows } = await query(
    'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  const usuario = rows[0];
  if (!usuario) return { error: 'Correo o contraseña incorrectos.', status: 401 };
  if (usuario.estado === 'Inactivo') return { error: 'Cuenta inactiva. Contacta al administrador.', status: 403 };

  const match = await bcrypt.compare(password, usuario.password);
  if (!match) return { error: 'Correo o contraseña incorrectos.', status: 401 };

  const token = jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  const { password: _, ...usuarioSeguro } = usuario;
  return { usuario: usuarioSeguro, token };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function registro(datos) {
  const { nombre, email, password } = datos;
  if (!nombre || nombre.trim().length < 2)
    return { error: 'El nombre debe tener al menos 2 caracteres.', status: 400 };
  if (!EMAIL_RE.test(email)) return { error: 'El correo electrónico no tiene un formato válido.', status: 400 };
  if (!password || password.length < 8)
    return { error: 'La contraseña debe tener al menos 8 caracteres.', status: 400 };

  const { rows: existe } = await query(
    'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (existe.length > 0) return { error: 'Ya existe una cuenta con ese correo.', status: 409 };

  const hashedPassword = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO usuarios
       (nombre, email, password, rol, estado, peso, altura, fecha_nacimiento, posicion, frecuencia, pie, objetivo, fecha_registro)
     VALUES ($1,$2,$3,'Futbolista','Activo',$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      nombre, email, hashedPassword,
      datos.peso || null, datos.altura || null, datos.fechaNacimiento || null,
      datos.posicion || null, datos.frecuencia || null, datos.pie || null,
      datos.objetivo || null, new Date().toLocaleDateString('es-CO')
    ]
  );

  const { password: _, ...usuarioSeguro } = rows[0];
  return { usuario: usuarioSeguro };
}

module.exports = { login, registro };