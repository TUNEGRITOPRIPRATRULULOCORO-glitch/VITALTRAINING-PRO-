const { query } = require('../../../base-de-datos/db');
const panel = require('../panel');

// Sin subconsultas correlacionadas: pg-mem (la base en memoria de desarrollo) no las soporta
async function listarFutbolistas() {
  const { rows: atletas } = await query(
    `SELECT u.id, u.nombre, u.email, u.rol, u.estado, p.posicion, p.edad, p.peso, p.altura
     FROM usuarios u
     LEFT JOIN perfiles p ON p.user_id = u.id
     WHERE (u.rol = 'Atleta' OR u.rol = 'Futbolista') AND u.estado = 'Activo'`
  );
  if (!atletas.length) return [];

  const ids = atletas.map(a => a.id);
  const enLista = ids.map((_, i) => `$${i + 1}`).join(', ');
  const [salud, comidas, rutinas] = await Promise.all([
    query(`SELECT * FROM salud WHERE user_id IN (${enLista}) ORDER BY created_at DESC`, ids),
    query(`SELECT user_id, COUNT(*) AS total FROM comidas WHERE user_id IN (${enLista}) GROUP BY user_id`, ids),
    query(`SELECT user_id, COUNT(*) AS total FROM rutinas WHERE user_id IN (${enLista}) GROUP BY user_id`, ids)
  ]);

  const ultimaSalud = {};
  for (const s of salud.rows) if (!ultimaSalud[s.user_id]) ultimaSalud[s.user_id] = s;
  const totales = rows => Object.fromEntries(rows.map(r => [r.user_id, Number(r.total)]));
  const totalComidas = totales(comidas.rows);
  const totalRutinas = totales(rutinas.rows);

  return atletas.map(a => ({
    ...a,
    ultimaSalud:  ultimaSalud[a.id] || null,
    totalComidas: totalComidas[a.id] || 0,
    totalRutinas: totalRutinas[a.id] || 0
  }));
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