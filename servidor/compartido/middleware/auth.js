const jwt = require('jsonwebtoken');
const { query } = require('../../../base-de-datos/db');

const JWT_SECRET = process.env.JWT_SECRET || 'vt-super-secret-key-2026';

/**
 * El token dice quién es la persona, pero su rol y si sigue activa se leen de la base:
 * así, desactivar una cuenta o quitarle un rol surte efecto enseguida y no a las 8 h,
 * cuando caduca el token. Se recuerda 30 s para no consultar la base en cada petición;
 * olvidarCuenta() lo borra al momento cuando el administrador cambia o elimina al usuario.
 */
const VIGENCIA_MS = 30 * 1000;
const cuentas = new Map(); // id → { rol, estado, hasta }

async function cuentaActual(id) {
  const guardada = cuentas.get(id);
  if (guardada && guardada.hasta > Date.now()) return guardada;
  const { rows } = await query('SELECT rol, estado FROM usuarios WHERE id = $1', [id]);
  if (!rows[0]) { cuentas.delete(id); return null; }
  const cuenta = { rol: rows[0].rol, estado: rows[0].estado, hasta: Date.now() + VIGENCIA_MS };
  cuentas.set(id, cuenta);
  return cuenta;
}

function olvidarCuenta(id) {
  cuentas.delete(Number(id));
}

// Todas las rutas que pasan por aquí exigen sesión: no hay excepciones
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión.' });
  }
  let datos;
  try {
    datos = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' });
  }

  return cuentaActual(Number(datos.id))
    .then(cuenta => {
      if (!cuenta || cuenta.estado === 'Inactivo')
        return res.status(401).json({ error: 'Tu cuenta no está activa. Contacta al administrador.' });
      req.user = { ...datos, rol: cuenta.rol };
      next();
    })
    .catch(() => res.status(500).json({ error: 'Error comprobando la sesión.' }));
}

module.exports = authMiddleware;
module.exports.olvidarCuenta = olvidarCuenta;
