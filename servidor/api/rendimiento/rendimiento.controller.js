const svc = require('./rendimiento.service');

async function getResumen(req, res) {
  try {
    const resumen = await svc.obtenerResumen(Number(req.params.userId));
    res.json({ ok: true, resumen });
  } catch (err) {
    res.status(500).json({ error: 'Error calculando el rendimiento.' });
  }
}

async function getEquipo(req, res) {
  try {
    const atletas = await svc.obtenerEquipo(req.user);
    res.json({ ok: true, atletas });
  } catch (err) {
    res.status(500).json({ error: 'Error calculando el rendimiento del equipo.' });
  }
}

module.exports = { getResumen, getEquipo };
