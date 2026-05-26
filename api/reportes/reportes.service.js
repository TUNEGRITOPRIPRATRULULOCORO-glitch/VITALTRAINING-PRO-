const { query } = require('../../data/db');

async function obtenerReporte() {
  const [usuariosR, incidenciasR, totalComidasR, totalRutinasR, totalSaludR] = await Promise.all([
    query(`SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE estado='Activo')        AS activos,
             COUNT(*) FILTER (WHERE estado='Inactivo')      AS inactivos,
             COUNT(*) FILTER (WHERE rol='Futbolista')       AS futbolistas,
             COUNT(*) FILTER (WHERE rol='Nutricionista')    AS nutricionistas,
             COUNT(*) FILTER (WHERE rol='Administrador')    AS administradores
           FROM usuarios`),
    query(`SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE estado='abierta')      AS abiertas,
             COUNT(*) FILTER (WHERE estado='en progreso')  AS en_progreso,
             COUNT(*) FILTER (WHERE estado='resuelta')     AS resueltas,
             COUNT(*) FILTER (WHERE prioridad='critica')   AS criticas
           FROM incidencias`),
    query('SELECT COUNT(*) AS total FROM comidas'),
    query('SELECT COUNT(*) AS total FROM rutinas'),
    query('SELECT COUNT(*) AS total FROM salud')
  ]);

  const fatigaR = await query(`
    SELECT SPLIT_PART(u.nombre, ' ', 1) AS nombre, s.fatiga
    FROM usuarios u
    CROSS JOIN LATERAL (
      SELECT fatiga FROM salud WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
    ) s
    WHERE u.rol = 'Futbolista' AND u.estado = 'Activo'`);

  const actividadR = await query(`
    SELECT
      d.dia,
      COALESCE(c.cnt, 0) AS comidas,
      COALESCE(r.cnt, 0) AS rutinas,
      COALESCE(s.cnt, 0) AS salud
    FROM (
      SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::interval)::date::text AS dia
    ) d
    LEFT JOIN (SELECT fecha::text, COUNT(*)::int AS cnt FROM comidas WHERE fecha >= CURRENT_DATE - 6 GROUP BY fecha) c ON c.fecha = d.dia
    LEFT JOIN (SELECT fecha::text, COUNT(*)::int AS cnt FROM rutinas WHERE fecha >= CURRENT_DATE - 6 GROUP BY fecha) r ON r.fecha = d.dia
    LEFT JOIN (SELECT fecha::text, COUNT(*)::int AS cnt FROM salud  WHERE fecha >= CURRENT_DATE - 6 GROUP BY fecha) s ON s.fecha = d.dia
    ORDER BY d.dia`);

  const u = usuariosR.rows[0];
  const i = incidenciasR.rows[0];

  return {
    totalUsuarios: parseInt(u.total),
    activos:       parseInt(u.activos),
    inactivos:     parseInt(u.inactivos),
    porRol: {
      Futbolista:    parseInt(u.futbolistas),
      Nutricionista: parseInt(u.nutricionistas),
      Administrador: parseInt(u.administradores)
    },
    totalIncidencias:    parseInt(i.total),
    incidenciasAbiertas: parseInt(i.abiertas),
    incidenciasCriticas: parseInt(i.criticas),
    incidenciasPorEstado: {
      abierta:       parseInt(i.abiertas),
      'en progreso': parseInt(i.en_progreso),
      resuelta:      parseInt(i.resueltas)
    },
    totalComidas: parseInt(totalComidasR.rows[0].total),
    totalRutinas: parseInt(totalRutinasR.rows[0].total),
    totalSalud:   parseInt(totalSaludR.rows[0].total),
    fatigaPorAtleta: fatigaR.rows,
    actividadPorDia: actividadR.rows.map(r => ({
      dia:     r.dia.slice(5),
      comidas: r.comidas,
      rutinas: r.rutinas,
      salud:   r.salud
    }))
  };
}

module.exports = { obtenerReporte };