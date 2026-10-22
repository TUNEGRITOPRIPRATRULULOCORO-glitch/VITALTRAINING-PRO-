const { query } = require('../../../base-de-datos/db');
const panel = require('../panel');

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
     WHERE (u.rol = 'Atleta' OR u.rol = 'Futbolista') AND u.estado = 'Activo'`
  );
  return rows;
}

async function detalleFutbolista(userId) {
  const { rows: users } = await query(
    'SELECT * FROM usuarios WHERE id = $1',
    [Number(userId)]
  );
  const usuario = users[0];
  if (!usuario || (usuario.rol !== 'Atleta' && usuario.rol !== 'Futbolista')) return null;

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
  return panel.registrarComidaAsignada(userId, nutricionista.nombre, datos);
}

async function registrarRutina(userId, nutricionista, datos) {
  return panel.registrarRutinaAsignada(userId, nutricionista.nombre, datos);
}

module.exports = { listarFutbolistas, detalleFutbolista, agregarNota, registrarComida, registrarRutina };