const svc = require('./lesiones.service');

// Los errores con status (400/404) son de validación y su mensaje se puede mostrar
function responderError(res, err, porDefecto) {
  if (!err.status) console.error('Lesiones:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });
}

function getCatalogos(req, res) {
  res.json({ ok: true, ...svc.catalogos() });
}

async function getExpediente(req, res) {
  try {
    res.json({ ok: true, ...(await svc.obtener(req.params.userId, req.user)) });
  } catch (err) {
    responderError(res, err, 'Error cargando las lesiones.');
  }
}

async function postLesion(req, res) {
  try {
    res.status(201).json({ ok: true, lesion: await svc.registrar(req.params.userId, req.body || {}, req.user) });
  } catch (err) {
    responderError(res, err, 'Error guardando la lesión.');
  }
}

async function putLesion(req, res) {
  try {
    res.json({ ok: true, lesion: await svc.actualizar(req.params.userId, req.params.id, req.body || {}) });
  } catch (err) {
    responderError(res, err, 'Error actualizando la lesión.');
  }
}

async function postAlta(req, res) {
  try {
    res.json({ ok: true, lesion: await svc.darAlta(req.params.userId, req.params.id, req.body?.fecha) });
  } catch (err) {
    responderError(res, err, 'Error dando el alta.');
  }
}

async function deleteLesion(req, res) {
  try {
    if (!(await svc.eliminar(req.params.userId, req.params.id)))
      return res.status(404).json({ error: 'Lesión no encontrada.' });
    res.json({ ok: true });
  } catch (err) {
    responderError(res, err, 'Error eliminando la lesión.');
  }
}

async function postNota(req, res) {
  try {
    res.status(201).json({ ok: true, nota: await svc.agregarNota(req.params.userId, req.body || {}, req.user) });
  } catch (err) {
    responderError(res, err, 'Error guardando la nota.');
  }
}

async function deleteNota(req, res) {
  try {
    if (!(await svc.eliminarNota(req.params.userId, req.params.id, req.user)))
      return res.status(404).json({ error: 'Nota no encontrada o escrita por otro médico.' });
    res.json({ ok: true });
  } catch (err) {
    responderError(res, err, 'Error eliminando la nota.');
  }
}

module.exports = { getCatalogos, getExpediente, postLesion, putLesion, postAlta, deleteLesion, postNota, deleteNota };
