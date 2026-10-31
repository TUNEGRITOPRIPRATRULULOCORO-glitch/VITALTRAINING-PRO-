/**
 * Citas del atleta con su médico o su nutricionista.
 *
 * - El atleta pide cita con un profesional de su equipo (o el que le asignó el administrador):
 *   día, hora (cada 30 min de 7:00 a 19:30), presencial o virtual, y el motivo.
 * - El profesional la confirma o la rechaza; los dos pueden cancelarla; el profesional la marca
 *   como realizada. Una hora con una cita pendiente o confirmada no se puede volver a pedir.
 * - Cada cambio avisa a la otra persona (notificación al celular y, al atleta, alerta en su panel).
 *
 * Las fechas y horas son de Colombia (UTC−5), que es donde se usa la app.
 */
const { query } = require('../../../base-de-datos/db');
const { aFechaISO, sumarDias } = require('../../compartido/fechas');

const ROLES_ATLETA = ['Atleta', 'Futbolista'];
const ROLES_PROFESIONAL = ['Nutricionista', 'Medico', 'Médico'];
const MODALIDADES = ['presencial', 'virtual'];
const DIAS_MAXIMOS = 60;               // se pide cita como mucho con 2 meses de antelación
const PENDIENTES_MAXIMAS = 5;          // citas futuras sin cerrar por atleta (evita llenar agendas)
const OCUPAN = ['pendiente', 'confirmada'];
const HORAS = Array.from({ length: 26 }, (_, i) => {
  const minutos = 7 * 60 + i * 30;     // 07:00 … 19:30
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});

/** Qué puede hacer cada uno según el estado actual de la cita. */
const CAMBIOS = {
  profesional: { pendiente: ['confirmada', 'rechazada'], confirmada: ['cancelada', 'realizada'] },
  atleta:      { pendiente: ['cancelada'], confirmada: ['cancelada'] },
};

const MENSAJE_ESTADO = {
  confirmada: 'confirmó tu cita', rechazada: 'no puede atender tu cita', cancelada: 'canceló la cita', realizada: 'marcó la cita como realizada',
};

function error(mensaje, status = 400) {
  return Object.assign(new Error(mensaje), { status });
}

/** Fecha y hora de ahora en Colombia: { fecha: 'YYYY-MM-DD', hora: 'HH:MM' }. */
function ahoraColombia(ahora = Date.now()) {
  const iso = new Date(ahora - 5 * 3600000).toISOString();
  return { fecha: iso.slice(0, 10), hora: iso.slice(11, 16) };
}

const esAtleta = u => ROLES_ATLETA.includes(u?.rol);
const esProfesional = u => ROLES_PROFESIONAL.includes(u?.rol);

const fechaBonita = f => { const [a, m, d] = f.split('-'); return `${d}/${m}/${a}`; };

function aCita(r) {
  return {
    id: Number(r.id), fecha: aFechaISO(r.fecha), hora: r.hora, modalidad: r.modalidad, motivo: r.motivo || '',
    estado: r.estado, respuesta: r.respuesta || '',
    atleta: { id: Number(r.atleta_id), nombre: r.atleta_nombre },
    profesional: { id: Number(r.profesional_id), nombre: r.profesional_nombre, rol: r.profesional_rol },
  };
}

const SELECT = `SELECT c.*, a.nombre AS atleta_nombre, p.nombre AS profesional_nombre, p.rol AS profesional_rol
                  FROM citas c JOIN usuarios a ON a.id = c.atleta_id JOIN usuarios p ON p.id = c.profesional_id`;

/** Avisa a la otra persona (nunca falla: la cita ya quedó guardada). */
async function avisar(destinoId, aviso, alertaAtleta = null) {
  try {
    await require('../notificaciones').enviar(destinoId, { ...aviso, url: '/', etiqueta: 'cita' });
    if (alertaAtleta) await require('../panel').crearAlerta(destinoId, 'cita', alertaAtleta, new Date().toLocaleDateString('es-CO'));
  } catch (err) {
    console.error('Aviso de cita:', err.message);
  }
}

async function profesionalesDe(atleta) {
  if (!esAtleta(atleta)) throw error('Solo los atletas piden citas.', 403);
  return require('../equipos').profesionalesDe(atleta.id);
}

/** Horas ya tomadas de un profesional ese día (para no ofrecerlas). */
async function horasOcupadas(atleta, profesionalId, fecha) {
  const profesionales = await profesionalesDe(atleta);
  if (!profesionales.some(p => p.id === Number(profesionalId))) throw error('Ese profesional no está en tu equipo.', 403);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) throw error('Fecha no válida.');
  const { rows } = await query(
    `SELECT hora FROM citas WHERE profesional_id = $1 AND fecha = $2 AND estado IN ($3, $4)`,
    [Number(profesionalId), fecha, ...OCUPAN]);
  const ahora = ahoraColombia();
  // Las horas que ya pasaron hoy tampoco se pueden pedir
  const pasadas = fecha === ahora.fecha ? HORAS.filter(h => h <= ahora.hora) : [];
  return [...new Set([...rows.map(r => r.hora), ...pasadas])];
}

