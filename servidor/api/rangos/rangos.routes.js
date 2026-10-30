/**
 * GET /api/rangos/:userId → Rangos (Bronce … Radiante) en sus ejercicios de fuerza y sus tests físicos,
 *                           con lo que le falta para el siguiente
 *
 * Consultan: el propio atleta y los profesionales de su equipo.
 */
const router = require('express').Router();
const ctrl   = require('./rangos.controller');
const { accesoAtleta } = require('../equipos');

router.get('/:userId', accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Entrenador', 'Administrador'), ctrl.getRangos);

module.exports = router;
