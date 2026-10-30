const crypto = require('crypto');
const { query } = require('../../../base-de-datos/db');
const { DEPORTES } = require('../../compartido/deportes');

/*
 * Regla de acceso:
 * - Mientras no exista ningún equipo, la app funciona como un club único: cada profesional ve a todos los atletas.
 * - En cuanto hay equipos, un nutricionista o médico solo ve a los atletas de sus equipos
 *   (y un atleta solo puede escribirles a los profesionales de su equipo).
 * - El administrador ve siempre a todos.
 */

const ROLES_ATLETA = ['Atleta', 'Futbolista'];
const ROLES_PROFESIONAL = ['Nutricionista', 'Entrenador', 'Medico', 'Médico'];
const esAtleta = rol => ROLES_ATLETA.includes(rol);
const esProfesional = rol => ROLES_PROFESIONAL.includes(rol);

// Sin letras que se confunden al dictarlas o copiarlas (0/O, 1/I/L)
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LARGO_CODIGO = 6;

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

const enLista = (valores, desde = 1) => valores.map((_, i) => `$${i + desde}`).join(', ');

function nuevoCodigo() {
  const bytes = crypto.randomBytes(LARGO_CODIGO);
  return Array.from(bytes, b => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join('');
}

async function hayEquipos() {
  const { rows } = await query('SELECT id FROM equipos LIMIT 1');
  return rows.length > 0;
}

async function equiposIdsDe(userId) {
  const { rows } = await query('SELECT equipo_id FROM equipo_miembros WHERE user_id = $1', [Number(userId)]);
  return rows.map(r => Number(r.equipo_id));
}

async function miembrosDe(equipoIds) {
  if (!equipoIds.length) return [];
  const { rows } = await query(
    `SELECT m.equipo_id, u.id, u.nombre, u.email, u.rol, u.estado
       FROM equipo_miembros m JOIN usuarios u ON u.id = m.user_id
      WHERE m.equipo_id IN (${enLista(equipoIds)})
      ORDER BY u.nombre`,
    equipoIds
  );
  return rows.map(r => ({ equipoId: Number(r.equipo_id), id: Number(r.id), nombre: r.nombre, email: r.email, rol: r.rol, estado: r.estado }));
}

// ── Acceso ──────────────────────────────────────────

/**
 * Ids de los atletas que puede ver el usuario, o null si puede ver a todos.
 * (La lista puede incluir también profesionales del mismo equipo: solo se usa para filtrar atletas.)
 */
async function atletasVisibles(usuario) {
  if (usuario?.rol === 'Administrador') return null;
  if (esAtleta(usuario?.rol)) return [Number(usuario.id)];
  if (!esProfesional(usuario?.rol)) return [];
  if (!(await hayEquipos())) return null;
  const miembros = await miembrosDe(await equiposIdsDe(usuario.id));
  return [...new Set(miembros.filter(m => esAtleta(m.rol)).map(m => m.id))];
}

async function puedeVerAtleta(usuario, atletaId) {
  if (Number(usuario?.id) === Number(atletaId)) return true;
  const visibles = await atletasVisibles(usuario);
  return visibles === null || visibles.includes(Number(atletaId));
}

/** Deja solo los elementos (con campo id) que el usuario puede ver. */
async function filtrarAtletas(usuario, lista, campo = 'id') {
  const visibles = await atletasVisibles(usuario);
  if (visibles === null) return lista;
  const set = new Set(visibles);
  return lista.filter(item => set.has(Number(item[campo])));
}

/**
 * ¿Pueden chatear? Solo se limita la pareja atleta ↔ profesional: tienen que compartir equipo
 * (o no haber equipos). Las demás reglas de quién escribe a quién están en el módulo mensajes.
 */
async function puedenHablar(yo, otro) {
  if (esAtleta(yo.rol) && esProfesional(otro.rol)) return puedeVerAtleta(otro, yo.id);
  if (esProfesional(yo.rol) && esAtleta(otro.rol)) return puedeVerAtleta(yo, otro.id);
  return true;
}

async function filtrarContactos(yo, usuarios) {
  if (!(await hayEquipos())) return usuarios;
  const propios = new Set((await miembrosDe(await equiposIdsDe(yo.id))).map(m => m.id));
  return usuarios.filter(u => {
    const pareja = (esAtleta(yo.rol) && esProfesional(u.rol)) || (esProfesional(yo.rol) && esAtleta(u.rol));
    return !pareja || propios.has(Number(u.id));
  });
}

/** Middleware para rutas /:userId de un atleta: el propio atleta, el admin o un profesional con acceso. */
function accesoAtleta(...roles) {
  return async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      if (Number(req.user?.id) === userId) return next();
      if (!roles.includes(req.user?.rol)) return res.status(403).json({ error: 'No tienes permiso para acceder a estos datos.' });
      if (await puedeVerAtleta(req.user, userId)) return next();
      return res.status(403).json({ error: 'Este atleta no está en ninguno de tus equipos.' });
    } catch (err) {
      console.error('Acceso a atleta:', err.message);
      return res.status(500).json({ error: 'No se pudo comprobar el acceso.' });
    }
  };
}

