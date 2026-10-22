/**
 * GET  /api/mensajes/contactos   → Personas con las que puedo hablar (+ último mensaje y no leídos)
 * GET  /api/mensajes/no-leidos   → Mensajes sin leer, total y por rol del remitente
 * GET  /api/mensajes/:otroId     → Conversación con una persona (marca como leídos)
 * POST /api/mensajes/:otroId     → Enviar mensaje { texto }
 * Quién puede hablar con quién: mensajes.permisos.js
 */
const router = require('express').Router();
const ctrl   = require('./mensajes.controller');

router.get('/contactos', ctrl.getContactos);
router.get('/no-leidos', ctrl.getNoLeidos);
router.get('/:otroId',   ctrl.getConversacion);
router.post('/:otroId',  ctrl.postMensaje);

module.exports = router;
