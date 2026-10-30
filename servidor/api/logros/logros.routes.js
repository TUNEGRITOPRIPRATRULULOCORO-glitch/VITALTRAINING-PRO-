/**
 * GET /api/logros/:userId → Logros del atleta con su progreso (los nuevos vienen marcados para celebrarlos)
 *
 * Consultan: el propio atleta y los profesionales de su equipo.
 */
const router = require('express').Router();
const ctrl   = require('./logros.controller');
const { accesoAtleta } = require('../equipos');

router.get('/:userId', accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Entrenador', 'Administrador'), ctrl.getLogros);

module.exports = router;
