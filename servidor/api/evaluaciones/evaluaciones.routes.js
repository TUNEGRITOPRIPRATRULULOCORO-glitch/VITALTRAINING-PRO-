/**
 * GET    /api/evaluaciones/:userId      → Tests físicos del atleta (batería de su deporte, historial y tendencias)
 * POST   /api/evaluaciones/:userId      → Registrar un resultado { prueba, valor, fecha?, notas? }
 * DELETE /api/evaluaciones/:userId/:id  → Borrar un resultado
 *
 * Consultan: el propio atleta, médico, nutricionista y admin.
 * Registran o borran: el propio atleta, médico y admin.
 */
const router = require('express').Router();
const ctrl   = require('./evaluaciones.controller');
const { accesoAtleta } = require('../equipos');

// Además del rol, el profesional tiene que compartir equipo con el atleta (módulo equipos)
const puedeVer       = accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Administrador');
const puedeRegistrar = accesoAtleta('Medico', 'Médico', 'Administrador');

router.get('/:userId',        puedeVer,       ctrl.getEvaluaciones);
router.post('/:userId',       puedeRegistrar, ctrl.postEvaluacion);
router.delete('/:userId/:id', puedeRegistrar, ctrl.deleteEvaluacion);

module.exports = router;
