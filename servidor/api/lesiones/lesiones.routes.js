/**
 * GET    /api/lesiones/catalogos             → Zonas, tipos, gravedades y restricciones
 * GET    /api/lesiones/:userId               → Estado médico, lesiones activas, historial y notas clínicas
 * POST   /api/lesiones/:userId               → Registrar lesión { zona, tipo, gravedad, restriccion?, fechaInicio?, altaEstimada?, indicaciones? }
 * PUT    /api/lesiones/:userId/:id           → Cambiar restricción, gravedad, alta estimada o indicaciones
 * POST   /api/lesiones/:userId/:id/alta      → Dar el alta { fecha? }
 * DELETE /api/lesiones/:userId/:id           → Borrar una lesión registrada por error
 * POST   /api/lesiones/:userId/notas         → Nota clínica { texto, visibleAtleta? }
 * DELETE /api/lesiones/:userId/notas/:id     → Borrar una nota propia
 *
 * Consultan: el propio atleta, médico, nutricionista y admin (las notas clínicas solo el médico y el atleta).
 * Registran y editan: solo el médico.
 */
const router = require('express').Router();
const ctrl   = require('./lesiones.controller');
const { requireRol } = require('../../compartido/middleware/roles');
const { accesoAtleta } = require('../equipos');

const medico = requireRol('Medico', 'Médico');

router.get('/catalogos',                 ctrl.getCatalogos);
// Para cualquier ruta con :userId, el profesional tiene que compartir equipo con el atleta
router.param('userId', accesoAtleta('Medico', 'Médico', 'Nutricionista', 'Administrador'));
router.get('/:userId',                   ctrl.getExpediente);
router.post('/:userId',                  medico,   ctrl.postLesion);
router.post('/:userId/notas',            medico,   ctrl.postNota);
router.delete('/:userId/notas/:id',      medico,   ctrl.deleteNota);
router.put('/:userId/:id',               medico,   ctrl.putLesion);
router.post('/:userId/:id/alta',         medico,   ctrl.postAlta);
router.delete('/:userId/:id',            medico,   ctrl.deleteLesion);

module.exports = router;
