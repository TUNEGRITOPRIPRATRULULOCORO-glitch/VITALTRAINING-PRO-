const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { query } = require('../../../base-de-datos/db');
const usuarios = require('../usuarios');

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
  const deportesValidos = ['Fútbol', 'Baloncesto', 'Tenis'];
  const deportePrincipal = deportesValidos.includes(datos.deporte) ? datos.deporte : 'Fútbol';
  const rolUsuario = ['Atleta', 'Futbolista'].includes(datos.rol) ? datos.rol : 'Atleta';

  if (!nombre || nombre.trim().length < 2)
    return { error: 'El nombre debe tener al menos 2 caracteres.', status: 400 };
  if (!EMAIL_RE.test(email)) return { error: 'El correo electrónico no tiene un formato válido.', status: 400 };
  if (!password || password.length < 8)
    return { error: 'La contraseña debe tener al menos 8 caracteres.', status: 400 };

  if (await usuarios.buscarIdPorEmail(email) !== null)
    return { error: 'Ya existe una cuenta con ese correo.', status: 409 };

  const hashedPassword = await bcrypt.hash(password, 10);
  const nuevo = await usuarios.registrarAtleta({
    nombre, email, hashedPassword, rol: rolUsuario, deportePrincipal, datos
  });

  const { password: _, ...usuarioSeguro } = nuevo;
  return { usuario: usuarioSeguro };
}

module.exports = { login, registro };