const svc = require('./dashboard.service');

async function getDashboard(req, res) {
  try {
    const resumen = await svc.obtenerResumen(Number(req.params.userId));
    res.json({ ok: true, resumen });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { getDashboard };