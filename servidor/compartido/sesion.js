/**
 * Firma y verificación de las sesiones (JWT). Un solo lugar para la clave: el middleware
 * que las comprueba y el servicio que las crea usan siempre la misma.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'vt-super-secret-key-2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  ADVERTENCIA: JWT_SECRET no está definido en .env — usando clave de desarrollo. NO usar en producción.');
}

function firmar(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verificar(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

/**
 * ¿El token es anterior al último cambio de contraseña? Entonces ya no vale: cambiar la
 * contraseña cierra las demás sesiones. Se compara en segundos (lo que guarda el token),
 * así el token nuevo que se firma justo después del cambio sigue siendo válido.
 */
function anteriorAlCambio(datos, passwordCambiado) {
  if (!passwordCambiado || !datos.iat) return false;
  return datos.iat < Math.floor(new Date(passwordCambiado).getTime() / 1000);
}

module.exports = { firmar, verificar, anteriorAlCambio };
