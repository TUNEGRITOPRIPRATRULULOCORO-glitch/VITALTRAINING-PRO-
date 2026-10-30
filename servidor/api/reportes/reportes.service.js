const { query } = require('../../../base-de-datos/db');
const { hoyISO, aFechaISO, ultimosDias } = require('../../compartido/fechas');

// Consultas simples y conteo en JavaScript: así funciona igual en PostgreSQL y en
// pg-mem (la base en memoria de desarrollo), que no soporta FILTER, LATERAL ni generate_series.

const ES_ATLETA = rol => rol === 'Atleta' || rol === 'Futbolista';
const ES_MEDICO = rol => rol === 'Medico' || rol === 'Médico';
const DIAS_ACTIVIDAD = 7;

function sumar(filas, condicion) {
  return filas.filter(condicion).reduce((total, f) => total + Number(f.total), 0);
}

function contarPorDia(filas, dias) {
  const cuenta = Object.fromEntries(dias.map(d => [d, 0]));
  for (const f of filas) {
    const dia = aFechaISO(f.fecha);
    if (dia in cuenta) cuenta[dia] += Number(f.total);
  }
  return cuenta;
}

/** Última fatiga registrada de cada atleta activo (solo los que tienen algún registro). */
async function fatigaActual(atletas) {
  if (!atletas.length) return [];
  const ids = atletas.map(a => a.id);
  const { rows } = await query(
    `SELECT user_id, fatiga FROM salud
     WHERE user_id IN (${ids.map((_, i) => `$${i + 1}`).join(', ')})
     ORDER BY created_at DESC, id DESC`,
    ids
  );
  const ultima = {};
  for (const r of rows) if (!(r.user_id in ultima)) ultima[r.user_id] = r.fatiga;
  return atletas
    .filter(a => a.id in ultima)
    .map(a => ({ nombre: a.nombre.split(' ')[0], fatiga: ultima[a.id] }));
}

async function obtenerReporte() {
  const dias = ultimosDias(hoyISO(), DIAS_ACTIVIDAD);
  const desde = dias[0];

  const [usuariosR, incidenciasR, totalComidasR, totalRutinasR, totalSaludR, atletasR, comidasDiaR, rutinasDiaR, saludDiaR] = await Promise.all([
    query('SELECT rol, estado, COUNT(*) AS total FROM usuarios GROUP BY rol, estado'),
    query('SELECT estado, prioridad, COUNT(*) AS total FROM incidencias GROUP BY estado, prioridad'),
    query('SELECT COUNT(*) AS total FROM comidas'),
    query('SELECT COUNT(*) AS total FROM rutinas'),
    query('SELECT COUNT(*) AS total FROM salud'),
    query("SELECT id, nombre FROM usuarios WHERE rol IN ('Atleta', 'Futbolista') AND estado = 'Activo'"),
    query('SELECT fecha, COUNT(*) AS total FROM comidas WHERE fecha >= $1 GROUP BY fecha', [desde]),
    query('SELECT fecha, COUNT(*) AS total FROM rutinas WHERE fecha >= $1 GROUP BY fecha', [desde]),
    query('SELECT fecha, COUNT(*) AS total FROM salud   WHERE fecha >= $1 GROUP BY fecha', [desde])
  ]);

  const u = usuariosR.rows;
  const inc = incidenciasR.rows;
  const porEstado = estado => sumar(inc, i => i.estado === estado);

  const comidasDia = contarPorDia(comidasDiaR.rows, dias);
  const rutinasDia = contarPorDia(rutinasDiaR.rows, dias);
  const saludDia   = contarPorDia(saludDiaR.rows, dias);

  return {
    totalUsuarios: sumar(u, () => true),
    activos:       sumar(u, r => r.estado === 'Activo'),
    inactivos:     sumar(u, r => r.estado === 'Inactivo'),
    porRol: {
      Futbolista:    sumar(u, r => ES_ATLETA(r.rol)),
      Nutricionista: sumar(u, r => r.rol === 'Nutricionista'),
      Entrenador: sumar(u, r => r.rol === 'Entrenador'),
      Medico:        sumar(u, r => ES_MEDICO(r.rol)),
      Administrador: sumar(u, r => r.rol === 'Administrador')
    },
    totalIncidencias:    sumar(inc, () => true),
    incidenciasAbiertas: porEstado('abierta'),
    incidenciasCriticas: sumar(inc, i => i.prioridad === 'critica'),
    incidenciasPorEstado: {
      abierta:       porEstado('abierta'),
      'en progreso': porEstado('en progreso'),
      resuelta:      porEstado('resuelta')
    },
    totalComidas: Number(totalComidasR.rows[0].total),
    totalRutinas: Number(totalRutinasR.rows[0].total),
    totalSalud:   Number(totalSaludR.rows[0].total),
    fatigaPorAtleta: await fatigaActual(atletasR.rows),
    actividadPorDia: dias.map(dia => ({
      dia:     dia.slice(5),
      comidas: comidasDia[dia],
      rutinas: rutinasDia[dia],
      salud:   saludDia[dia]
    }))
  };
}

module.exports = { obtenerReporte };
