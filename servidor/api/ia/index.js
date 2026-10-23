/**
 * Módulo IA — asistente basado en el perfil del atleta + contexto para n8n.
 * Tablas propias: ia_mensajes (conversación con el asistente). El resto, solo lectura.
 */
module.exports = {
  router: require('./ia.routes'),
};
