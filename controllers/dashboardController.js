/**
 * controllers/dashboardController.js
 */

const dashboardService = require('../services/dashboardService');

// GET /api/panel/dashboard
function getDashboard(req, res) {
  try {
    const userId = Number(req.params.userId);
    const resumen = dashboardService.obtenerResumen(userId);
    res.json({ ok: true, resumen });
  } catch (err) {
    console.error('❌ Error obteniendo dashboard:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { getDashboard };