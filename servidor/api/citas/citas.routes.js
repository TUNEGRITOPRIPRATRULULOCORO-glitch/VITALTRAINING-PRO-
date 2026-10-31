/**
 * GET  /api/citas                 → Mis citas (atleta: las suyas · médico/nutricionista: su agenda)
 * GET  /api/citas/profesionales   → Atleta: médicos y nutricionistas con los que puede pedir cita, y las horas posibles
 * GET  /api/citas/ocupadas?profesionalId=&fecha= → Atleta: horas ya tomadas de ese profesional ese día
 * POST /api/citas                 → Atleta: pedir cita { profesionalId, fecha, hora, modalidad, motivo }
 * PUT  /api/citas/:id/estado      → Confirmar, rechazar, cancelar o marcar realizada { estado, respuesta? }
 */
const router = require('express').Router();
const svc    = require('./citas.service');

function fallo(res, err, mensaje) {
  if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
  console.error('Citas:', err.message);
  res.status(500).json({ ok: false, error: mensaje });
}

router.get('/', async (req, res) => {
  try { res.json({ ok: true, citas: await svc.listar(req.user), hoy: svc.ahoraColombia() }); }
  catch (err) { fallo(res, err, 'Error cargando las citas.'); }
});

router.get('/profesionales', async (req, res) => {
  try { res.json({ ok: true, profesionales: await svc.profesionalesDe(req.user), horas: svc.HORAS }); }
  catch (err) { fallo(res, err, 'Error cargando tus profesionales.'); }
});

router.get('/ocupadas', async (req, res) => {
  try { res.json({ ok: true, ocupadas: await svc.horasOcupadas(req.user, req.query.profesionalId, req.query.fecha) }); }
  catch (err) { fallo(res, err, 'Error cargando las horas.'); }
});

router.post('/', async (req, res) => {
  try { res.status(201).json({ ok: true, cita: await svc.pedir(req.user, req.body) }); }
  catch (err) { fallo(res, err, 'Error pidiendo la cita.'); }
});

router.put('/:id/estado', async (req, res) => {
  try { res.json({ ok: true, cita: await svc.cambiarEstado(req.user, req.params.id, req.body) }); }
  catch (err) { fallo(res, err, 'Error cambiando la cita.'); }
});

module.exports = router;
