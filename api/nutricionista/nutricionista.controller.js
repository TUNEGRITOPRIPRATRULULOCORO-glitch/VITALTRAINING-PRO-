const svc = require('./nutricionista.service');

async function getFutbolistas(req, res) {
  try {
    res.json(await svc.listarFutbolistas());
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo futbolistas.' });
  }
}

async function getDetalle(req, res) {
  try {
    const detalle = await svc.detalleFutbolista(req.params.userId);
    if (!detalle) return res.status(404).json({ error: 'Futbolista no encontrado.' });
    res.json({ ok: true, detalle });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando detalle.' });
  }
}

async function postNota(req, res) {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: 'El texto es requerido.' });
    const nota = await svc.agregarNota(req.params.userId, req.user, texto.trim());
    res.status(201).json({ ok: true, nota });
  } catch (err) {
    res.status(500).json({ error: 'Error guardando nota.' });
  }
}

async function postComida(req, res) {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });
    const comida = await svc.registrarComida(req.params.userId, req.user, req.body);
    res.status(201).json({ ok: true, comida });
  } catch (err) {
    res.status(500).json({ error: 'Error guardando comida.' });
  }
}

async function postRutina(req, res) {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });
    const rutina = await svc.registrarRutina(req.params.userId, req.user, req.body);
    res.status(201).json({ ok: true, rutina });
  } catch (err) {
    res.status(500).json({ error: 'Error guardando rutina.' });
  }
}

module.exports = { getFutbolistas, getDetalle, postNota, postComida, postRutina };