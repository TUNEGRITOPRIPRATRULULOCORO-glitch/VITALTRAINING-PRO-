/**
 * services/dashboardService.js
 * 
 * Agrega datos de todos los módulos para el resumen del panel.
 * Este es el único servicio que "sabe" de los demás módulos.
 * 
 * Para migrar a DB: cambia cada operación de array por una
 * query con LIMIT/ORDER BY. La interfaz del objeto retornado no cambia.
 */

const { perfiles, comidas, rutinas, alertas } = require('../data/store');

const LIMITE_RESUMEN = 3; // cuántos registros recientes mostrar

function obtenerResumen(userId) {
  const perfil = perfiles.find(p => p.userId === userId) || null;

  // Últimas N comidas del usuario, ordenadas por fecha desc
  const ultimasComidas = comidas
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, LIMITE_RESUMEN);

  // Últimas N rutinas
  const ultimasRutinas = rutinas
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, LIMITE_RESUMEN);

  // Alertas recientes (no leídas primero)
  const alertasRecientes = alertas
    .filter(a => a.userId === userId)
    .sort((a, b) => a.leida - b.leida || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, LIMITE_RESUMEN);

  return {
    perfil,
    ultimasComidas,
    ultimasRutinas,
    alertasRecientes,
    generadoEn: new Date().toISOString()
  };
}

module.exports = { obtenerResumen };