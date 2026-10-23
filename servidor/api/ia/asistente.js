/**
 * Asistente de chat del atleta ("Vita").
 *
 * Con ANTHROPIC_API_KEY conversa con Claude, que recibe en cada mensaje un resumen de los datos
 * del atleta (ficha, salud reciente, plan, carga...). Sin clave, o si Claude falla, responde el
 * modo básico: detecta de qué se habla y usa los análisis de ia.service.
 *
 * La conversación se guarda en la tabla ia_mensajes (este módulo es su dueño).
 */
const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../../../base-de-datos/db');
const { consulta } = require('./ia.service');

const MODELO = 'claude-opus-5-5';
const MAX_HISTORIAL = 20;          // mensajes anteriores que se envían a Claude
const MAX_LARGO_MENSAJE = 2000;    // caracteres por mensaje del atleta

let cliente = null;
function claudeDisponible() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function claude() {
  cliente ??= new Anthropic({ timeout: 60_000, maxRetries: 2 });
  return cliente;
}

// Fijo para todos los atletas (se cachea); los datos de cada uno van aparte, después.
const INSTRUCCIONES = `Eres Vita, la asistente de entrenamiento y nutrición de VitalTraining. Hablas con un atleta (o con alguien que entrena por gusto) como lo haría una entrenadora cercana: en español, de tú, con frases cortas y naturales, sin sonar a robot ni a folleto.

Cómo responder:
- Responde a lo que te preguntan, en 2-6 frases normalmente. Solo da listas o planes largos si te los piden.
- Usa los datos del atleta que vienen abajo para personalizar (nombre, deporte, posición, día de partido, cómo durmió, su carga...). No los repitas todos: menciona solo los que vienen al caso.
- Si falta un dato que necesitas, pregúntalo o di qué registrar en la app (Mi Salud, Mi Perfil, Historial).
- Puedes usar algún emoji, sin abusar. Nada de encabezados ni tablas.
- Las cifras de calorías, macros y rutina de su plan ya están calculadas por la app: apóyate en ellas en vez de inventar otras.

Límites:
- No eres médica. Ante dolor fuerte, lesión, mareos, dolor en el pecho, falta de aire, desmayos o síntomas que preocupen, dile con claridad que pare y consulte a su médico (puede escribirle desde Mensajes en la app).
- Nada de dietas extremas, ayunos largos, fármacos, anabólicos ni suplementos de riesgo. Si es menor de edad, sé especialmente prudente.
- Si te preguntan algo que no tiene que ver con entrenamiento, salud deportiva, nutrición o la app, responde breve y vuelve al tema.`;

