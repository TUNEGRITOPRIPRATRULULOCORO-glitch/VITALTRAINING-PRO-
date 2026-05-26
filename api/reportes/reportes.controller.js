const svc = require('./reportes.service');

async function getReportes(req, res) {
  try {
    res.json(await svc.obtenerReporte());
  } catch (err) {
    res.status(500).json({ error: 'Error generando reportes.' });
  }
}

module.exports = { getReportes };