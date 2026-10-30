/**
 * Solo atletas:
 * GET /api/clasificacion/opciones                              → Su deporte, su equipo, tests y levantamientos
 * GET /api/clasificacion/constancia?ambito=equipo|deporte&periodo=semana|mes
 * GET /api/clasificacion/marcas?ambito=equipo|deporte&clave=test:cmj|fuerza:sentadilla
 * PUT /api/clasificacion/visible                               → Aparecer o no en las clasificaciones { visible }
 */
const router = require('express').Router();
const ctrl   = require('./clasificacion.controller');
const { requireRol } = require('../../compartido/middleware/roles');

router.use(requireRol('Atleta', 'Futbolista'));

router.get('/opciones',   ctrl.getOpciones);
router.get('/constancia', ctrl.getConstancia);
router.get('/marcas',     ctrl.getMarcas);
router.put('/visible',    ctrl.putVisible);

module.exports = router;
