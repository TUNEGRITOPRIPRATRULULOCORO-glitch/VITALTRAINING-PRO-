const perfilService = require('../services/perfilService');

function getPerfil(req, res) {
  try {
    const userId = Number(req.params.userId);
    const perfil = perfilService.obtenerPerfil(userId);
    if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado.' });
    res.json({ ok: true, perfil });
  } catch (err) {
    res.status(500).json({ error: 'Error interno.' });
  }
}

function putPerfil(req, res) {
  try {
    const userId = Number(req.params.userId);
    const datos = req.body;
    if (!datos || Object.keys(datos).length === 0)
      return res.status(400).json({ error: 'Sin datos.' });
    const perfilActualizado = perfilService.actualizarPerfil(userId, datos);
    res.json({ ok: true, perfil: perfilActualizado });
  } catch (err) {
    res.status(500).json({ error: 'Error interno.' });
  }
}

module.exports = { getPerfil, putPerfil };