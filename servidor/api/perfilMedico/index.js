/**
 * Módulo PERFIL MÉDICO — onboarding, plan alimenticio y rutina semanal.
 * Tablas propias: perfiles_medicos
 */
const svc = require('./perfilMedico.service');

/** Ficha deportiva y plan actual (rutina y comidas al día con la ficha), o plan null si no hizo el perfil médico. */
async function planActual(userId) {
  const ficha = await svc.obtenerFicha(userId);
  const perfil = await svc.obtener(userId);
  return { ficha, plan: perfil ? await svc.refrescarPlanes(userId, perfil, ficha) : null };
}

module.exports = {
  router: require('./perfilMedico.routes'),
  planActual,
};
