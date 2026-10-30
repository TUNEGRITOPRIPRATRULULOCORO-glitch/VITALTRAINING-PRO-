/**
 * GET  /api/salud/:userId → Historial de salud del futbolista (también lo consulta el médico)
 * POST /api/salud/:userId → Registrar nuevo dato de salud
 */
const router = require('express').Router();
const ctrl   = require('./salud.controller');
const { accesoAtleta } = require('../equipos');

router.get('/:userId',  accesoAtleta('Administrador', 'Nutricionista', 'Medico', 'Médico', 'Entrenador'), ctrl.getSalud);
router.post('/:userId', accesoAtleta('Administrador', 'Nutricionista'), ctrl.postSalud);

module.exports = router;
