const svc = require('./salud.service');
const avisos = require('../avisos');

async function getSalud(req, res) {
  try {
    res.json(await svc.listar(Number(req.params.userId)));
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo datos de salud.' });
  }
}

async function postSalud(req, res) {
  try {
    const registro = await svc.crear(Number(req.params.userId), req.body);
    res.status(201).json({ ok: true, registro });
    // Después de responder: aviso por correo al equipo médico si hay valores preocupantes
    avisos.alertaSalud(Number(req.params.userId), svc.problemasDe(registro).map(p => p.resumen));
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Error guardando datos de salud.' });
  }
}

module.exports = { getSalud, postSalud };