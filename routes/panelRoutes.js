const express = require('express');
const router = express.Router();

const perfilController    = require('../controllers/perfilController');
const dashboardController = require('../controllers/dashboardController');
const historialController = require('../controllers/historialController');

router.get('/:userId/perfil',             perfilController.getPerfil);
router.put('/:userId/perfil',             perfilController.putPerfil);
router.get('/:userId/dashboard',          dashboardController.getDashboard);
router.get('/:userId/historial/comidas',  historialController.getHistorialComidas);
router.get('/:userId/historial/rutinas',  historialController.getHistorialRutinas);
router.get('/:userId/historial/alertas',  historialController.getHistorialAlertas);

module.exports = router;