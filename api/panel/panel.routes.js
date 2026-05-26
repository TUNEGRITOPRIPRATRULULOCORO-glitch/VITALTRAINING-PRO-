/**
 * GET /api/panel/:userId/perfil              → Obtener perfil deportivo
 * PUT /api/panel/:userId/perfil              → Actualizar perfil deportivo
 * GET /api/panel/:userId/dashboard           → Resumen del panel
 * GET /api/panel/:userId/historial/comidas   → Historial de comidas (paginado)
 * GET /api/panel/:userId/historial/rutinas   → Historial de rutinas (paginado)
 * GET /api/panel/:userId/historial/alertas   → Historial de alertas (paginado)
 */
const router   = require('express').Router();
const perfil   = require('./perfil.controller');
const dash     = require('./dashboard.controller');
const historial = require('./historial.controller');
const { requireOwnerOrRol } = require('../../middleware/roles');

router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista'));

router.get('/:userId/perfil',            perfil.getPerfil);
router.put('/:userId/perfil',            perfil.putPerfil);
router.get('/:userId/dashboard',         dash.getDashboard);
router.get('/:userId/historial/comidas',            historial.getHistorialComidas);
router.get('/:userId/historial/rutinas',            historial.getHistorialRutinas);
router.get('/:userId/historial/alertas',            historial.getHistorialAlertas);
router.put('/:userId/alertas/:alertaId/leer',       historial.putAlertaLeida);
router.put('/:userId/alertas/leer-todas',           historial.putTodasLeidas);
router.post('/:userId/comidas',                     historial.postComida);
router.delete('/:userId/comidas/:comidaId',         historial.deleteComida);
router.post('/:userId/rutinas',                     historial.postRutina);
router.delete('/:userId/rutinas/:rutinaId',         historial.deleteRutina);
router.get('/:userId/cumplimiento',                 historial.getCumplimiento);
router.post('/:userId/cumplimiento',                historial.postCumplimiento);

module.exports = router;
