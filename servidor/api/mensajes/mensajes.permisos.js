/**
 * Quién puede escribirle a quién.
 * - Atletas ↔ nutricionistas, médicos y entrenadores (canal directo).
 * - Nutricionistas ↔ médicos.
 * - Nutricionistas y médicos ↔ administración.
 * - Atletas → administración NO por chat: van por ticket a la bandeja de soporte.
 */
const PUEDE_ESCRIBIR_A = {
  Atleta:        ['Nutricionista', 'Medico', 'Entrenador'],
  Nutricionista: ['Atleta', 'Medico', 'Entrenador', 'Administrador'],
  Medico:        ['Atleta', 'Nutricionista', 'Entrenador', 'Administrador'],
  Entrenador:    ['Atleta', 'Nutricionista', 'Medico', 'Administrador'],
  Administrador: ['Nutricionista', 'Medico', 'Entrenador'],
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

/** Roles, tal como están guardados en la base, con los que puede hablar un rol. */
function rolesContactables(rol) {
  const destinos = PUEDE_ESCRIBIR_A[normalizarRol(rol)] || [];
  return destinos.flatMap(r => ROLES_GUARDADOS[r] || [r]);
}

module.exports = { PUEDE_ESCRIBIR_A, normalizarRol, puedeEscribir, rolesContactables };
