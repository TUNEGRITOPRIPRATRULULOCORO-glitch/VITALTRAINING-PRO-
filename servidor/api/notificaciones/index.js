/**
 * Módulo NOTIFICACIONES — avisos en el celular (Web Push): alertas, mensajes y recordatorio diario.
 * Tablas propias: push_suscripciones (un dispositivo por fila), push_claves (claves VAPID generadas)
 */
const svc = require('./notificaciones.service');
const rutas = require('./notificaciones.routes');

module.exports = {
  router: rutas.router,
  cronRouter: rutas.cron,              // sin sesión, protegido con CRON_SECRET
  enviar: svc.enviar,                  // (userId, { titulo, cuerpo, url?, etiqueta? }) → nunca lanza
  avisoDeAlerta: svc.avisoDeAlerta,    // (tipo, mensaje) → aviso con su título
};