/** Nombres de los equipos de cada usuario: { [id]: ['Sub-17', ...] } */
async function nombresDeEquipos(userIds) {
  if (!userIds.length) return {};
  const { rows } = await query(
    `SELECT m.user_id, e.nombre FROM equipo_miembros m JOIN equipos e ON e.id = m.equipo_id
      WHERE m.user_id IN (${enLista(userIds)}) ORDER BY e.nombre`,
    userIds.map(Number)
  );
  const mapa = {};
  for (const r of rows) (mapa[String(r.user_id)] ||= []).push(r.nombre);
  return mapa;
}

// ── Gestión (administrador) ─────────────────────────

function aEquipo(r, miembros = []) {
  const propios = miembros.filter(m => m.equipoId === Number(r.id));
  return {
    id: Number(r.id),
    nombre: r.nombre,
    deporte: r.deporte || null,
    codigo: r.codigo,
    atletas: propios.filter(m => esAtleta(m.rol)),
    profesionales: propios.filter(m => esProfesional(m.rol)),
  };
}

/** Todos los equipos con sus miembros, y los atletas activos que aún no tienen equipo. */
async function listar() {
  const { rows } = await query('SELECT * FROM equipos ORDER BY nombre');
  const miembros = await miembrosDe(rows.map(r => Number(r.id)));
  const conEquipo = new Set(miembros.map(m => m.id));
  const { rows: atletas } = await query(
    `SELECT id, nombre, email FROM usuarios WHERE rol IN (${enLista(ROLES_ATLETA)}) AND estado = 'Activo' ORDER BY nombre`,
    ROLES_ATLETA
  );
  return {
    equipos: rows.map(r => aEquipo(r, miembros)),
    sinEquipo: atletas.filter(a => !conEquipo.has(Number(a.id))).map(a => ({ id: Number(a.id), nombre: a.nombre, email: a.email })),
  };
}

function validarDatos(datos) {
  const nombre = String(datos?.nombre || '').trim().slice(0, 100);
  if (nombre.length < 2) throw error('Escribe el nombre del equipo.', 400);
  const deporte = datos?.deporte ? String(datos.deporte) : null;
  if (deporte && !DEPORTES.includes(deporte)) throw error('Deporte no válido.', 400);
  return { nombre, deporte };
}

async function buscar(id) {
  const { rows } = await query('SELECT * FROM equipos WHERE id = $1', [Number(id)]);
  if (!rows[0]) throw error('Equipo no encontrado.', 404);
  return rows[0];
}

async function nombreRepetido(nombre, salvoId = 0) {
  const { rows } = await query('SELECT id, nombre FROM equipos');
  return rows.some(r => Number(r.id) !== Number(salvoId) && r.nombre.toLowerCase() === nombre.toLowerCase());
}

async function crear(datos) {
  const { nombre, deporte } = validarDatos(datos);
  if (await nombreRepetido(nombre)) throw error('Ya existe un equipo con ese nombre.', 409);
  for (let intento = 0; intento < 5; intento++) {
    const codigo = nuevoCodigo();
    const { rows: usado } = await query('SELECT id FROM equipos WHERE codigo = $1', [codigo]);
    if (usado.length) continue;
    const { rows } = await query(
      'INSERT INTO equipos (nombre, deporte, codigo) VALUES ($1, $2, $3) RETURNING *',
      [nombre, deporte, codigo]
    );
    return aEquipo(rows[0]);
  }
  throw error('No se pudo generar el código del equipo. Intenta de nuevo.', 500);
}

async function actualizar(id, datos) {
  await buscar(id);
  const { nombre, deporte } = validarDatos(datos);
  if (await nombreRepetido(nombre, id)) throw error('Ya existe un equipo con ese nombre.', 409);
  const { rows } = await query('UPDATE equipos SET nombre = $1, deporte = $2 WHERE id = $3 RETURNING *', [nombre, deporte, Number(id)]);
  return aEquipo(rows[0]);
}

