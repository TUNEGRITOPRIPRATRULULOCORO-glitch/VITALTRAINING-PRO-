const router = require('express').Router();
const auth   = require('../compartido/middleware/auth');
const { requireRol } = require('../compartido/middleware/roles');

// Rutas públicas (no requieren token)
router.use('/auth', require('./auth').router);

// Todas las rutas siguientes requieren sesión iniciada
router.use(auth);

router.use('/usuarios',      requireRol('Administrador'), require('./usuarios').router);
router.use('/reportes',      requireRol('Administrador'), require('./reportes').router);
router.use('/nutricionista', requireRol('Nutricionista', 'Administrador'), require('./nutricionista').router);
router.use('/incidencias',   require('./incidencias').router);
router.use('/panel',         require('./panel').router);
router.use('/salud',         require('./salud').router);
router.use('/ia',            require('./ia').router);
router.use('/perfil-medico', require('./perfilMedico').router);

module.exports = router;
