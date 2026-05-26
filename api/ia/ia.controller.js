const svc = require('./ia.service');

async function getConsulta(req, res) {
  try {
    const userId = Number(req.params.userId);
    const tipo   = req.query.tipo;
    if (!tipo) return res.status(400).json({ error: 'Falta el parámetro tipo.' });
    const resultado = await svc.consulta(userId, tipo);
    res.json({ ok: true, ...resultado });
  } catch (err) {
    res.status(500).json({ error: 'Error generando análisis.' });
  }
}

module.exports = { getConsulta };