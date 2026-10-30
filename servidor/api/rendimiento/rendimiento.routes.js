/**
 * GET /api/rendimiento/equipo   → Resumen de todos los atletas (Médico, Nutricionista, Admin)
 * GET /api/rendimiento/:userId  → Listo para entrenar, carga y cumplimiento de un atleta
 * GET /api/rendimiento/:userId/hoy → "Hoy te toca…": salud, sesión y comidas del día
 */
const router = require('express').Router();
const ctrl   = require('./rendimiento.controller');
const { requireRol } = require('../../compartido/middleware/roles');
const { accesoAtleta } = require('../equipos');

router.get('/equipo', requireRol('Medico', 'Médico', 'Nutricionista', 'Administrador'), ctrl.getEquipo);
router.get('/:userId', accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Administrador'), ctrl.getResumen);
router.get('/:userId/hoy', accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Administrador'), ctrl.getHoy);

module.exports = router;
