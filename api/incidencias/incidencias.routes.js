/**
 * GET  /api/incidencias                 → Listar (filtros: estado, prioridad, userId)
 * POST /api/incidencias                 → Crear incidencia (cualquier usuario)
 * PUT  /api/incidencias/:id/estado      → Cambiar estado
 * POST /api/incidencias/:id/comentarios → Añadir comentario
 */
const router = require('express').Router();
const ctrl   = require('./incidencias.controller');
const { requireRol } = require('../../middleware/roles');

router.get('/',                 ctrl.getIncidencias);
router.post('/',                ctrl.postIncidencia);
router.put('/:id/estado',       ctrl.putEstado);
router.post('/:id/comentarios', ctrl.postComentario);

module.exports = router;
