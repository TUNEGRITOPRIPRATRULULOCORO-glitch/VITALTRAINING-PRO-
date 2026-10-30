const { query } = require('../../../base-de-datos/db');
const permisos = require('./mensajes.permisos');
const equipos = require('../equipos');

const MAX_TEXTO = 1000;

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

async function buscarUsuario(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  const { rows } = await query('SELECT id, nombre, rol, estado FROM usuarios WHERE id = $1', [n]);
  return rows[0] || null;
}

async function validarContacto(yo, otroId) {
  const otro = await buscarUsuario(otroId);
  if (!otro || otro.estado !== 'Activo') throw error('Usuario no encontrado.', 404);
  if (!permisos.puedeEscribir(yo.rol, otro.rol)) throw error('No puedes enviar mensajes a este usuario.', 403);
  // Con equipos creados, atleta y profesional solo hablan si comparten equipo
  if (!(await equipos.puedenHablar(yo, otro))) throw error('Esta persona no está en tu equipo.', 403);
  return otro;
}

/**
 * Personas con las que el usuario puede hablar, con el último mensaje y los no leídos.
 * Orden: primero quien tiene mensajes sin leer, luego la conversación más reciente, luego por nombre.
 */
async function listarContactos(yo) {
  const roles = permisos.rolesContactables(yo.rol);
  if (!roles.length) return [];

  const marcadores = roles.map((_, i) => `$${i + 2}`).join(', ');
  const [{ rows: todos }, { rows: mensajes }] = await Promise.all([
    query(
      `SELECT id, nombre, rol FROM usuarios
       WHERE estado = 'Activo' AND id <> $1 AND rol IN (${marcadores})`,
      [Number(yo.id), ...roles]
    ),
    query(
      `SELECT remitente_id, destinatario_id, texto, leido, created_at FROM mensajes
       WHERE remitente_id = $1 OR destinatario_id = $1
       ORDER BY created_at DESC, id DESC`,
      [Number(yo.id)]
    )
  ]);

  const usuarios = await equipos.filtrarContactos(yo, todos);
  const resumen = {};
  for (const m of mensajes) {
    const mio = Number(m.remitente_id) === Number(yo.id);
    const otro = String(mio ? m.destinatario_id : m.remitente_id);
    resumen[otro] = resumen[otro] || { ultimo: m, noLeidos: 0 };
    if (!mio && !m.leido) resumen[otro].noLeidos++;
  }

  return usuarios
    .map(u => {
      const r = resumen[String(u.id)];
      return {
        id: Number(u.id),
        nombre: u.nombre,
        rol: permisos.normalizarRol(u.rol),
        noLeidos: r?.noLeidos || 0,
        ultimoMensaje: r ? {
          texto: r.ultimo.texto,
          fecha: r.ultimo.created_at,
          mio: Number(r.ultimo.remitente_id) === Number(yo.id)
        } : null
      };
    })
    .sort((a, b) =>
      (b.noLeidos > 0) - (a.noLeidos > 0) ||
      new Date(b.ultimoMensaje?.fecha || 0) - new Date(a.ultimoMensaje?.fecha || 0) ||
      a.nombre.localeCompare(b.nombre, 'es')
    );
}

/** Mensajes con otra persona; marca como leídos los que me envió. */
async function conversacion(yo, otroId) {
  const otro = await validarContacto(yo, otroId);
  const { rows } = await query(
    `SELECT id, remitente_id, texto, leido, created_at FROM mensajes
     WHERE (remitente_id = $1 AND destinatario_id = $2) OR (remitente_id = $2 AND destinatario_id = $1)
     ORDER BY created_at ASC, id ASC`,
    [Number(yo.id), Number(otro.id)]
  );
  await query(
    'UPDATE mensajes SET leido = true WHERE remitente_id = $1 AND destinatario_id = $2 AND leido = false',
    [Number(otro.id), Number(yo.id)]
  );
  return {
    contacto: { id: Number(otro.id), nombre: otro.nombre, rol: permisos.normalizarRol(otro.rol) },
    mensajes: rows.map(m => ({
      id: Number(m.id),
      texto: m.texto,
      fecha: m.created_at,
      mio: Number(m.remitente_id) === Number(yo.id),
      leido: m.leido
    }))
  };
}

async function enviar(yo, otroId, texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) throw error('El mensaje está vacío.', 400);
  if (limpio.length > MAX_TEXTO) throw error(`El mensaje no puede superar ${MAX_TEXTO} caracteres.`, 400);
  const otro = await validarContacto(yo, otroId);

  const { rows } = await query(
    `INSERT INTO mensajes (remitente_id, destinatario_id, texto)
     VALUES ($1, $2, $3)
     RETURNING id, texto, created_at`,
    [Number(yo.id), Number(otro.id), limpio]
  );
  // Aviso al celular de quien lo recibe (no espera: enviar() nunca falla)
  require('../notificaciones').enviar(otro.id, {
    titulo: `💬 ${yo.nombre || 'Nuevo mensaje'}`, cuerpo: limpio.slice(0, 120), url: '/', etiqueta: `mensaje-${yo.id}`,
  });
  return { id: Number(rows[0].id), texto: rows[0].texto, fecha: rows[0].created_at, mio: true, leido: false };
}

/** Total de mensajes sin leer, separado por el rol de quien los envió. */
async function noLeidos(yo) {
  const { rows } = await query(
    `SELECT u.rol, COUNT(*) AS total FROM mensajes m
     JOIN usuarios u ON u.id = m.remitente_id
     WHERE m.destinatario_id = $1 AND m.leido = false
     GROUP BY u.rol`,
    [Number(yo.id)]
  );
  const porRol = {};
  for (const r of rows) {
    const rol = permisos.normalizarRol(r.rol);
    porRol[rol] = (porRol[rol] || 0) + Number(r.total);
  }
  return { total: Object.values(porRol).reduce((a, b) => a + b, 0), porRol };
}

module.exports = { listarContactos, conversacion, enviar, noLeidos, MAX_TEXTO };
