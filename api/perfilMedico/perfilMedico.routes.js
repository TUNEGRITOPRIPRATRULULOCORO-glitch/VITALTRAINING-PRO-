const router = require('express').Router();
const ctrl   = require('./perfilMedico.controller');
const { requireOwnerOrRol } = require('../../middleware/roles');

router.get('/catalogos', ctrl.getCatalogos);

router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista'));
router.get('/:userId',  ctrl.getObtener);
router.post('/:userId', ctrl.postGuardar);

module.exports = router;