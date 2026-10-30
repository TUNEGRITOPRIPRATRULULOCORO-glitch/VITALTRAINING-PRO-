/**
 * POST /api/reloj/:userId/sesiones     → Guardar una sesión del reloj (archivo) o del pulsómetro Bluetooth
 * GET  /api/reloj/:userId/sesiones     → Últimas sesiones con pulso (zonas, carga, distancia)
 * GET  /api/reloj/:userId/sesiones/:id → Una sesión con su curva de pulso
 *
 * Registran: el propio atleta y su entrenador. Consultan además el médico y el nutricionista.
 */
const router = require('express').Router();
const svc    = require('./reloj.service');
const { accesoAtleta } = require('../equipos');
const { revisarCargaAlta } = require('../panel');

const CONSULTAN = ['Administrador', 'Entrenador', 'Medico', 'Médico', 'Nutricionista'];

function fallo(res, err, mensaje) {
  if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
  console.error('Reloj:', err.message);
  res.status(500).json({ ok: false, error: mensaje });
}

router.post('/:userId/sesiones', accesoAtleta('Administrador', 'Entrenador'), async (req, res) => {
  try {
    const sesion = await svc.registrar(req.params.userId, req.body);
    res.status(201).json({ ok: true, sesion });
    // Después de responder: avisar si esta sesión dispara el riesgo por carga
    revisarCargaAlta(Number(req.params.userId)).catch(err => console.error('❌ Revisar carga:', err.message));
  } catch (err) { fallo(res, err, 'Error guardando la sesión.'); }
});

router.get('/:userId/sesiones', accesoAtleta(...CONSULTAN), async (req, res) => {
  try { res.json({ ok: true, sesiones: await svc.listar(req.params.userId, req.query.limite) }); }
  catch (err) { fallo(res, err, 'Error cargando las sesiones.'); }
});

router.get('/:userId/sesiones/:id', accesoAtleta(...CONSULTAN), async (req, res) => {
  try { res.json({ ok: true, sesion: await svc.detalle(req.params.userId, req.params.id) }); }
  catch (err) { fallo(res, err, 'Error cargando la sesión.'); }
});

module.exports = router;
