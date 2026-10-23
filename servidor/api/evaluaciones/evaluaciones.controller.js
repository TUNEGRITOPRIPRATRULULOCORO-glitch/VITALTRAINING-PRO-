const svc = require('./evaluaciones.service');

// Los errores con status (400/404) son de validación y su mensaje se puede mostrar
function responderError(res, err, porDefecto) {
  res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });
}

async function getEvaluaciones(req, res) {
  try {
    res.json({ ok: true, ...(await svc.obtener(req.params.userId)) });
  } catch (err) {
    responderError(res, err, 'Error cargando los tests físicos.');
  }
}

async function postEvaluacion(req, res) {
  try {
    const resultado = await svc.registrar(req.params.userId, req.body || {}, req.user);
    res.status(201).json({ ok: true, resultado });
  } catch (err) {
    responderError(res, err, 'Error guardando el resultado.');
  }
}

async function deleteEvaluacion(req, res) {
  try {
    if (!(await svc.eliminar(req.params.userId, req.params.id)))
      return res.status(404).json({ error: 'Resultado no encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    responderError(res, err, 'Error eliminando el resultado.');
  }
}

module.exports = { getEvaluaciones, postEvaluacion, deleteEvaluacion };
