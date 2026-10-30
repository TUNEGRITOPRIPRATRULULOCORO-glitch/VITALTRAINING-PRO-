const { query } = require('../../../base-de-datos/db');
const { hoyISO, aFechaISO } = require('../../compartido/fechas');
const cat = require('./logros.catalogo');

const contar = async (sql, id) => Number((await query(sql, [id])).rows[0]?.n || 0);

/** Lo que se mide para los logros (todo sale de lo que el atleta ya registra). */
async function datosDe(userId) {
  const id = Number(userId);
  const [perfil, salud, sesiones, manuales, comidas, series, ejercicios, tests, verifTests, verifSeries, rango, altas, reloj, resumen] = await Promise.all([
    query('SELECT completado FROM perfiles_medicos WHERE user_id = $1', [id]),
    query('SELECT fecha FROM salud WHERE user_id = $1', [id]),
    contar('SELECT COUNT(*) AS n FROM cumplimiento WHERE user_id = $1', id),
    contar('SELECT COUNT(*) AS n FROM rutinas WHERE user_id = $1', id),
    contar('SELECT COUNT(*) AS n FROM comidas WHERE user_id = $1', id),
    contar('SELECT COUNT(*) AS n FROM series WHERE user_id = $1', id),
    query('SELECT DISTINCT ejercicio FROM series WHERE user_id = $1', [id]),
    query('SELECT fecha FROM evaluaciones WHERE user_id = $1', [id]),
    contar('SELECT COUNT(*) AS n FROM evaluaciones WHERE user_id = $1 AND verificado = true', id),
    contar('SELECT COUNT(*) AS n FROM series WHERE user_id = $1 AND verificado = true', id),
    query('SELECT MAX(paso) AS n FROM rangos WHERE user_id = $1', [id]),
    contar('SELECT COUNT(*) AS n FROM lesiones WHERE user_id = $1 AND fecha_alta IS NOT NULL', id),
    contar('SELECT COUNT(*) AS n FROM sesiones_reloj WHERE user_id = $1', id),
    require('../rendimiento').obtenerResumen(id).catch(() => null),
  ]);
  const fechasSalud = salud.rows.map(r => aFechaISO(r.fecha));
  const fechasTests = tests.rows.map(r => aFechaISO(r.fecha));
  return {
    perfil: perfil.rows[0]?.completado ? 1 : 0,
    diasSalud: new Set(fechasSalud).size,
    rachaMax: cat.rachaMaxima(fechasSalud),
    sesiones: sesiones + manuales,
    comidas,
    series,
    ejerciciosConRecord: ejercicios.rows.length,
    tests: fechasTests.length,
    mesesConTest: new Set(fechasTests.map(f => f.slice(0, 7))).size,
    verificadas: verifTests + verifSeries,
    mejorRango: rango.rows[0]?.n == null ? 0 : Number(rango.rows[0].n),
    altas,
    sesionesReloj: reloj,
    semanasCompletas: resumen ? cat.semanasCompletas(resumen.cumplimiento.dias, hoyISO()) : 0,
  };
}

/**
 * Logros del atleta con su progreso. Cuando lo mira el propio atleta se guardan los nuevos
 * (con su fecha) y se marcan como "nuevo" para celebrarlos una vez.
 */
async function obtener(userId, lector) {
  const id = Number(userId);
  const [datos, { rows: guardados }] = await Promise.all([
    datosDe(id),
    query('SELECT clave, fecha FROM logros WHERE user_id = $1', [id]),
  ]);
  const yaTenia = Object.fromEntries(guardados.map(g => [g.clave, aFechaISO(g.fecha)]));
  const propio = Number(lector?.id) === id;
  const hoy = hoyISO();
  const logros = [];
  for (const l of cat.evaluar(datos)) {
    // Un logro ganado no se pierde aunque luego cambie el dato (por ejemplo, si borra comidas)
    const conseguido = l.conseguido || !!yaTenia[l.clave];
    let nuevo = false;
    if (l.conseguido && !yaTenia[l.clave] && propio) {
      await query('INSERT INTO logros (user_id, clave, fecha) VALUES ($1, $2, $3)', [id, l.clave, hoy]);
      nuevo = true;
    }
    logros.push({
      clave: l.clave, grupo: l.grupo, icono: l.icono, nivel: l.nivel, nombre: l.nombre, desc: l.desc,
      progreso: conseguido ? { actual: l.meta, meta: l.meta } : l.progreso,
      conseguido, fecha: yaTenia[l.clave] || (nuevo ? hoy : null), nuevo,
    });
  }
  return { conseguidos: logros.filter(l => l.conseguido).length, total: logros.length, logros };
}

module.exports = { obtener, datosDe };
