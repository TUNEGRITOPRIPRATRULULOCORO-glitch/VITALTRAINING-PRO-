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

  const [salud, rutinas, cumplimiento, planes, lesiones] = await Promise.all([
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
    ),
    require('../lesiones').estadosDe(userIds)
  ]);

  const porUsuario = Object.fromEntries(userIds.map(id => [String(id), { salud: [], sesiones: [], cumplimiento: [], plan: null, lesion: lesiones[String(id)] }]));
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

/** Lo que se muestra del estado médico (sin el detalle interno de los periodos). */
function resumirEstado(lesion) {
  if (!lesion) return { estado: 'apto', etiqueta: 'Apto', zonas: [], activas: [] };
  const { estado, etiqueta, mensaje, zonas, activas } = lesion;
  return {
    estado, etiqueta, mensaje, zonas,
    activas: activas.map(l => ({ zona: l.zona, tipo: l.tipo, gravedad: l.gravedad, restriccion: l.restriccion,
      fechaInicio: l.fechaInicio, altaEstimada: l.altaEstimada, indicaciones: l.indicaciones })),
  };
}

function construirResumen(datos, hoy) {
  const saludHoy = datos.salud.find(s => calc.aFechaISO(s.fecha) === hoy) || null;
  const carga = calc.calcularCarga(datos.sesiones, hoy);
  return {
    fecha: hoy,
    listo: calc.calcularListo(saludHoy, carga.riesgo, datos.lesion),
    carga,
    cumplimiento: calc.calcularCumplimiento(
      datos.plan?.rutina_semanal, datos.cumplimiento, hoy, datos.plan?.creado_en, datos.lesion?.periodos
    ),
    estadoMedico: resumirEstado(datos.lesion),
    racha: calc.calcularRacha(datos.salud.map(s => s.fecha), hoy)
  };
}

async function obtenerResumen(userId) {
  const hoy = hoyISO();
  const datos = await leerDatos([Number(userId)], hoy);
  return construirResumen(datos[String(userId)], hoy);
}

/** Vista de equipo para médico, nutricionista y admin: un resumen corto por atleta activo que puede ver. */
async function obtenerEquipo(usuario) {
  const { rows: todos } = await query(
    `SELECT id, nombre, email FROM usuarios
     WHERE rol IN ('Atleta', 'Futbolista') AND estado = 'Activo'
     ORDER BY nombre`
  );
  const atletas = await require('../equipos').filtrarAtletas(usuario, todos);
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
      estadoMedico: { estado: r.estadoMedico.estado, etiqueta: r.estadoMedico.etiqueta, zonas: r.estadoMedico.zonas },
      racha: r.racha
    };
  });
}

module.exports = { obtenerResumen, obtenerEquipo };
