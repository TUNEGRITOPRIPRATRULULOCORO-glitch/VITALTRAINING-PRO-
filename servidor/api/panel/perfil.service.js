const { query } = require('../../../base-de-datos/db');
const usuarios = require('../usuarios');
const { edadDesde } = require('./ficha');
const { DEPORTES, DIAS_SEMANA, ESTILOS_BOXEO } = require('../../compartido/deportes');

// Día de la semana con partido o competición; "Ninguno" si no compite
const DIAS_PARTIDO = [...DIAS_SEMANA, 'Ninguno'];

// Parte del usuario (registro) y completa con Mi Perfil; ver ficha.js
async function obtenerPerfil(userId) {
  const { rows } = await query(
    `SELECT u.id AS "userId", p.id,
            COALESCE(p.nombre, u.nombre) AS nombre,
            p.edad,
            COALESCE(p.peso, u.peso) AS peso,
            COALESCE(p.altura, u.altura) AS altura,
            COALESCE(p.posicion, u.posicion) AS posicion,
            p.sexo,
            p.dia_partido AS "diaPartido",
            u.fecha_nacimiento AS "fechaNacimiento",
            u.deporte_principal AS "deportePrincipal",
            u.estilo,
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
    `INSERT INTO perfiles (user_id, nombre, edad, peso, altura, posicion, sexo, dia_partido)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (user_id) DO UPDATE SET
       nombre   = COALESCE(EXCLUDED.nombre,   perfiles.nombre),
       edad     = COALESCE(EXCLUDED.edad,     perfiles.edad),
       peso     = COALESCE(EXCLUDED.peso,     perfiles.peso),
       altura   = COALESCE(EXCLUDED.altura,   perfiles.altura),
       posicion = COALESCE(EXCLUDED.posicion, perfiles.posicion),
       sexo     = COALESCE(EXCLUDED.sexo,     perfiles.sexo),
       dia_partido = COALESCE(EXCLUDED.dia_partido, perfiles.dia_partido),
       updated_at = NOW()
     RETURNING id, user_id AS "userId", nombre, edad, peso, altura, posicion, sexo, dia_partido AS "diaPartido", updated_at AS "updatedAt"`,
    [userId, datos.nombre || null, datos.edad || null, datos.peso || null, datos.altura || null, datos.posicion || null,
     ['Hombre', 'Mujer', 'Prefiero no decirlo'].includes(datos.sexo) ? datos.sexo : null,
     DIAS_PARTIDO.includes(datos.diaPartido) ? datos.diaPartido : null]
  );

  const perfil = rows[0];
  // Boxeo: el estilo de pelea cambia la rutina (se guarda en la cuenta, como el deporte)
  if (ESTILOS_BOXEO.includes(datos.estilo)) {
    await query('UPDATE usuarios SET estilo = $1 WHERE id = $2', [datos.estilo, userId]);
    perfil.estilo = datos.estilo;
  }
  if (DEPORTES.includes(datos.deportePrincipal)) {
    const deporte = await usuarios.actualizarDeporte(userId, datos.deportePrincipal);
    perfil.deportePrincipal = deporte || datos.deportePrincipal;
  }

  return perfil;
}

module.exports = { obtenerPerfil, actualizarPerfil };