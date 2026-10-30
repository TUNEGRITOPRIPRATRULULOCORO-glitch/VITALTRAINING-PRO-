/**
 * Con sesión:
 * GET    /api/notificaciones/clave      → Clave pública para suscribir el navegador
 * GET    /api/notificaciones/estado     → ¿Este dispositivo está suscrito? ?endpoint=
 * POST   /api/notificaciones/suscribir  → Activar en este dispositivo { suscripcion, recordatorio }
 * DELETE /api/notificaciones/suscribir  → Desactivar en este dispositivo { endpoint }
 * POST   /api/notificaciones/prueba     → Enviarme una notificación de prueba
 *
 * Sin sesión, con el secreto de la tarea programada (cabecera X-Cron-Secreto = CRON_SECRET):
 * POST   /api/notificaciones/recordatorios → Recordatorio diario a quien no registró su salud
 */
const crypto = require('crypto');
const express = require('express');
const svc = require('./notificaciones.service');

const fallo = (res, err, porDefecto) => {
  if (!err.status) console.error('Notificaciones:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });
};

const router = express.Router();

router.get('/clave', async (req, res) => {
  try { res.json({ ok: true, clave: await svc.clavePublica() }); } catch (err) { fallo(res, err, 'Error preparando las notificaciones.'); }
});
router.get('/estado', async (req, res) => {
  try { res.json({ ok: true, ...(await svc.estado(req.user.id, req.query.endpoint)) }); } catch (err) { fallo(res, err, 'Error leyendo el estado.'); }
});
router.post('/suscribir', async (req, res) => {
  try { await svc.suscribir(req.user.id, req.body || {}); res.json({ ok: true }); } catch (err) { fallo(res, err, 'Error activando las notificaciones.'); }
});
router.delete('/suscribir', async (req, res) => {
  try { await svc.desuscribir(req.user.id, req.body?.endpoint); res.json({ ok: true }); } catch (err) { fallo(res, err, 'Error desactivando las notificaciones.'); }
});
router.post('/prueba', async (req, res) => {
  try {
    const enviados = await svc.enviar(req.user.id, { titulo: '🔔 ¡Funciona!', cuerpo: 'Así te avisaremos de mensajes, alertas de tu médico y tu recordatorio diario.', etiqueta: 'prueba' });
    res.json({ ok: true, enviados });
  } catch (err) { fallo(res, err, 'Error enviando la prueba.'); }
});

// Comparación en tiempo constante: no deja adivinar el secreto midiendo cuánto tarda la respuesta
function secretoValido(recibido) {
  const esperado = process.env.CRON_SECRET || '';
  const a = Buffer.from(String(recibido || '')), b = Buffer.from(esperado);
  return esperado.length >= 16 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

const cron = express.Router();
cron.post('/recordatorios', async (req, res) => {
  if (!process.env.CRON_SECRET) return res.status(503).json({ error: 'Falta CRON_SECRET en el servidor.' });
  if (!secretoValido(req.get('X-Cron-Secreto'))) return res.status(401).json({ error: 'No autorizado.' });
  try { res.json({ ok: true, ...(await svc.recordatorioDiario()) }); } catch (err) { fallo(res, err, 'Error enviando los recordatorios.'); }
});

module.exports = { router, cron };
