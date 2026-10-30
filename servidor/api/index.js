const router = require('express').Router();
const auth   = require('../compartido/middleware/auth');
const { requireRol } = require('../compartido/middleware/roles');

// Rutas públicas (no requieren token)

// Estado del servidor y de la base de datos (lo usa el hosting para saber si la app está viva)
router.get('/estado', async (req, res) => {
  try {
    await require('../../base-de-datos/db').query('SELECT 1');
    res.json({ ok: true, baseDeDatos: 'conectada' });
  } catch {
    res.status(503).json({ ok: false, baseDeDatos: 'sin conexión' });
  }
});
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
router.use('/rendimiento',   require('./rendimiento').router);
router.use('/mensajes',      require('./mensajes').router);
router.use('/evaluaciones',  require('./evaluaciones').router);
router.use('/lesiones',      require('./lesiones').router);
router.use('/equipos',       require('./equipos').router);
router.use('/series',        require('./series').router);
router.use('/cuenta',        require('./usuarios').cuentaRouter);
router.use('/fotos',         require('./usuarios').fotosRouter);

module.exports = router;
