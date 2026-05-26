const { query } = require('../../data/db');

async function obtenerPerfil(userId) {
  const { rows } = await query(
    'SELECT id, user_id AS "userId", nombre, edad, peso, altura, posicion, updated_at AS "updatedAt" FROM perfiles WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
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
  return rows[0];
}

module.exports = { obtenerPerfil, actualizarPerfil };