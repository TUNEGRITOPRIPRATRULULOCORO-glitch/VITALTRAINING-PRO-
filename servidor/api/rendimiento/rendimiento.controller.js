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

async function getHoy(req, res) {
  try {
    res.json({ ok: true, hoy: await svc.obtenerHoy(Number(req.params.userId)) });
  } catch (err) {
    console.error('Hoy te toca:', err.message);
    res.status(500).json({ error: 'Error preparando tu día.' });
  }
}

module.exports = { getResumen, getEquipo, getHoy };
