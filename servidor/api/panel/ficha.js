/**
 * Ficha deportiva del atleta.
 * Los datos están en dos sitios: lo que puso al registrarse (tabla usuarios) y lo que
 * guardó después en "Mi Perfil" (tabla perfiles). Gana Mi Perfil; si falta algo, se usa
 * el registro. Así nutricionista, médico y el propio atleta ven siempre lo mismo.
 */

/** Años cumplidos a partir de la fecha de nacimiento, o null. */
function edadDesde(fechaNacimiento, hoy = new Date()) {
  if (!fechaNacimiento) return null;
  const n = new Date(fechaNacimiento);
  if (Number.isNaN(n.getTime())) return null;
  let edad = hoy.getUTCFullYear() - n.getUTCFullYear();
  const yaCumplio = hoy.getUTCMonth() > n.getUTCMonth() ||
    (hoy.getUTCMonth() === n.getUTCMonth() && hoy.getUTCDate() >= n.getUTCDate());
  if (!yaCumplio) edad--;
  return edad >= 0 && edad < 120 ? edad : null;
}

// 0, '' o null significan "sin dato" (el formulario guarda 0 cuando el campo queda vacío)
function numero(v) {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) || n <= 0 ? null : n;
}

function fichaDeportiva(usuario = {}, perfil = null) {
  const p = perfil || {};
  return {
    deporte:     usuario.deporte_principal || 'Fútbol',
    posicion:    p.posicion || usuario.posicion || null, // en tenis es la especialidad
    peso:        numero(p.peso) ?? numero(usuario.peso),
    altura:      numero(p.altura) ?? numero(usuario.altura),
    edad:        numero(p.edad) ?? edadDesde(usuario.fecha_nacimiento),
    lateralidad: usuario.pie || null,                    // pie o mano dominante según el deporte
    frecuencia:  usuario.frecuencia || null,
    sexo:        p.sexo || null,                         // para calcular calorías (opcional)
    objetivo:    usuario.objetivo || null
  };
}

module.exports = { fichaDeportiva, edadDesde };
