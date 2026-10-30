/**
 * GET /api/rendimiento/equipo   → Resumen de todos los atletas (Médico, Nutricionista, Admin)
 * GET /api/rendimiento/:userId  → Listo para entrenar, carga y cumplimiento de un atleta
 */
const router = require('express').Router();
const ctrl   = require('./rendimiento.controller');
const { requireRol } = require('../../compartido/middleware/roles');
const { accesoAtleta } = require('../equipos');

router.get('/equipo', requireRol('Medico', 'Médico', 'Nutricionista', 'Administrador'), ctrl.getEquipo);
router.get('/:userId', accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Administrador'), ctrl.getResumen);

module.exports = router;
