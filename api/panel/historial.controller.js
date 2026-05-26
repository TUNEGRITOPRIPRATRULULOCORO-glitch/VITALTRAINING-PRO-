const svc = require('./historial.service');

async function getHistorialComidas(req, res) {
  try {
    const resultado = await svc.historialComidas(Number(req.params.userId), req.query);
    res.json({ ok: true, ...resultado });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function getHistorialRutinas(req, res) {
  try {
    const resultado = await svc.historialRutinas(Number(req.params.userId), req.query);
    res.json({ ok: true, ...resultado });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function getHistorialAlertas(req, res) {
  try {
    const resultado = await svc.historialAlertas(Number(req.params.userId), req.query);
    res.json({ ok: true, ...resultado });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function putAlertaLeida(req, res) {
  try {
    const resultado = await svc.marcarAlertaLeida(Number(req.params.userId), req.params.alertaId);
    if (!resultado) return res.status(404).json({ error: 'Alerta no encontrada.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando alerta.' });
  }
}

async function putTodasLeidas(req, res) {
  try {
    await svc.marcarTodasLeidas(Number(req.params.userId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando alertas.' });
  }
}

async function postComida(req, res) {
  try {
    const comida = await svc.registrarComida(Number(req.params.userId), req.body);
    res.status(201).json({ ok: true, comida });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

async function deleteComida(req, res) {
  try {
    const result = await svc.eliminarComida(Number(req.params.userId), req.params.comidaId);
    if (!result) return res.status(404).json({ ok: false, error: 'Comida no encontrada.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function postRutina(req, res) {
  try {
    const rutina = await svc.registrarRutina(Number(req.params.userId), req.body);
    res.status(201).json({ ok: true, rutina });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}

async function deleteRutina(req, res) {
  try {
    const result = await svc.eliminarRutina(Number(req.params.userId), req.params.rutinaId);
    if (!result) return res.status(404).json({ ok: false, error: 'Rutina no encontrada.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getCumplimiento(req, res) {
  try {
    const datos = await svc.getCumplimiento(Number(req.params.userId));
    res.json({ ok: true, datos });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function postCumplimiento(req, res) {
  try {
    const registro = await svc.registrarCumplimiento(Number(req.params.userId), req.body);
    res.status(201).json({ ok: true, registro });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  getHistorialComidas, getHistorialRutinas, getHistorialAlertas,
  putAlertaLeida, putTodasLeidas,
  postComida, deleteComida,
  postRutina, deleteRutina,
  getCumplimiento, postCumplimiento
};