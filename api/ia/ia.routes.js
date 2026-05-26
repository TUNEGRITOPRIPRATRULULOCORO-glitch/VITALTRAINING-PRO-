const router = require('express').Router();
const ctrl   = require('./ia.controller');
const { requireOwnerOrRol } = require('../../middleware/roles');

router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista'));
router.get('/:userId/consulta', ctrl.getConsulta);

module.exports = router;