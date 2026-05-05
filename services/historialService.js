/**
 * services/historialService.js
 * 
 * Retorna el historial completo (con filtros opcionales) de cada módulo.
 * Pensado para paginación futura: los parámetros page/limit ya están
 * estructurados para que el controller los reciba desde query params.
 */

const { comidas, rutinas, alertas } = require('../data/store');

function historialComidas(userId, { page = 1, limit = 10 } = {}) {
  const todas = comidas
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return paginar(todas, page, limit);
}

function historialRutinas(userId, { page = 1, limit = 10 } = {}) {
  const todas = rutinas
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return paginar(todas, page, limit);
}

function historialAlertas(userId, { page = 1, limit = 10 } = {}) {
  const todas = alertas
    .filter(a => a.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return paginar(todas, page, limit);
}

// Helper: simula paginación sobre arrays (fácil de reemplazar por OFFSET/LIMIT en DB)
function paginar(items, page, limit) {
  const total = items.length;
  const inicio = (page - 1) * limit;
  const datos = items.slice(inicio, inicio + limit);
  return {
    datos,
    total,
    pagina: Number(page),
    totalPaginas: Math.ceil(total / limit)
  };
}

module.exports = { historialComidas, historialRutinas, historialAlertas };