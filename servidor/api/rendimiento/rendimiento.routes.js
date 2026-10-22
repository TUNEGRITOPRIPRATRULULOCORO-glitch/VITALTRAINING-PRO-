/**
 * GET /api/rendimiento/equipo   → Resumen de todos los atletas (Médico, Nutricionista, Admin)
 * GET /api/rendimiento/:userId  → Listo para entrenar, carga y cumplimiento de un atleta
 */
const router = require('express').Router();
const ctrl   = require('./rendimiento.controller');
const { requireRol, requireOwnerOrRol } = require('../../compartido/middleware/roles');

router.get('/equipo', requireRol('Medico', 'Nutricionista', 'Administrador'), ctrl.getEquipo);
router.get('/:userId', requireOwnerOrRol('Medico', 'Nutricionista', 'Administrador'), ctrl.getResumen);

module.exports = router;
