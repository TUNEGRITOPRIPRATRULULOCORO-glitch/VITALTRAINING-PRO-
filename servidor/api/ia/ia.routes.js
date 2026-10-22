const router = require('express').Router();
const ctrl   = require('./ia.controller');
const { requireOwnerOrRol } = require('../../middleware/roles');
const n8nContextController = require('./n8nContext.controller');

router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista'));
router.get('/:userId/consulta', ctrl.getConsulta);

// Ruta pública para n8n — usa "uid" en vez de "userId" para no disparar el router.param de arriba
router.get('/n8n-contexto/:uid', n8nContextController.getContextoUsuario);

module.exports = router;