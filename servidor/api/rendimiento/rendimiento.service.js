const { query } = require('../../../base-de-datos/db');
const calc = require('./rendimiento.calculos');
const { hoyISO } = require('../../compartido/fechas');

// La racha puede ir más atrás que la ventana de 28 días
const DIAS_HISTORIAL_SALUD = 90;

/** Lee en 4 consultas los datos de todos los usuarios pedidos y los agrupa por usuario. */
async function leerDatos(userIds, hoy) {
  const desdeCarga = calc.sumarDias(hoy, -(calc.VENTANA_DIAS - 1));
  const desdeSalud = calc.sumarDias(hoy, -DIAS_HISTORIAL_SALUD);

  // IN ($1,$2,...) en vez de ANY($1): pg-mem no devuelve filas con ANY sobre columnas con índice único
  const ids = userIds.map((_, i) => `$${i + 1}`).join(', ');
  const desde = `$${userIds.length + 1}`;

  const [salud, rutinas, cumplimiento, planes] = await Promise.all([
    query(
      `SELECT user_id, fecha, fatiga, sueno, recuperacion FROM salud
       WHERE user_id IN (${ids}) AND fecha >= ${desde}`,
      [...userIds, desdeSalud]
    ),
    query(
      `SELECT user_id, fecha, duracion_minutos, intensidad, rpe FROM rutinas
       WHERE user_id IN (${ids}) AND fecha >= ${desde}`,
      [...userIds, desdeCarga]
    ),
    query(
      `SELECT user_id, fecha, estado, rpe, duracion_minutos FROM cumplimiento
       WHERE user_id IN (${ids}) AND fecha >= ${desde}`,
      [...userIds, desdeCarga]
    ),
    query(
      `SELECT user_id, rutina_semanal, creado_en FROM perfiles_medicos WHERE user_id IN (${ids})`,
      userIds
    )
  ]);

  const porUsuario = Object.fromEntries(userIds.map(id => [String(id), { salud: [], sesiones: [], cumplimiento: [], plan: null }]));
  const de = row => porUsuario[String(row.user_id)];

  salud.rows.forEach(r => de(r)?.salud.push(r));
  rutinas.rows.forEach(r => de(r)?.sesiones.push({
    fecha: r.fecha, minutos: r.duracion_minutos, rpe: r.rpe, intensidad: r.intensidad
  }));
  cumplimiento.rows.forEach(r => {
    de(r)?.cumplimiento.push(r);
    de(r)?.sesiones.push({ fecha: r.fecha, minutos: r.duracion_minutos, rpe: r.rpe });
  });
  planes.rows.forEach(r => { if (de(r)) de(r).plan = r; });

  return porUsuario;
}

function construirResumen(datos, hoy) {
  const saludHoy = datos.salud.find(s => calc.aFechaISO(s.fecha) === hoy) || null;
  const carga = calc.calcularCarga(datos.sesiones, hoy);
  return {
    fecha: hoy,
    listo: calc.calcularListo(saludHoy, carga.riesgo),
    carga,
    cumplimiento: calc.calcularCumplimiento(
      datos.plan?.rutina_semanal, datos.cumplimiento, hoy, datos.plan?.creado_en
    ),
    racha: calc.calcularRacha(datos.salud.map(s => s.fecha), hoy)
  };
}

async function obtenerResumen(userId) {
  const hoy = hoyISO();
  const datos = await leerDatos([Number(userId)], hoy);
  return construirResumen(datos[String(userId)], hoy);
}

/** Vista de equipo para médico, nutricionista y admin: un resumen corto por atleta activo. */
async function obtenerEquipo() {
  const { rows: atletas } = await query(
    `SELECT id, nombre, email FROM usuarios
     WHERE rol IN ('Atleta', 'Futbolista') AND estado = 'Activo'
     ORDER BY nombre`
  );
  if (!atletas.length) return [];

  const hoy = hoyISO();
  const datos = await leerDatos(atletas.map(a => Number(a.id)), hoy);

  return atletas.map(a => {
    const r = construirResumen(datos[String(a.id)], hoy);
    return {
      id: Number(a.id),
      nombre: a.nombre,
      email: a.email,
      listo: r.listo,
      carga: { ratio: r.carga.ratio, riesgo: r.carga.riesgo },
      cumplimiento: { porcentaje: r.cumplimiento.porcentaje },
      racha: r.racha
    };
  });
}

module.exports = { obtenerResumen, obtenerEquipo };
