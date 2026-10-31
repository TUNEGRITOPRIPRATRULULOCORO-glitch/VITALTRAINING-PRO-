/**
 * GET    /api/equipos/mios                  → Mis equipos (atleta: sus profesionales · profesional: sus atletas)
 * POST   /api/equipos/unirse                → El atleta se une con el código de invitación { codigo }
 *
 * Solo administrador:
 * GET    /api/equipos                       → Todos los equipos con sus miembros, y los atletas sin equipo
 * POST   /api/equipos                       → Crear { nombre, deporte? }
 * PUT    /api/equipos/:id                   → Editar { nombre, deporte? }
 * DELETE /api/equipos/:id                   → Eliminar (los miembros quedan sin equipo)
 * POST   /api/equipos/:id/codigo            → Código de invitación nuevo
 * POST   /api/equipos/:id/miembros          → Añadir atleta o profesional { userId }
 * DELETE /api/equipos/:id/miembros/:userId  → Quitar del equipo
 * POST   /api/equipos/asignaciones          → Asignar un profesional a un atleta sin equipo { atletaId, profesionalId }
 * DELETE /api/equipos/asignaciones/:atletaId/:profesionalId → Quitar la asignación
 */
const router = require('express').Router();
const ctrl   = require('./equipos.controller');
const { requireRol } = require('../../compartido/middleware/roles');

const admin = requireRol('Administrador');

router.get('/mios',    ctrl.getMios);
router.post('/unirse', ctrl.postUnirse);

router.post('/asignaciones',                              admin, ctrl.postAsignacion);
router.delete('/asignaciones/:atletaId/:profesionalId',   admin, ctrl.deleteAsignacion);

router.get('/',                         admin, ctrl.getEquipos);
router.post('/',                        admin, ctrl.postEquipo);
router.put('/:id',                      admin, ctrl.putEquipo);
router.delete('/:id',                   admin, ctrl.deleteEquipo);
router.post('/:id/codigo',              admin, ctrl.postCodigo);
router.post('/:id/miembros',            admin, ctrl.postMiembro);
router.delete('/:id/miembros/:userId',  admin, ctrl.deleteMiembro);

module.exports = router;
