const svc = require('./salud.service');

async function getSalud(req, res) {
  try {
    res.json(await svc.listar(Number(req.params.userId)));
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo datos de salud.' });
  }
}

async function postSalud(req, res) {
  try {
    const registro = await svc.crear(Number(req.params.userId), req.body);
    res.status(201).json({ ok: true, registro });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Error guardando datos de salud.' });
  }
}

module.exports = { getSalud, postSalud };