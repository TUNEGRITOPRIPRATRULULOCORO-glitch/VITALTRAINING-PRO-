const router = require('express').Router();
const auth   = require('../middleware/auth');
const { requireRol } = require('../middleware/roles');

// Rutas públicas (no requieren token)
router.use('/auth', require('./auth/auth.routes'));

// Todas las rutas siguientes requieren sesión iniciada
router.use(auth);

router.use('/usuarios',      requireRol('Administrador'), require('./usuarios/usuarios.routes'));
router.use('/reportes',      requireRol('Administrador'), require('./reportes/reportes.routes'));
router.use('/nutricionista', requireRol('Nutricionista', 'Administrador'), require('./nutricionista/nutricionista.routes'));
router.use('/incidencias',   require('./incidencias/incidencias.routes'));
router.use('/panel',         require('./panel/panel.routes'));
router.use('/salud',         require('./salud/salud.routes'));
router.use('/ia',            require('./ia/ia.routes'));
router.use('/perfil-medico', require('./perfilMedico/perfilMedico.routes'));

module.exports = router;
