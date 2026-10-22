/**
 * GET /api/reportes → Estadísticas generales del sistema
 */
const router = require('express').Router();
const ctrl   = require('./reportes.controller');

router.get('/', ctrl.getReportes);

module.exports = router;