/** Código nuevo: el anterior deja de servir (por si se compartió donde no debía). */
async function renovarCodigo(id) {
  await buscar(id);
  const { rows } = await query('UPDATE equipos SET codigo = $1 WHERE id = $2 RETURNING *', [nuevoCodigo(), Number(id)]);
  return aEquipo(rows[0]);
}

async function eliminar(id) {
  await query('DELETE FROM equipo_miembros WHERE equipo_id = $1', [Number(id)]);
  const { rows } = await query('DELETE FROM equipos WHERE id = $1 RETURNING id', [Number(id)]);
  return rows.length > 0;
}

/** Un atleta está en un solo equipo: al añadirlo a otro, sale del anterior. Los profesionales pueden estar en varios. */
async function agregarMiembro(equipoId, userId) {
  await buscar(equipoId);
  const { rows } = await query("SELECT id, rol, estado FROM usuarios WHERE id = $1", [Number(userId)]);
  const usuario = rows[0];
  if (!usuario) throw error('Usuario no encontrado.', 404);
  if (!esAtleta(usuario.rol) && !esProfesional(usuario.rol)) throw error('Solo se añaden atletas, nutricionistas y médicos.', 400);
  if (esAtleta(usuario.rol)) await query('DELETE FROM equipo_miembros WHERE user_id = $1 AND equipo_id <> $2', [Number(userId), Number(equipoId)]);
  const { rows: ya } = await query('SELECT id FROM equipo_miembros WHERE equipo_id = $1 AND user_id = $2', [Number(equipoId), Number(userId)]);
  if (!ya.length) await query('INSERT INTO equipo_miembros (equipo_id, user_id) VALUES ($1, $2)', [Number(equipoId), Number(userId)]);
  return true;
}

async function quitarMiembro(equipoId, userId) {
  const { rows } = await query(
    'DELETE FROM equipo_miembros WHERE equipo_id = $1 AND user_id = $2 RETURNING id',
    [Number(equipoId), Number(userId)]
  );
  return rows.length > 0;
}

// ── Atleta y profesionales ──────────────────────────

/** Equipos del usuario con sus compañeros profesionales (y atletas, si quien pregunta es profesional). */
async function misEquipos(usuario) {
  const ids = await equiposIdsDe(usuario.id);
  if (!ids.length) return [];
  const { rows } = await query(`SELECT * FROM equipos WHERE id IN (${enLista(ids)}) ORDER BY nombre`, ids);
  const miembros = (await miembrosDe(ids)).filter(m => m.estado === 'Activo');
  return rows.map(r => {
    const e = aEquipo(r, miembros);
    // El código lo reparten el administrador y el entrenador del equipo; el atleta no ve la lista de compañeros (privacidad)
    const { codigo, ...resto } = e;
    if (esAtleta(usuario.rol)) return { ...resto, atletas: undefined };
    return usuario.rol === 'Entrenador' ? e : resto;
  });
}

/** El atleta se une con el código que le pasó su club. Si ya estaba en otro equipo, se cambia. */
async function unirseConCodigo(usuario, codigo) {
  if (!esAtleta(usuario.rol)) throw error('Solo los atletas se unen con código. A los profesionales los añade el administrador.', 403);
  const limpio = String(codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length !== LARGO_CODIGO) throw error(`El código tiene ${LARGO_CODIGO} letras o números.`, 400);
  const { rows } = await query('SELECT * FROM equipos WHERE codigo = $1', [limpio]);
  if (!rows[0]) throw error('No hay ningún equipo con ese código. Revísalo con tu club.', 404);
  await agregarMiembro(rows[0].id, usuario.id);
  return { id: Number(rows[0].id), nombre: rows[0].nombre };
}

/** Equipo por su código de invitación (para unirse al registrarse), o null. */
async function porCodigo(codigo) {
  const limpio = String(codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (limpio.length !== LARGO_CODIGO) return null;
  const { rows } = await query('SELECT id, nombre, deporte FROM equipos WHERE codigo = $1', [limpio]);
  return rows[0] ? { id: Number(rows[0].id), nombre: rows[0].nombre, deporte: rows[0].deporte } : null;
}

/** ¿Está el atleta en algún equipo? (En un equipo, sus tests los registra el entrenador.) */
async function tieneEquipo(userId) {
  return (await equiposIdsDe(userId)).length > 0;
}

module.exports = {
  tieneEquipo,
  atletasVisibles, puedeVerAtleta, filtrarAtletas, puedenHablar, filtrarContactos, accesoAtleta, nombresDeEquipos,
  listar, crear, actualizar, renovarCodigo, eliminar, agregarMiembro, quitarMiembro, misEquipos, unirseConCodigo,
  hayEquipos, nuevoCodigo, LARGO_CODIGO, porCodigo, nombreRepetido,
};
