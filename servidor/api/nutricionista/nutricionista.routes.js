/**
 * GET /api/nutricionista/futbolistas          → Lista de futbolistas activos con resumen
 * GET /api/nutricionista/futbolistas/:userId  → Detalle completo de un futbolista
 */
const router = require('express').Router();
const ctrl   = require('./nutricionista.controller');

router.get('/futbolistas',                     ctrl.getFutbolistas);
router.get('/futbolistas/:userId',             ctrl.getDetalle);
router.post('/futbolistas/:userId/notas',      ctrl.postNota);
router.post('/futbolistas/:userId/comidas',    ctrl.postComida);
router.post('/futbolistas/:userId/rutinas',    ctrl.postRutina);

module.exports = router;
