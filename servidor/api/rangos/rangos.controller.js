const svc = require('./rangos.service');

async function getRangos(req, res) {
  try {
    res.json({ ok: true, ...(await svc.obtener(req.params.userId, req.user)) });
  } catch (err) {
    console.error('Rangos:', err.message);
    res.status(500).json({ error: 'Error calculando los rangos.' });
  }
}

module.exports = { getRangos };
