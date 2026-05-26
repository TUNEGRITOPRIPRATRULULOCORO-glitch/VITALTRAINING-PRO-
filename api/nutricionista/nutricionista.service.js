const { query } = require('../../data/db');

async function listarFutbolistas() {
  const { rows } = await query(
    `SELECT
       u.id, u.nombre, u.email, u.rol, u.estado,
       p.posicion, p.edad, p.peso, p.altura,
       (SELECT ROW_TO_JSON(s) FROM salud s WHERE s.user_id = u.id ORDER BY s.created_at DESC LIMIT 1) AS "ultimaSalud",
       (SELECT COUNT(*)::int FROM comidas WHERE user_id = u.id) AS "totalComidas",
       (SELECT COUNT(*)::int FROM rutinas WHERE user_id = u.id) AS "totalRutinas"
     FROM usuarios u
     LEFT JOIN perfiles p ON p.user_id = u.id
     WHERE u.rol = 'Futbolista' AND u.estado = 'Activo'`
  );
  return rows;
}

async function detalleFutbolista(userId) {
  const { rows: users } = await query(
    'SELECT * FROM usuarios WHERE id = $1',
    [Number(userId)]
  );
  const usuario = users[0];
  if (!usuario || usuario.rol !== 'Futbolista') return null;

  const [perfilR, saludR, comidasR, rutinasR, alertasR, notasR] = await Promise.all([
    query('SELECT * FROM perfiles WHERE user_id = $1', [usuario.id]),
    query('SELECT * FROM salud WHERE user_id = $1 ORDER BY created_at DESC', [usuario.id]),
    query('SELECT * FROM comidas WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [usuario.id]),
    query('SELECT * FROM rutinas WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [usuario.id]),
    query('SELECT * FROM alertas WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [usuario.id]),
    query('SELECT * FROM notas_nutricionista WHERE user_id = $1 ORDER BY created_at DESC', [usuario.id])
  ]);

  const { password, ...u } = usuario;
  return {
    ...u,
    perfil:  perfilR.rows[0] || null,
    salud:   saludR.rows,
    comidas: comidasR.rows,
    rutinas: rutinasR.rows,
    alertas: alertasR.rows,
    notas:   notasR.rows
  };
}

async function agregarNota(userId, nutricionista, texto) {
  const { rows } = await query(
    `INSERT INTO notas_nutricionista (user_id, nutricionista_id, nutricionista_nombre, texto, fecha)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, user_id AS "userId", nutricionista_id AS "nutricionistaId", nutricionista_nombre AS "nutricionistaNombre", texto, fecha, created_at AS "createdAt"`,
    [
      Number(userId), nutricionista.id, nutricionista.nombre,
      texto, new Date().toLocaleDateString('es-CO')
    ]
  );
  return rows[0];
}

async function registrarComida(userId, nutricionista, datos) {
  const { rows } = await query(
    `INSERT INTO comidas (user_id, nombre, tipo, calorias, fecha, hora, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, user_id AS "userId", nombre, tipo, calorias, fecha, hora, registrado_por, created_at AS "createdAt"`,
    [
      Number(userId), datos.nombre,
      datos.tipo || 'almuerzo', Number(datos.calorias) || 0,
      datos.fecha || new Date().toISOString().slice(0, 10),
      datos.hora  || new Date().toTimeString().slice(0, 5),
      nutricionista.nombre
    ]
  );
  return rows[0];
}

async function registrarRutina(userId, nutricionista, datos) {
  const { rows } = await query(
    `INSERT INTO rutinas (user_id, nombre, tipo, duracion_minutos, intensidad, descripcion, fecha, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, user_id AS "userId", nombre, tipo, duracion_minutos AS "duracionMinutos", intensidad, descripcion, fecha, registrado_por, created_at AS "createdAt"`,
    [
      Number(userId), datos.nombre,
      datos.tipo || 'entrenamiento', Number(datos.duracionMinutos) || 60,
      datos.intensidad  || 'media', datos.descripcion || '',
      datos.fecha || new Date().toISOString().slice(0, 10),
      nutricionista.nombre
    ]
  );
  return rows[0];
}

module.exports = { listarFutbolistas, detalleFutbolista, agregarNota, registrarComida, registrarRutina };