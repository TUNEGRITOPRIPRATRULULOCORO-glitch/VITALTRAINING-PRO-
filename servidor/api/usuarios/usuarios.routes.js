/**
 * GET    /api/usuarios       → Listar (filtros: q, rol, estado)
 * POST   /api/usuarios       → Crear usuario
 * PUT    /api/usuarios/:id   → Actualizar usuario
 * DELETE /api/usuarios/:id   → Eliminar usuario
 */
const router = require('express').Router();
const ctrl   = require('./usuarios.controller');

router.get('/',      ctrl.getUsuarios);
router.post('/',     ctrl.postUsuario);
router.put('/:id',   ctrl.putUsuario);
router.delete('/:id',ctrl.deleteUsuario);

module.exports = router;
