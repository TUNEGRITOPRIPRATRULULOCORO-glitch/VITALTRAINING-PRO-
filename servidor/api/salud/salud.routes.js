/**
 * GET  /api/salud/:userId → Historial de salud del futbolista (también lo consulta el médico)
 * POST /api/salud/:userId → Registrar nuevo dato de salud
 */
const router = require('express').Router();
const ctrl   = require('./salud.controller');
const { requireOwnerOrRol } = require('../../compartido/middleware/roles');

router.get('/:userId',  requireOwnerOrRol('Administrador', 'Nutricionista', 'Medico', 'Médico'), ctrl.getSalud);
router.post('/:userId', requireOwnerOrRol('Administrador', 'Nutricionista'), ctrl.postSalud);

module.exports = router;