// ── Datos del atleta para el contexto ─────────────────────────────────────────

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function hoyISO() { return new Date().toISOString().slice(0, 10); }
function haceDias(n) { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
const fecha = v => String(v instanceof Date ? v.toISOString() : v).slice(0, 10);

/** Texto con lo que Vita necesita saber del atleta hoy. */
async function contextoAtleta(userId) {
  const { planActual } = require('../perfilMedico');
  const { obtenerResumen } = require('../rendimiento');
  const desde = haceDias(7);

  const [{ rows: [usuario] }, { ficha, plan }, { rows: salud }, { rows: comidas }, { rows: rutinas }, rendimiento] = await Promise.all([
    query('SELECT nombre, objetivo, frecuencia FROM usuarios WHERE id = $1', [userId]),
    planActual(userId),
    query('SELECT fecha, fatiga, sueno, recuperacion, notas FROM salud WHERE user_id = $1 AND fecha >= $2 ORDER BY fecha DESC', [userId, desde]),
    query('SELECT fecha, nombre, calorias FROM comidas WHERE user_id = $1 AND fecha >= $2 ORDER BY fecha DESC', [userId, desde]),
    query('SELECT fecha, nombre, duracion_minutos, intensidad FROM rutinas WHERE user_id = $1 AND fecha >= $2 ORDER BY fecha DESC', [userId, desde]),
    obtenerResumen(userId).catch(() => null),
  ]);

  const hoy = hoyISO();
  const diaSemana = DIAS[(new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7];
  const lineas = [`Hoy es ${diaSemana} ${hoy}.`];

  lineas.push(`Atleta: ${usuario?.nombre || 'sin nombre'}. Deporte: ${ficha?.deporte || '—'}${ficha?.posicion ? `, ${ficha.posicion}` : ''}.`
    + `${ficha?.edad ? ` Edad: ${ficha.edad}.` : ''}${ficha?.peso ? ` Peso: ${ficha.peso} kg.` : ''}${ficha?.altura ? ` Altura: ${ficha.altura} cm.` : ''}`
    + `${ficha?.sexo ? ` Sexo: ${ficha.sexo}.` : ''}${usuario?.objetivo ? ` Objetivo: ${usuario.objetivo}.` : ''}`);

  if (plan) {
    const rutina = plan.rutinaSemanal;
    if (rutina?.diaPartido) lineas.push(`Día de partido o competición: ${rutina.diaPartido}.`);
    if (plan.condiciones?.length) lineas.push(`Condiciones médicas: ${plan.condiciones.join(', ')}.`);
    if (plan.alergias?.length) lineas.push(`Alergias: ${plan.alergias.join(', ')}.`);
    if (plan.preferencias) lineas.push(`Preferencia alimentaria: ${plan.preferencias}.`);
    if (rutina?.semana?.length) {
      lineas.push('Rutina semanal: ' + rutina.semana.map(d =>
        `${d.dia}: ${d.tipo}${d.ejercicios?.length ? ` (${d.ejercicios.map(e => e.nombre).slice(0, 4).join(', ')})` : ''}`).join('; ') + '.');
    }
    const comidasPlan = plan.planAlimenticio;
    const objetivos = comidasPlan?.objetivos;
    if (objetivos?.entreno) {
      const o = x => `${x.kcal} kcal, proteína ${x.proteina} g, carbohidratos ${x.carbs} g, grasa ${x.grasa} g, agua ${x.aguaLitros} L`;
      lineas.push(`Objetivos de comida: día de entreno ${o(objetivos.entreno)}; día de descanso ${o(objetivos.descanso)}.`);
    }
    const hoyPlan = comidasPlan?.semana?.find(d => d.dia === diaSemana);
    if (hoyPlan) {
      lineas.push(`Comidas de hoy en su plan (${hoyPlan.objetivo?.etiqueta || hoyPlan.tipoDia}): `
        + ['desayuno', 'meriendaMañana', 'almuerzo', 'meriendaTarde', 'cena'].map(t => hoyPlan[t]?.nombre).filter(Boolean).join(' · ') + '.');
    }
  } else {
    lineas.push('Todavía no completó su perfil médico, así que no tiene rutina ni plan de comidas (se hace en Mi Plan).');
  }

  lineas.push(salud.length
    ? 'Salud últimos 7 días (1-10; fatiga: más bajo es mejor): ' + salud.map(s =>
      `${fecha(s.fecha)} fatiga ${s.fatiga}, sueño ${s.sueno}, recuperación ${s.recuperacion}${s.notas ? ` ("${String(s.notas).slice(0, 80)}")` : ''}`).join('; ') + '.'
    : 'No registró su salud en los últimos 7 días.');
  lineas.push(rutinas.length
    ? `Entrenamientos registrados (7 días): ${rutinas.map(r => `${fecha(r.fecha)} ${r.nombre}${r.duracion_minutos ? ` ${r.duracion_minutos} min` : ''}${r.intensidad ? ` ${r.intensidad}` : ''}`).join('; ')}.`
    : 'No registró entrenamientos en los últimos 7 días.');
  lineas.push(comidas.length
    ? `Comidas registradas (7 días): ${comidas.length}, unas ${comidas.reduce((t, c) => t + (Number(c.calorias) || 0), 0)} kcal en total.`
    : 'No registró comidas en los últimos 7 días.');

  if (rendimiento) {
    const { listo, carga, cumplimiento } = rendimiento;
    if (listo?.puntaje != null) lineas.push(`Listo para entrenar hoy: ${listo.puntaje}/100 (${listo.nivel}).`);
    if (carga?.riesgo && carga.riesgo !== 'sin-datos')
      lineas.push(`Carga de entrenamiento: ${carga.riesgo}${carga.cambioPorcentaje != null ? `, ${carga.cambioPorcentaje > 0 ? '+' : ''}${carga.cambioPorcentaje} % frente a su semana normal` : ''}.`);
    if (cumplimiento?.porcentaje != null) lineas.push(`Cumplimiento del plan: ${cumplimiento.porcentaje} %.`);
  }
  return lineas.join('\n');
}

// ── Respuesta con Claude ──────────────────────────────────────────────────────

async function responderConClaude(userId, historial) {
  // La conversación que se envía debe empezar con un mensaje del atleta
  while (historial.length && historial[0].rol === 'asistente') historial = historial.slice(1);
  const contexto = await contextoAtleta(userId);
  const respuesta = await claude().beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    output_config: { effort: 'low' }, // conversación: respuestas rápidas y baratas
    // Si un filtro de seguridad rechaza la respuesta, el servidor la reintenta con otro modelo
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    cache_control: { type: 'ephemeral' },
    system: [
      { type: 'text', text: INSTRUCCIONES },
      { type: 'text', text: `Datos del atleta (de la app, actualizados ahora):\n${contexto}` },
    ],
    messages: historial.map(m => ({ role: m.rol === 'asistente' ? 'assistant' : 'user', content: m.texto })),
  });

  if (respuesta.stop_reason === 'refusal')
    return 'Prefiero no responder a eso. Si es algo de salud, lo mejor es que lo hables con tu médico desde Mensajes. ¿Te ayudo con tu entrenamiento o tus comidas?';
  const texto = respuesta.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!texto) throw new Error('Respuesta vacía');
  return texto;
}

// ── Modo básico (sin Claude) ──────────────────────────────────────────────────

