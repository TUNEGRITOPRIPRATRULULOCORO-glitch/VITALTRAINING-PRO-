const { query } = require('../../data/db');

const LIMITE = 3;

async function obtenerResumen(userId) {
  const [perfilR, comidasR, rutinasR, alertasR] = await Promise.all([
    query(
      'SELECT id, user_id AS "userId", nombre, edad, peso, altura, posicion FROM perfiles WHERE user_id = $1',
      [userId]
    ),
    query(
      `SELECT id, user_id AS "userId", nombre, tipo, calorias, fecha, created_at AS "createdAt"
       FROM comidas WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, LIMITE]
    ),
    query(
      `SELECT id, user_id AS "userId", nombre, tipo, duracion_minutos AS "duracionMinutos", fecha, created_at AS "createdAt"
       FROM rutinas WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, LIMITE]
    ),
    query(
      `SELECT id, user_id AS "userId", tipo, mensaje, leida, fecha, created_at AS "createdAt"
       FROM alertas WHERE user_id = $1 ORDER BY leida ASC, created_at DESC LIMIT $2`,
      [userId, LIMITE]
    )
  ]);

  return {
    perfil:           perfilR.rows[0]  || null,
    ultimasComidas:   comidasR.rows,
    ultimasRutinas:   rutinasR.rows,
    alertasRecientes: alertasR.rows,
    generadoEn:       new Date().toISOString()
  };
}

module.exports = { obtenerResumen };