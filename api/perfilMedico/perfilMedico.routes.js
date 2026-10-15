const router = require('express').Router();
const ctrl   = require('./perfilMedico.controller');
const { requireOwnerOrRol, requireRol } = require('../../middleware/roles');

router.get('/catalogos', ctrl.getCatalogos);
router.get('/atletas', requireRol('Medico'), ctrl.getAtletas);

router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista', 'Medico'));
router.get('/:userId',  ctrl.getObtener);
router.post('/:userId', requireOwnerOrRol('Administrador', 'Nutricionista'), ctrl.postGuardar);

module.exports = router;