async function pedir(atleta, datos = {}) {
  const profesionales = await profesionalesDe(atleta);
  const profesional = profesionales.find(p => p.id === Number(datos.profesionalId));
  if (!profesional) throw error('Ese profesional no está en tu equipo.', 403);

  const fecha = String(datos.fecha || '');
  const hora = String(datos.hora || '');
  const ahora = ahoraColombia();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) throw error('Elige el día de la cita.');
  if (!HORAS.includes(hora)) throw error('Elige una hora entre las 7:00 y las 19:30.');
  if (fecha < ahora.fecha || (fecha === ahora.fecha && hora <= ahora.hora)) throw error('Esa hora ya pasó: elige otra.');
  if (fecha > sumarDias(ahora.fecha, DIAS_MAXIMOS)) throw error(`Puedes pedir citas hasta con ${DIAS_MAXIMOS} días de antelación.`);
  const modalidad = MODALIDADES.includes(datos.modalidad) ? datos.modalidad : 'presencial';
  const motivo = String(datos.motivo || '').trim().slice(0, 500);
  if (motivo.length < 3) throw error('Cuéntale brevemente el motivo de la cita.');

  const { rows: abiertas } = await query(
    `SELECT COUNT(*) AS n FROM citas WHERE atleta_id = $1 AND fecha >= $2 AND estado IN ($3, $4)`,
    [Number(atleta.id), ahora.fecha, ...OCUPAN]);
  if (Number(abiertas[0].n) >= PENDIENTES_MAXIMAS) throw error(`Ya tienes ${PENDIENTES_MAXIMAS} citas por delante: espera a tenerlas o cancela alguna.`, 409);
  const { rows: ocupada } = await query(
    `SELECT id FROM citas WHERE profesional_id = $1 AND fecha = $2 AND hora = $3 AND estado IN ($4, $5)`,
    [profesional.id, fecha, hora, ...OCUPAN]);
  if (ocupada.length) throw error('Esa hora ya está tomada: elige otra.', 409);

  const { rows: [nueva] } = await query(
    `INSERT INTO citas (atleta_id, profesional_id, fecha, hora, modalidad, motivo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [Number(atleta.id), profesional.id, fecha, hora, modalidad, motivo]);
  const cita = await buscar(nueva.id);
  await avisar(profesional.id, {
    titulo: '📅 Nueva solicitud de cita',
    cuerpo: `${cita.atleta.nombre} pide cita el ${fechaBonita(fecha)} a las ${hora} (${modalidad}): ${motivo.slice(0, 80)}`,
  });
  return cita;
}

async function buscar(id) {
  const { rows } = await query(`${SELECT} WHERE c.id = $1`, [Number(id)]);
  if (!rows[0]) throw error('Cita no encontrada.', 404);
  return aCita(rows[0]);
}

/** Citas del usuario: las suyas si es atleta, las de su agenda si es profesional. */
async function listar(usuario) {
  const campo = esAtleta(usuario) ? 'atleta_id' : esProfesional(usuario) ? 'profesional_id' : null;
  if (!campo) return [];
  const { rows } = await query(`${SELECT} WHERE c.${campo} = $1 ORDER BY c.fecha, c.hora`, [Number(usuario.id)]);
  return rows.map(aCita);
}

/** Confirmar, rechazar, cancelar o marcar como realizada. */
async function cambiarEstado(usuario, id, { estado, respuesta } = {}) {
  const cita = await buscar(id);
  const comoProfesional = cita.profesional.id === Number(usuario.id);
  const comoAtleta = cita.atleta.id === Number(usuario.id);
  if (!comoProfesional && !comoAtleta) throw error('Esta cita no es tuya.', 403);
  const permitidos = CAMBIOS[comoProfesional ? 'profesional' : 'atleta'][cita.estado] || [];
  if (!permitidos.includes(estado)) throw error('Esa cita ya no se puede cambiar así.', 409);

  const texto = String(respuesta || '').trim().slice(0, 300);
  await query('UPDATE citas SET estado = $1, respuesta = $2, updated_at = NOW() WHERE id = $3', [estado, texto, cita.id]);
  const actualizada = await buscar(cita.id);

  const cuando = `${fechaBonita(cita.fecha)} a las ${cita.hora}`;
  if (comoProfesional && estado !== 'realizada') {
    const mensaje = `${cita.profesional.nombre} ${MENSAJE_ESTADO[estado]} del ${cuando}.${texto ? ` "${texto}"` : ''}`;
    await avisar(cita.atleta.id, { titulo: '📅 Tu cita', cuerpo: mensaje }, mensaje);
  }
  if (comoAtleta) {
    await avisar(cita.profesional.id, { titulo: '📅 Cita cancelada', cuerpo: `${cita.atleta.nombre} canceló la cita del ${cuando}.${texto ? ` "${texto}"` : ''}` });
  }
  return actualizada;
}

module.exports = { profesionalesDe, horasOcupadas, pedir, listar, cambiarEstado, HORAS, ahoraColombia };
