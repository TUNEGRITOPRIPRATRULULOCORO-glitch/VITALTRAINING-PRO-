const { query } = require('../../../base-de-datos/db');
const panel = require('../panel');

async function listar(userId) {
  const { rows } = await query(
    `SELECT id, user_id AS "userId", fecha, fatiga, sueno, recuperacion, notas, created_at AS "createdAt"
     FROM salud WHERE user_id = $1 ORDER BY fecha DESC, created_at DESC`,
    [userId]
  );
  return rows;
}

function clamp(val, def) {
  const n = Number(val);
  if (!val && val !== 0) return def;
  if (n < 1 || n > 10) throw Object.assign(new Error('Los valores de fatiga, sueño y recuperación deben estar entre 1 y 10.'), { status: 400 });
  return n;
}

function validarFecha(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw Object.assign(new Error('Formato de fecha inválido. Usa YYYY-MM-DD.'), { status: 400 });
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) throw Object.assign(new Error('Fecha inválida.'), { status: 400 });
  const hoy = new Date().toISOString().slice(0, 10);
  if (fecha > hoy) throw Object.assign(new Error('No puedes registrar salud en una fecha futura.'), { status: 400 });
}

async function crear(userId, datos) {
  const hoy          = datos.fecha || new Date().toISOString().slice(0, 10);
  if (datos.fecha) validarFecha(datos.fecha);
  const fatiga       = clamp(datos.fatiga,       5);
  const sueno        = clamp(datos.sueno,        7);
  const recuperacion = clamp(datos.recuperacion, 5);

  const { rows: existe } = await query(
    'SELECT id FROM salud WHERE user_id = $1 AND fecha = $2',
    [userId, hoy]
  );
  if (existe.length > 0) throw Object.assign(new Error('Ya registraste tu salud hoy.'), { status: 409 });

  const { rows } = await query(
    `INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion, notas)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, user_id AS "userId", fecha, fatiga, sueno, recuperacion, notas, created_at AS "createdAt"`,
    [userId, hoy, fatiga, sueno, recuperacion, datos.notas || '']
  );
  const registro = rows[0];

  const fecha = new Date().toLocaleDateString('es-CO');
  for (const p of problemasDe({ fatiga, sueno, recuperacion }))
    await panel.crearAlerta(userId, p.tipo, p.mensaje, fecha);

  return registro;
}

/**
 * Valores de salud que merecen una alerta (en la app para el atleta y por correo al equipo médico).
 * resumen: texto corto para el correo a los médicos.
 */
function problemasDe({ fatiga, sueno, recuperacion }) {
  const problemas = [];
  if (fatiga >= 8)
    problemas.push({ tipo: 'fatiga', resumen: `Fatiga alta (${fatiga}/10)`, mensaje: `Fatiga alta detectada (${fatiga}/10). Considera un día de recuperación.` });
  if (recuperacion <= 3)
    problemas.push({ tipo: 'recuperacion', resumen: `Recuperación baja (${recuperacion}/10)`, mensaje: `Recuperación baja (${recuperacion}/10). Revisa tu descanso y alimentación.` });
  if (sueno <= 4)
    problemas.push({ tipo: 'sueno', resumen: `Sueño insuficiente (${sueno}/10)`, mensaje: `Sueño insuficiente (${sueno}/10). El descanso es clave para el rendimiento.` });
  return problemas;
}

module.exports = { listar, crear, problemasDe };