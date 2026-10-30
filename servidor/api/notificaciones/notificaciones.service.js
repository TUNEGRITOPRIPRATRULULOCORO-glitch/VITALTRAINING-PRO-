/**
 * Notificaciones en el celular (Web Push).
 *
 * - Cada dispositivo que las activa guarda su "suscripción" (dirección del servicio de push del
 *   navegador y sus claves). El servidor firma cada aviso con sus claves VAPID.
 * - Las claves VAPID salen de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY o, si no están, se generan
 *   una sola vez y se guardan en la base (así funciona sin configurar nada).
 * - enviar() nunca lanza errores: un aviso fallido no rompe lo que lo provocó. Si el navegador
 *   dice que la suscripción ya no existe (404/410), se borra.
 */
const webpush = require('web-push');
const { query } = require('../../../base-de-datos/db');
const { hoyISO } = require('../../compartido/fechas');

let _claves = null;
let _enviador = (suscripcion, datos, opciones) => webpush.sendNotification(suscripcion, datos, opciones);

/** Solo para los tests: sustituye el envío real. */
function _usarEnviador(fn) { _enviador = fn; }

async function claves() {
  if (_claves) return _claves;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    _claves = { publica: process.env.VAPID_PUBLIC_KEY, privada: process.env.VAPID_PRIVATE_KEY };
  } else {
    const { rows } = await query('SELECT publica, privada FROM push_claves WHERE id = 1');
    if (rows[0]) _claves = rows[0];
    else {
      const nuevas = webpush.generateVAPIDKeys();
      await query('INSERT INTO push_claves (id, publica, privada) VALUES (1, $1, $2)', [nuevas.publicKey, nuevas.privateKey]);
      _claves = { publica: nuevas.publicKey, privada: nuevas.privateKey };
    }
  }
  const contacto = process.env.CORREO_REMITENTE ? `mailto:${process.env.CORREO_REMITENTE}` : (process.env.APP_URL || 'https://vitaltraining-pro.onrender.com');
  webpush.setVapidDetails(contacto, _claves.publica, _claves.privada);
  return _claves;
}

async function clavePublica() {
  return (await claves()).publica;
}

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

/** Guarda (o actualiza) la suscripción de este dispositivo. */
async function suscribir(userId, { suscripcion, recordatorio = true } = {}) {
  const endpoint = String(suscripcion?.endpoint || '');
  const { p256dh, auth } = suscripcion?.keys || {};
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) throw error('Suscripción no válida.', 400);
  const { rows } = await query('SELECT id FROM push_suscripciones WHERE endpoint = $1', [endpoint]);
  if (rows[0]) {
    await query('UPDATE push_suscripciones SET user_id = $1, p256dh = $2, auth = $3, recordatorio = $4 WHERE id = $5',
      [Number(userId), p256dh, auth, recordatorio !== false, rows[0].id]);
  } else {
    await query('INSERT INTO push_suscripciones (user_id, endpoint, p256dh, auth, recordatorio) VALUES ($1, $2, $3, $4, $5)',
      [Number(userId), endpoint, p256dh, auth, recordatorio !== false]);
  }
  return true;
}

async function desuscribir(userId, endpoint) {
  await query('DELETE FROM push_suscripciones WHERE user_id = $1 AND endpoint = $2', [Number(userId), String(endpoint || '')]);
  return true;
}

async function estado(userId, endpoint) {
  const { rows } = await query('SELECT recordatorio FROM push_suscripciones WHERE user_id = $1 AND endpoint = $2', [Number(userId), String(endpoint || '')]);
  return { suscrito: rows.length > 0, recordatorio: rows[0] ? rows[0].recordatorio !== false : true };
}

/**
 * Envía un aviso a todos los dispositivos del usuario.
 * aviso: { titulo, cuerpo, url?, etiqueta? } (la etiqueta agrupa: un aviso nuevo reemplaza al anterior)
 * @returns número de dispositivos a los que llegó
 */
async function enviar(userId, aviso) {
  try {
    const { rows } = await query('SELECT id, endpoint, p256dh, auth FROM push_suscripciones WHERE user_id = $1', [Number(userId)]);
    if (!rows.length) return 0;
    await claves();
    const datos = JSON.stringify({
      titulo: String(aviso.titulo || 'VitalTraining').slice(0, 80),
      cuerpo: String(aviso.cuerpo || '').slice(0, 200),
      url: aviso.url || '/',
      etiqueta: aviso.etiqueta || null,
    });
    let enviados = 0;
    await Promise.all(rows.map(async s => {
      try {
        await _enviador({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, datos, { TTL: 12 * 3600 });
        enviados++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) await query('DELETE FROM push_suscripciones WHERE id = $1', [s.id]);
        else console.error('Notificación:', err.statusCode || '', err.message);
      }
    }));
    return enviados;
  } catch (err) {
    console.error('Notificaciones:', err.message);
    return 0;
  }
}

// Título según el tipo de alerta del panel (salud, lesión, carga…)
const TITULOS = {
  lesion: '🩹 Tu médico', 'nota medica': '📋 Nota de tu médico', fatiga: '💪 Tu salud', recuperacion: '💪 Tu salud',
  sueno: '😴 Tu descanso', carga: '📈 Tu carga de entrenamiento', cuenta: 'VitalTraining',
};
function avisoDeAlerta(tipo, mensaje) {
  return { titulo: TITULOS[tipo] || 'VitalTraining', cuerpo: mensaje, url: '/', etiqueta: `alerta-${tipo}` };
}

/**
 * Recordatorio diario: a los atletas con el recordatorio activado que aún no registraron
 * cómo amanecieron hoy. Lo dispara una tarea programada (GitHub Actions) cada mañana.
 */
async function recordatorioDiario() {
  const { rows } = await query(
    `SELECT DISTINCT s.user_id, u.nombre FROM push_suscripciones s JOIN usuarios u ON u.id = s.user_id
      WHERE s.recordatorio = true AND u.estado = 'Activo' AND u.rol IN ('Atleta', 'Futbolista')`
  );
  const { rows: hechos } = await query('SELECT user_id FROM salud WHERE fecha = $1', [hoyISO()]);
  const yaRegistraron = new Set(hechos.map(h => Number(h.user_id)));
  let avisados = 0;
  for (const r of rows) {
    if (yaRegistraron.has(Number(r.user_id))) continue;
    const nombre = String(r.nombre || '').split(' ')[0];
    const n = await enviar(r.user_id, {
      titulo: `☀️ ¡Buenos días${nombre ? `, ${nombre}` : ''}!`,
      cuerpo: '¿Cómo amaneciste? Registra tu salud en 10 segundos y mira qué te toca hoy.',
      url: '/', etiqueta: 'recordatorio-diario',
    });
    if (n) avisados++;
  }
  return { candidatos: rows.length, avisados };
}

module.exports = { clavePublica, suscribir, desuscribir, estado, enviar, avisoDeAlerta, recordatorioDiario, _usarEnviador };
