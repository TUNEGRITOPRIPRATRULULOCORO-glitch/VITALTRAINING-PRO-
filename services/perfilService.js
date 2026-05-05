/**
 * services/perfilService.js
 */

const { perfiles } = require('../data/store');

function obtenerPerfil(userId) {
  return perfiles.find(p => p.userId === userId) || null;
}

function actualizarPerfil(userId, datos) {
  const idx = perfiles.findIndex(p => p.userId === userId);

  if (idx === -1) {
    // Si no existe, lo crea
    const nuevo = {
      userId,
      nombre:   datos.nombre   || '',
      edad:     datos.edad     || null,
      peso:     datos.peso     || null,
      altura:   datos.altura   || null,
      posicion: datos.posicion || '',
      updatedAt: new Date().toISOString()
    };
    perfiles.push(nuevo);
    return nuevo;
  }

  // Si existe, lo actualiza
  perfiles[idx] = {
    ...perfiles[idx],
    ...datos,
    userId,
    updatedAt: new Date().toISOString()
  };

  return perfiles[idx];
}

module.exports = { obtenerPerfil, actualizarPerfil };