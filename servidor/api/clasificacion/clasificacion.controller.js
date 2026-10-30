const svc = require('./clasificacion.service');

// Los errores con status (400/404) son de validación y su mensaje se puede mostrar
function fallo(res, err, porDefecto) {
  if (!err.status) console.error('Clasificación:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });
}

async function getOpciones(req, res) {
  try { res.json({ ok: true, ...(await svc.opciones(req.user)) }); }
  catch (err) { fallo(res, err, 'Error cargando la clasificación.'); }
}

async function getConstancia(req, res) {
  try { res.json({ ok: true, ...(await svc.constancia(req.user, req.query)) }); }
  catch (err) { fallo(res, err, 'Error calculando la clasificación.'); }
}

async function getMarcas(req, res) {
  try { res.json({ ok: true, ...(await svc.marcas(req.user, req.query)) }); }
  catch (err) { fallo(res, err, 'Error calculando la clasificación.'); }
}

async function putVisible(req, res) {
  try { res.json({ ok: true, visible: await svc.cambiarVisible(req.user.id, req.body?.visible) }); }
  catch (err) { fallo(res, err, 'Error guardando la preferencia.'); }
}

module.exports = { getOpciones, getConstancia, getMarcas, putVisible };
