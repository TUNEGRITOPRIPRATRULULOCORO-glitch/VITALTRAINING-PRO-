const svc = require('./logros.service');

async function getLogros(req, res) {
  try {
    res.json({ ok: true, ...(await svc.obtener(req.params.userId, req.user)) });
  } catch (err) {
    console.error('Logros:', err.message);
    res.status(500).json({ error: 'Error cargando los logros.' });
  }
}

module.exports = { getLogros };
