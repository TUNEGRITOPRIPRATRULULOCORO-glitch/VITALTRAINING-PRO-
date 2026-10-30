/**
 * GET    /api/series/:userId/ejercicio?nombre=&objetivo=  → Series de hoy, sesión anterior, récord y sugerencia
 * GET    /api/series/:userId/hoy                          → Cuántas series lleva hoy en cada ejercicio
 * GET    /api/series/:userId/records                      → Mejor marca de cada ejercicio
 * POST   /api/series/:userId                              → Apuntar una serie { ejercicio, peso?, repeticiones, fecha? }
 * DELETE /api/series/:userId/:id                          → Borrar una serie
 * POST   /api/series/:userId/:id/verificar                → Un entrenador (o médico/admin) verifica la serie
 *
 * Consultan: el propio atleta y los profesionales de su equipo. Apunta: solo el atleta.
 */
const router = require('express').Router();
const ctrl   = require('./series.controller');
const { accesoAtleta } = require('../equipos');

const puedeVer   = accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Entrenador', 'Administrador');
// Verificar un récord: un profesional que lo vio (no el propio atleta)
const verificador = accesoAtleta('Entrenador', 'Medico', 'Médico', 'Administrador');
const soloAtleta = accesoAtleta(); // sin roles extra: solo el propio atleta

router.get('/:userId/ejercicio', puedeVer,   ctrl.getEjercicio);
router.get('/:userId/hoy',       puedeVer,   ctrl.getHoy);
router.get('/:userId/records',   puedeVer,   ctrl.getRecords);
router.post('/:userId',          soloAtleta, ctrl.postSerie);
router.delete('/:userId/:id',    soloAtleta, ctrl.deleteSerie);
router.post('/:userId/:id/verificar', verificador, ctrl.postVerificar);

module.exports = router;
