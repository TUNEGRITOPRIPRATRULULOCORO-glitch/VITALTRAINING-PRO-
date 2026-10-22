const { query } = require('../../../base-de-datos/db');
const { hoyISO, sumarDias, aFechaISO } = require('../../compartido/fechas');

const LIMITE = 3;

async function obtenerResumen(userId) {
  const hoy = hoyISO();
  const haceUnaSemana = sumarDias(hoy, -6);
  const [perfilR, comidasR, rutinasR, alertasR, comidasHoyR, rutinasSemanaR, sesionesSemanaR, sinLeerR] = await Promise.all([
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
    ),
    // Datos para las tarjetas de resumen
    query('SELECT calorias FROM comidas WHERE user_id = $1 AND fecha = $2', [userId, hoy]),
    query('SELECT fecha FROM rutinas WHERE user_id = $1 AND fecha >= $2', [userId, haceUnaSemana]),
    query('SELECT fecha FROM cumplimiento WHERE user_id = $1 AND fecha >= $2', [userId, haceUnaSemana]),
    query('SELECT COUNT(*) AS total FROM alertas WHERE user_id = $1 AND leida = false', [userId])
  ]);

  // Un día con sesión del plan y rutina manual cuenta como un solo día entrenado
  const diasEntrenados = new Set([...rutinasSemanaR.rows, ...sesionesSemanaR.rows].map(r => aFechaISO(r.fecha)));

  return {
    perfil:           perfilR.rows[0]  || null,
    ultimasComidas:   comidasR.rows,
    ultimasRutinas:   rutinasR.rows,
    alertasRecientes: alertasR.rows,
    hoy: {
      comidas:           comidasHoyR.rows.length,
      calorias:          comidasHoyR.rows.reduce((t, c) => t + (Number(c.calorias) || 0), 0),
      diasEntrenadosSemana: diasEntrenados.size,
      alertasSinLeer:    Number(sinLeerR.rows[0]?.total || 0)
    },
    generadoEn:       new Date().toISOString()
  };
}

module.exports = { obtenerResumen };