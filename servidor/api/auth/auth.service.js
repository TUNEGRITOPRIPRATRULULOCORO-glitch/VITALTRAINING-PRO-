const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { query } = require('../../../base-de-datos/db');
const usuarios = require('../usuarios');
const avisos   = require('../avisos');
const { DEPORTES } = require('../../compartido/deportes');
const google   = require('./google');

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

  return sesion(usuario);
}

function sesion(usuario) {
  const token = jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
  const { password: _, ...usuarioSeguro } = usuario;
  return { usuario: usuarioSeguro, token };
}

/**
 * Entrar con Google. Si el correo ya tiene cuenta, inicia sesión. Si no, devuelve el nombre y
 * el correo para que la persona complete el registro (deporte, posición...) sin contraseña.
 */
async function loginGoogle(credencial) {
  const perfil = await google.verificar(credencial);
  if (!perfil) return { error: 'No se pudo verificar tu cuenta de Google. Inténtalo de nuevo.', status: 401 };

  const { rows } = await query('SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)', [perfil.email]);
  const usuario = rows[0];
  if (!usuario) return { nuevo: true, nombre: perfil.nombre, email: perfil.email };
  if (usuario.estado === 'Inactivo') return { error: 'Cuenta inactiva. Contacta al administrador.', status: 403 };
  return sesion(usuario);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Crea una cuenta de atleta. Con datos.googleCredencial la cuenta se crea con el correo que
 * Google verificó y una contraseña aleatoria (si algún día quiere una, usa "¿Olvidaste tu contraseña?").
 */
async function registro(datos) {
  const { nombre } = datos;
  let { email, password } = datos;
  const deportePrincipal = DEPORTES.includes(datos.deporte) ? datos.deporte : 'Fútbol';
  const rolUsuario = ['Atleta', 'Futbolista'].includes(datos.rol) ? datos.rol : 'Atleta';

  if (datos.googleCredencial) {
    const perfil = await google.verificar(datos.googleCredencial);
    if (!perfil) return { error: 'No se pudo verificar tu cuenta de Google. Vuelve a pulsar "Continuar con Google".', status: 401 };
    email = perfil.email;
    password = crypto.randomBytes(32).toString('hex');
  }

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

  // Con Google ya está verificado quién es: entra directamente
  if (datos.googleCredencial) return sesion(nuevo);
  const { password: _, ...usuarioSeguro } = nuevo;
  return { usuario: usuarioSeguro };
}

// ─── Recuperar contraseña ──────────────────────────────────────────────────────
const MINUTOS_ENLACE = 60;

function huella(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Crea un enlace de un solo uso y lo envía por correo. No revela si el correo existe:
 * quien llama responde siempre lo mismo. En la base solo se guarda la huella del enlace.
 */
async function solicitarRestablecimiento(email) {
  if (!EMAIL_RE.test(String(email || ''))) return;
  const { rows } = await query(
    'SELECT id, nombre, email, estado FROM usuarios WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  const usuario = rows[0];
  if (!usuario || usuario.estado !== 'Activo') return;

  const token = crypto.randomBytes(32).toString('hex');
  // Pedir un enlace nuevo anula los anteriores
  await query('UPDATE restablecimientos SET usado = true WHERE user_id = $1 AND usado = false', [usuario.id]);
  await query(
    'INSERT INTO restablecimientos (user_id, token_hash, expira) VALUES ($1, $2, $3)',
    [usuario.id, huella(token), new Date(Date.now() + MINUTOS_ENLACE * 60000).toISOString()]
  );
  await avisos.restablecerPassword(usuario, token, MINUTOS_ENLACE);
}

async function restablecerPassword(token, password) {
  const invalido = { error: 'El enlace no es válido o ya caducó. Pide uno nuevo.', status: 400 };
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return invalido;
  if (!password || password.length < 8)
    return { error: 'La contraseña debe tener al menos 8 caracteres.', status: 400 };

  const { rows } = await query(
    'SELECT user_id, expira, usado FROM restablecimientos WHERE token_hash = $1',
    [huella(token)]
  );
  const enlace = rows[0];
  if (!enlace || enlace.usado || new Date(enlace.expira) < new Date()) return invalido;

  // El enlace sigue sirviendo: puede probar con otra contraseña
  const { rows: actual } = await query('SELECT password FROM usuarios WHERE id = $1', [enlace.user_id]);
  if (actual[0] && await bcrypt.compare(password, actual[0].password))
    return { error: 'La nueva contraseña debe ser distinta de la anterior.', status: 400 };

  await usuarios.cambiarPassword(enlace.user_id, await bcrypt.hash(password, 10));
  await query('UPDATE restablecimientos SET usado = true WHERE user_id = $1', [enlace.user_id]);
  return { ok: true };
}

module.exports = { login, loginGoogle, registro, solicitarRestablecimiento, restablecerPassword };