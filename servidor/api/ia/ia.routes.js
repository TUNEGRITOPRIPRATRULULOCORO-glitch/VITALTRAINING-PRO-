/**
 * GET    /api/ia/:userId/consulta?tipo=...  → Análisis fijo (lo usa también el modo básico del chat)
 * GET    /api/ia/:userId/chat               → Conversación guardada con el asistente
 * POST   /api/ia/:userId/chat { mensaje }   → Enviar un mensaje y recibir la respuesta
 * DELETE /api/ia/:userId/chat               → Empezar una conversación nueva
 */
const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('./ia.controller');
const { requireOwnerOrRol } = require('../../compartido/middleware/roles');
const n8nContextController = require('./n8nContext.controller');

router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista'));
router.get('/:userId/consulta', ctrl.getConsulta);

// Cada mensaje con Claude cuesta dinero: límite por persona (no por IP)
const limiteChat = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: req => `usuario-${req.user.id}`,
  message: { error: 'Has enviado muchos mensajes seguidos. Espera unos minutos y seguimos. 🙂' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.get('/:userId/chat', ctrl.getChat);
router.post('/:userId/chat', limiteChat, ctrl.postChat);
router.delete('/:userId/chat', ctrl.deleteChat);

// Ruta pública para n8n — usa "uid" en vez de "userId" para no disparar el router.param de arriba
router.get('/n8n-contexto/:uid', n8nContextController.getContextoUsuario);

module.exports = router;