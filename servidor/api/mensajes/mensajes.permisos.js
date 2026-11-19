/**
 * Quién puede escribirle a quién.
 * - Atletas ↔ nutricionistas, médicos y entrenadores (canal directo).
 * - Nutricionistas ↔ médicos.
 * - Nutricionistas y médicos ↔ administración.
 * - Administración → atletas: avisos que el atleta lee (y le llegan al celular y al reloj),
 *   pero no responde por chat: los atletas escriben a administración por ticket de soporte.
 */
const PUEDE_ESCRIBIR_A = {
  Atleta:        ['Nutricionista', 'Medico', 'Entrenador'],
  Nutricionista: ['Atleta', 'Medico', 'Entrenador', 'Administrador'],
  Medico:        ['Atleta', 'Nutricionista', 'Entrenador', 'Administrador'],
  Entrenador:    ['Atleta', 'Nutricionista', 'Medico', 'Administrador'],
  Administrador: ['Nutricionista', 'Medico', 'Entrenador', 'Atleta'],
};

const ALIAS = { Futbolista: 'Atleta', 'Médico': 'Medico' };

// Cómo puede estar guardado cada rol en la tabla usuarios
const ROLES_GUARDADOS = { Atleta: ['Atleta', 'Futbolista'], Medico: ['Medico', 'Médico'] };

function normalizarRol(rol) {
  return ALIAS[rol] || rol;
}

function puedeEscribir(rolRemitente, rolDestinatario) {
  const permitidos = PUEDE_ESCRIBIR_A[normalizarRol(rolRemitente)] || [];
  return permitidos.includes(normalizarRol(rolDestinatario));
}

/** Puede ver la conversación si cualquiera de los dos puede escribirle al otro. */
function puedeLeer(rolA, rolB) {
  return puedeEscribir(rolA, rolB) || puedeEscribir(rolB, rolA);
}

const guardados = roles => roles.flatMap(r => ROLES_GUARDADOS[r] || [r]);

/** Roles, tal como están guardados en la base, con los que puede hablar un rol. */
function rolesContactables(rol) {
  return guardados(PUEDE_ESCRIBIR_A[normalizarRol(rol)] || []);
}

/** Roles que le pueden escribir a este rol aunque él no pueda contestarles (solo lectura). */
function rolesSoloLectura(rol) {
  const propio = normalizarRol(rol);
  const escribe = PUEDE_ESCRIBIR_A[propio] || [];
  return guardados(Object.keys(PUEDE_ESCRIBIR_A).filter(r => !escribe.includes(r) && PUEDE_ESCRIBIR_A[r].includes(propio)));
}

module.exports = { PUEDE_ESCRIBIR_A, normalizarRol, puedeEscribir, puedeLeer, rolesContactables, rolesSoloLectura };
