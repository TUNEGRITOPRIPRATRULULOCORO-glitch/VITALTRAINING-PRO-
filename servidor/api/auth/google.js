/**
 * Inicio de sesión con Google.
 *
 * El navegador recibe de Google una credencial (un token firmado) y la manda al servidor.
 * Aquí se comprueba la firma, que sea para nuestra app (GOOGLE_CLIENT_ID) y que Google haya
 * verificado el correo. Sin GOOGLE_CLIENT_ID el botón no aparece y esto no se usa.
 */
const { OAuth2Client } = require('google-auth-library');

let cliente = null;

function clientId() {
  return process.env.GOOGLE_CLIENT_ID || null;
}

/**
 * @returns {Promise<{ email: string, nombre: string } | null>} null si la credencial no es válida
 */
async function verificar(credencial) {
  const id = clientId();
  if (!id || typeof credencial !== 'string' || credencial.length > 4096) return null;
  cliente ??= new OAuth2Client(id);
  try {
    const ticket = await cliente.verifyIdToken({ idToken: credencial, audience: id });
    const datos = ticket.getPayload();
    if (!datos?.email || !datos.email_verified) return null;
    return { email: datos.email.toLowerCase(), nombre: datos.name || datos.email.split('@')[0] };
  } catch {
    return null;
  }
}

module.exports = { verificar, clientId };
