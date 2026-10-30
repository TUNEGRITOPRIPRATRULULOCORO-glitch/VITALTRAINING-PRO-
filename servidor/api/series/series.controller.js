const svc = require('./series.service');

// Los errores con status (400/404) son de validación y su mensaje se puede mostrar
function fallo(res, err, porDefecto) {
  if (!err.status) console.error('Series:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });
}

async function getEjercicio(req, res) {
  try {
    res.json({ ok: true, ...(await svc.ejercicio(req.params.userId, req.query.nombre, req.query.objetivo)) });
  } catch (err) { fallo(res, err, 'Error cargando el ejercicio.'); }
}

async function getHoy(req, res) {
  try {
    res.json({ ok: true, series: await svc.resumenHoy(req.params.userId) });
  } catch (err) { fallo(res, err, 'Error cargando las series de hoy.'); }
}

async function getRecords(req, res) {
  try {
    res.json({ ok: true, records: await svc.records(req.params.userId) });
  } catch (err) { fallo(res, err, 'Error cargando los récords.'); }
}

async function postSerie(req, res) {
  try {
    res.status(201).json({ ok: true, ...(await svc.registrar(req.params.userId, req.body || {})) });
  } catch (err) { fallo(res, err, 'Error guardando la serie.'); }
}

async function deleteSerie(req, res) {
  try {
    if (!(await svc.eliminar(req.params.userId, req.params.id))) return res.status(404).json({ error: 'Serie no encontrada.' });
    res.json({ ok: true });
  } catch (err) { fallo(res, err, 'Error borrando la serie.'); }
}

module.exports = { getEjercicio, getHoy, getRecords, postSerie, deleteSerie };
