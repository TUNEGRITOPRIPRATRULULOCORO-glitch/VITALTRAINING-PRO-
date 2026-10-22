const { query } = require('../../../base-de-datos/db');
const usuarios = require('../usuarios');
const { edadDesde } = require('./ficha');

// Parte del usuario (registro) y completa con Mi Perfil; ver ficha.js
async function obtenerPerfil(userId) {
  const { rows } = await query(
    `SELECT u.id AS "userId", p.id,
            COALESCE(p.nombre, u.nombre) AS nombre,
            p.edad,
            COALESCE(p.peso, u.peso) AS peso,
            COALESCE(p.altura, u.altura) AS altura,
            COALESCE(p.posicion, u.posicion) AS posicion,
            u.fecha_nacimiento AS "fechaNacimiento",
            u.deporte_principal AS "deportePrincipal",
            p.updated_at AS "updatedAt"
     FROM usuarios u
     LEFT JOIN perfiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const perfil = rows[0];
  if (!perfil) return null;
  if (!Number(perfil.edad)) perfil.edad = edadDesde(perfil.fechaNacimiento);
  return perfil;
}

async function actualizarPerfil(userId, datos) {
  const { rows } = await query(
    `INSERT INTO perfiles (user_id, nombre, edad, peso, altura, posicion)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET
       nombre   = COALESCE(EXCLUDED.nombre,   perfiles.nombre),
       edad     = COALESCE(EXCLUDED.edad,     perfiles.edad),
       peso     = COALESCE(EXCLUDED.peso,     perfiles.peso),
       altura   = COALESCE(EXCLUDED.altura,   perfiles.altura),
       posicion = COALESCE(EXCLUDED.posicion, perfiles.posicion),
       updated_at = NOW()
     RETURNING id, user_id AS "userId", nombre, edad, peso, altura, posicion, updated_at AS "updatedAt"`,
    [userId, datos.nombre || null, datos.edad || null, datos.peso || null, datos.altura || null, datos.posicion || null]
  );

  const perfil = rows[0];
  if (datos.deportePrincipal) {
    const deporte = await usuarios.actualizarDeporte(userId, datos.deportePrincipal);
    perfil.deportePrincipal = deporte || datos.deportePrincipal;
  }

  return perfil;
}

module.exports = { obtenerPerfil, actualizarPerfil };