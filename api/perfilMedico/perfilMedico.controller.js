const svc = require('./perfilMedico.service');

async function getObtener(req, res) {
  try {
    const userId = Number(req.params.userId);
    const perfil = await svc.obtener(userId);
    res.json({ ok: true, perfil: perfil || null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function postGuardar(req, res) {
  try {
    const userId   = Number(req.params.userId);
    const posicion = req.body.posicion || 'Mediocampista';
    const datos    = req.body;
    const result   = await svc.guardar(userId, datos, posicion);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

function getCatalogos(req, res) {
  res.json({
    ok: true,
    CONDICIONES:  svc.CONDICIONES,
    ALERGIAS:     svc.ALERGIAS,
    PREFERENCIAS: svc.PREFERENCIAS
  });
}

module.exports = { getObtener, postGuardar, getCatalogos };