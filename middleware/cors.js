/**
 * middleware/cors.js — Configuración de CORS
 * ============================================
 * Permite que el frontend se comunique con el backend
 * aunque estén en dominios o puertos diferentes.
 *
 * CUANDO DESPLIEGUEN EN PRODUCCIÓN:
 *   Reemplazar '*' por el dominio real del frontend, por ejemplo:
 *     'https://vital-training.com'
 *   Nunca dejar '*' en producción si el sistema maneja datos de usuarios.
 */

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';

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