// Temas que entiende el modo básico: palabras clave → análisis de ia.service
const TEMAS = [
  { tipo: 'entrenar_hoy',               claves: ['entrenar hoy', 'puedo entrenar', 'entreno hoy', 'listo para', 'hoy toca'] },
  { tipo: 'partido',                    claves: ['partido', 'competencia', 'competición', 'carrera', 'torneo', 'combate'] },
  { tipo: 'sueno',                      claves: ['dorm', 'sueño', 'sueno', 'descans'] },
  { tipo: 'fatiga',                     claves: ['cansad', 'fatiga', 'agotad', 'cargad'] },
  { tipo: 'sobrecarga',                 claves: ['sobrecarga', 'demasiado', 'mucho entreno', 'carga'] },
  { tipo: 'recuperacion',               claves: ['recuper', 'dolor', 'agujetas', 'molestia'] },
  { tipo: 'riesgo',                     claves: ['lesión', 'lesion', 'riesgo', 'lastim'] },
  { tipo: 'calorias',                   claves: ['caloría', 'caloria', 'kcal', 'cuánto como', 'cuanto como'] },
  { tipo: 'alimentacion_personalizada', claves: ['plan de comida', 'plan nutricional', 'dieta', 'menú', 'menu', 'qué como', 'que como', 'comer'] },
  { tipo: 'nutricion',                  claves: ['aliment', 'nutri', 'proteína', 'proteina', 'carbohidrato'] },
  { tipo: 'entrenamiento_personalizado', claves: ['rutina', 'ejercicio', 'gimnasio', 'entrenamiento', 'músculo', 'musculo'] },
  { tipo: 'mejorar',                    claves: ['mejorar', 'consejo', 'qué hago', 'que hago', 'ayuda'] },
  { tipo: 'resumen',                    claves: ['resumen', 'cómo voy', 'como voy', 'semana', 'cómo estoy', 'como estoy'] },
  { tipo: 'alertas',                    claves: ['alerta', 'aviso'] },
];
const SALUDOS = /^(hola|buenas|buenos días|buenos dias|buenas tardes|buenas noches|hey|qué tal|que tal)\b/i;

function detectarTema(texto) {
  const t = texto.toLowerCase();
  return TEMAS.find(tema => tema.claves.some(c => t.includes(c)))?.tipo || null;
}

async function responderLocal(userId, texto) {
  const tipo = detectarTema(texto);
  if (!tipo) {
    if (SALUDOS.test(texto.trim()))
      return '¡Hola! 👋 Soy Vita. Pregúntame si puedes entrenar hoy, cómo vas esta semana, qué comer, cómo dormiste o cómo prepararte para tu partido.';
    return 'Ahora mismo funciono en modo básico y no entendí bien la pregunta. Puedo ayudarte con: si puedes entrenar hoy, tu fatiga y sueño, tu carga de entrenamiento, qué comer y cuántas calorías, tu rutina o cómo prepararte para el partido.';
  }
  const r = await consulta(userId, tipo);
  return r.respuesta || 'No tengo datos suficientes todavía. Registra tu salud y tus comidas para que pueda ayudarte mejor.';
}

// ── Conversación ──────────────────────────────────────────────────────────────

async function historial(userId, limite = 50) {
  const { rows } = await query(
    'SELECT id, rol, texto, modo, created_at AS "fecha" FROM ia_mensajes WHERE user_id = $1 ORDER BY id DESC LIMIT $2',
    [userId, limite]
  );
  return rows.reverse().map(m => ({ ...m, id: Number(m.id) }));
}

async function guardar(userId, rol, texto, modo = null) {
  await query('INSERT INTO ia_mensajes (user_id, rol, texto, modo) VALUES ($1, $2, $3, $4)', [userId, rol, texto, modo]);
}

/**
 * Responde un mensaje del atleta y guarda los dos mensajes.
 * @returns {{ respuesta: string, modo: 'claude' | 'basico' }}
 */
async function conversar(userId, mensaje) {
  const texto = String(mensaje || '').trim().slice(0, MAX_LARGO_MENSAJE);
  if (!texto) return { error: 'Escribe un mensaje.', status: 400 };
  await guardar(userId, 'atleta', texto);

  let respuesta = null, modo = 'basico';
  if (claudeDisponible()) {
    try {
      respuesta = await responderConClaude(userId, await historial(userId, MAX_HISTORIAL));
      modo = 'claude';
    } catch (err) {
      // Con la clave mal puesta o sin saldo, mejor saberlo en los registros; la persona recibe el modo básico
      if (err instanceof Anthropic.AuthenticationError) console.error('❌ Asistente IA: ANTHROPIC_API_KEY no es válida.');
      else if (err instanceof Anthropic.RateLimitError) console.error('⚠️  Asistente IA: límite de uso de Claude alcanzado.');
      else if (err instanceof Anthropic.APIError) console.error(`❌ Asistente IA: error de Claude ${err.status}:`, err.message);
      else console.error('❌ Asistente IA:', err.message);
    }
  }
  if (!respuesta) respuesta = await responderLocal(userId, texto);

  await guardar(userId, 'asistente', respuesta, modo);
  return { respuesta, modo };
}

async function borrarConversacion(userId) {
  await query('DELETE FROM ia_mensajes WHERE user_id = $1', [userId]);
}

module.exports = { conversar, historial, borrarConversacion, contextoAtleta, detectarTema, claudeDisponible, MODELO };
