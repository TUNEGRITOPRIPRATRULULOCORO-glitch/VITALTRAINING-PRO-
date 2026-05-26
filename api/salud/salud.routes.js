/**
 * GET  /api/salud/:userId → Historial de salud del futbolista
 * POST /api/salud/:userId → Registrar nuevo dato de salud
 */
const router = require('express').Router();
const ctrl   = require('./salud.controller');
const { requireOwnerOrRol } = require('../../middleware/roles');

router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista'));

router.get('/:userId',  ctrl.getSalud);
router.post('/:userId', ctrl.postSalud);

module.exports = router;
