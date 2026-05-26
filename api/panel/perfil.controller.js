const svc = require('./perfil.service');

async function getPerfil(req, res) {
  try {
    const perfil = await svc.obtenerPerfil(Number(req.params.userId));
    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    res.json({ ok: true, perfil });
  } catch (err) {
    res.status(500).json({ error: 'Error interno.' });
  }
}

async function putPerfil(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0)
      return res.status(400).json({ error: 'Sin datos.' });
    const perfil = await svc.actualizarPerfil(Number(req.params.userId), req.body);
    res.json({ ok: true, perfil });
  } catch (err) {
    res.status(500).json({ error: 'Error interno.' });
  }
}

module.exports = { getPerfil, putPerfil };