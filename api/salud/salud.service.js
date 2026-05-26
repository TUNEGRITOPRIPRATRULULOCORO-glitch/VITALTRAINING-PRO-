const { query } = require('../../data/db');

async function listar(userId) {
  const { rows } = await query(
    `SELECT id, user_id AS "userId", fecha, fatiga, sueno, recuperacion, notas, created_at AS "createdAt"
     FROM salud WHERE user_id = $1 ORDER BY created_at DESC`,
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
  if (isNaN(d.getTime())) throw Object.assign(new Error('Fecha inválida.'), { status: 400 });
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
  if (fatiga >= 8) {
    await query(
      `INSERT INTO alertas (user_id, tipo, mensaje, leida, fecha) VALUES ($1,'fatiga',$2,false,$3)`,
      [userId, `Fatiga alta detectada (${fatiga}/10). Considera un día de recuperación.`, fecha]
    );
  }
  if (recuperacion <= 3) {
    await query(
      `INSERT INTO alertas (user_id, tipo, mensaje, leida, fecha) VALUES ($1,'recuperacion',$2,false,$3)`,
      [userId, `Recuperación baja (${recuperacion}/10). Revisa tu descanso y alimentación.`, fecha]
    );
  }
  if (sueno <= 4) {
    await query(
      `INSERT INTO alertas (user_id, tipo, mensaje, leida, fecha) VALUES ($1,'sueno',$2,false,$3)`,
      [userId, `Sueño insuficiente (${sueno}/10). El descanso es clave para el rendimiento.`, fecha]
    );
  }

  return registro;
}

module.exports = { listar, crear };