/**
 * middleware/cors.js — Configuración de CORS
 * ============================================
 * Permite que el frontend se comunique con el backend
 * aunque estén en dominios o puertos diferentes.
 *
 * En producción la interfaz se sirve desde el mismo servidor, así que por defecto no se
 * permite ningún otro origen. Si algún día la interfaz vive en otro dominio, poner ese
 * dominio en CORS_ORIGIN (por ejemplo https://vital-training.com).
 * En desarrollo se permite cualquier origen para facilitar las pruebas.
 */

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? null : '*');

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGIN === '*') {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin === ALLOWED_ORIGIN) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}

module.exports = corsMiddleware;
