const svc = require('./ia.service');
const asistente = require('./asistente');

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

async function getChat(req, res) {
  try {
    const mensajes = await asistente.historial(Number(req.params.userId));
    res.json({ ok: true, mensajes, modo: asistente.claudeDisponible() ? 'claude' : 'basico' });
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo la conversación.' });
  }
}

async function postChat(req, res) {
  try {
    const resultado = await asistente.conversar(Number(req.params.userId), req.body?.mensaje);
    if (resultado.error) return res.status(resultado.status).json({ error: resultado.error });
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('❌ Asistente IA:', err.message);
    res.status(500).json({ error: 'El asistente no pudo responder. Inténtalo de nuevo.' });
  }
}

async function deleteChat(req, res) {
  try {
    await asistente.borrarConversacion(Number(req.params.userId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error borrando la conversación.' });
  }
}

module.exports = { getConsulta, getChat, postChat, deleteChat };