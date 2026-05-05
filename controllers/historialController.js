/**
 * controllers/historialController.js
 */

const historialService = require('../services/historialService');

// GET /api/panel/historial/comidas
function getHistorialComidas(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { page, limit } = req.query;
    const resultado = historialService.historialComidas(userId, { page, limit });
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('❌ Error historial comidas:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET /api/panel/historial/rutinas
function getHistorialRutinas(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { page, limit } = req.query;
    const resultado = historialService.historialRutinas(userId, { page, limit });
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('❌ Error historial rutinas:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET /api/panel/historial/alertas
function getHistorialAlertas(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { page, limit } = req.query;
    const resultado = historialService.historialAlertas(userId, { page, limit });
    res.json({ ok: true, ...resultado });
  } catch (err) {
    console.error('❌ Error historial alertas:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { getHistorialComidas, getHistorialRutinas, getHistorialAlertas };