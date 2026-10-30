const router = require('express').Router();
const ctrl   = require('./perfilMedico.controller');
const { requireOwnerOrRol, requireRol } = require('../../compartido/middleware/roles');
const { accesoAtleta } = require('../equipos');

router.get('/catalogos', ctrl.getCatalogos);
router.get('/atletas', requireRol('Medico', 'Médico'), ctrl.getAtletas);

router.param('userId', accesoAtleta('Administrador', 'Nutricionista', 'Medico', 'Médico'));
router.get('/:userId',  ctrl.getObtener);
router.post('/:userId', requireOwnerOrRol('Administrador', 'Nutricionista'), ctrl.postGuardar);

module.exports = router;