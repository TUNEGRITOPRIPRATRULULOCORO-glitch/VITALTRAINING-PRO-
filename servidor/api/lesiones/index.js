/**
 * Módulo LESIONES — lesiones, estado médico (apto / en recuperación / baja) y notas clínicas.
 * Tablas propias: lesiones, notas_clinicas
 */
const svc = require('./lesiones.service');

module.exports = {
  router:    require('./lesiones.routes'),
  estadosDe: svc.estadosDe,   // ([userIds]) → { [id]: { estado, etiqueta, mensaje, zonas, activas, periodos } }
  estadoDe:  svc.estadoDe,    // (userId) → lo mismo para un atleta
};
