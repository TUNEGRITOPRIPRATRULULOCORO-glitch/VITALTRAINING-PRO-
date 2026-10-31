/**
 * Asistente de chat del atleta ("Vita").
 *
 * Con ANTHROPIC_API_KEY conversa con Claude, que recibe en cada mensaje un resumen de los datos
 * del atleta (ficha, salud reciente, plan, carga...). Sin clave, o si Claude falla, responde el
 * modo básico: un modelo de machine learning propio (ml/, ver clasificador.js) detecta de qué se
 * habla y responde con los análisis de ia.service.
 *
 * La conversación se guarda en la tabla ia_mensajes (este módulo es su dueño).
 */
const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../../../base-de-datos/db');
const { consulta } = require('./ia.service');
const { clasificar } = require('./clasificador');
const { respuestaTecnica, respuestaAyudaApp } = require('./conocimiento');

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
- Si te preguntan algo que no tiene que ver con deporte, entrenamiento, salud deportiva, nutrición o la app, responde breve y vuelve al tema.

Técnica deportiva: también ayudas con la técnica y la preparación de cualquier deporte (por ejemplo, cómo lanza más duro un receptor de béisbol, cómo pegar más fuerte en boxeo, cómo saltar más o nadar mejor). Da 3-4 claves concretas y 1-2 ejercicios, y recuerda calentar y parar si hay dolor.

Cómo se usa la app (para responder dudas de uso):
- Mi Salud / "+ Registrar salud": fatiga, sueño y recuperación de cada mañana. "Hoy te toca" (Dashboard) dice qué hacer hoy.
- Mi Plan: rutina y plan de comidas; "⚙️ Actualizar perfil" cambia condiciones y alergias (se pueden escribir las que no aparecen). El día de competencia se elige arriba en Mi Plan o en Mi Perfil.
- Mi Perfil: deporte, posición, peso, altura, sexo, día de competencia, estilo de pelea (boxeo) y "Mi equipo" (unirse con el código de 6 letras).
- Historial → Comidas: registrar comidas y "📷 Escanear código de barras". Historial → Entrenamientos: sesiones libres.
- Mi reloj: importar .tcx/.gpx, pulso en vivo por Bluetooth (Chrome en Android o computador) y "📘 Guía para conectar tu reloj" por marca.
- Tests físicos (los registra el entrenador si hay equipo), Rangos (Bronce a Radiante), Logros y Clasificación (constancia o marcas verificadas).
- Mensajes: hablar con su entrenador, nutricionista y médico. Mi cuenta (tocando su foto): contraseña, notificaciones, descargar sus datos o borrar la cuenta.`;

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
    const { listo, carga, cumplimiento, estadoMedico } = rendimiento;
    if (estadoMedico?.activas?.length) {
      lineas.push(`Estado médico: ${estadoMedico.etiqueta}. Lesiones activas: ${estadoMedico.activas.map(l =>
        `${l.zona} (${l.tipo}, ${l.gravedad}${l.altaEstimada ? `, alta estimada ${l.altaEstimada}` : ''}${l.indicaciones ? `, indicaciones del médico: "${l.indicaciones.slice(0, 200)}"` : ''})`).join('; ')}.`
        + (estadoMedico.estado === 'no_apto' ? ' Está de baja: no debe entrenar hasta el alta.' : ' Entrena adaptado, solo lo que indicó el médico.'));
    }
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

// Cómo nombrar cada intención cuando Vita pregunta "¿te refieres a…?"
const TEMA_EN_PALABRAS = {
  entrenar_hoy: 'si puedes entrenar hoy', fatiga: 'tu cansancio', sueno: 'tu sueño', recuperacion: 'tu recuperación',
  riesgo: 'una posible lesión', sobrecarga: 'tu carga de entrenamiento', calorias: 'tus calorías',
  nutricion: 'tu alimentación', alimentacion_personalizada: 'qué comer', partido: 'tu próximo partido',
  entrenamiento_personalizado: 'tu rutina', mejorar: 'consejos para mejorar', resumen: 'el resumen de tu semana',
  alertas: 'tus alertas',
};
const AVISO_LESION = '⚠️ Si es un dolor fuerte, hay hinchazón o no puedes apoyar, para y consúltalo con tu médico (puedes escribirle desde Mensajes).\n\n';

// Temas en los que una lesión cambia la respuesta: lo primero es lo que dijo el médico
const TEMAS_DE_ENTRENO = ['entrenar_hoy', 'entrenamiento_personalizado', 'partido', 'riesgo', 'sobrecarga', 'mejorar', 'recuperacion', 'fatiga'];
// De baja, la respuesta normal de estos temas ("estás listo", "tu rutina de hoy") contradiría al médico
const TEMAS_EN_PAUSA_DE_BAJA = ['entrenar_hoy', 'entrenamiento_personalizado', 'partido', 'sobrecarga'];
const MIENTRAS_DE_BAJA = 'Mientras estés de baja, tu trabajo es recuperarte: sigue esas indicaciones, duerme bien y come suficiente proteína. '
  + 'Si tienes dudas o crees que ya estás mejor, escríbele a tu médico desde Mensajes.';

/** Aviso de lesión para anteponer a la respuesta, o null si está apto o el tema no tiene que ver. */
async function avisoEstadoMedico(userId, intencion) {
  if (!TEMAS_DE_ENTRENO.includes(intencion)) return null;
  const estado = await require('../lesiones').estadoDe(userId).catch(() => null);
  if (!estado || estado.estado === 'apto') return null;
  const indicaciones = estado.activas.map(l => l.indicaciones).filter(Boolean);
  const zonas = estado.zonas.join(', ');
  const texto = (estado.estado === 'no_apto'
    ? `🩹 Ojo: tu médico te tiene de baja por tu lesión (${zonas}). No entrenes hasta que te dé el alta.`
    : `🩹 Recuerda que estás en recuperación (${zonas}): entrena solo lo que te indicó tu médico.`)
    + (indicaciones.length ? `\n📌 Sus indicaciones: ${indicaciones.join(' · ')}` : '');
  return { texto, enPausa: estado.estado === 'no_apto' && TEMAS_EN_PAUSA_DE_BAJA.includes(intencion) };
}

/**
 * Modo básico: el modelo de machine learning (clasificador.js, entrenado en ml/) decide de qué
 * se habla. Si duda, se prueba con palabras clave; si tampoco, Vita pregunta entre las dos
 * intenciones más probables en vez de adivinar.
 */
async function deporteDe(userId) {
  const { rows } = await query('SELECT deporte_principal FROM usuarios WHERE id = $1', [userId]);
  return rows[0]?.deporte_principal || 'Fútbol';
}

async function responderLocal(userId, texto) {
  // Preguntas concretas que se responden mejor con lo que Vita sabe (conocimiento.js)
  const ayuda = respuestaAyudaApp(texto);
  if (ayuda) return ayuda;
  const tecnica = respuestaTecnica(texto, await deporteDe(userId));
  if (tecnica) {
    const aviso = await avisoEstadoMedico(userId, 'mejorar');
    return aviso ? `${aviso.texto}\nPractica esto cuando tu médico te dé el visto bueno.\n\n${tecnica}` : tecnica;
  }

  const prediccion = clasificar(texto);
  const intencion = prediccion.segura ? prediccion.intencion : detectarTema(texto);

  if (intencion === 'saludo' || (!intencion && SALUDOS.test(texto.trim())))
    return '¡Hola! 👋 Soy Vita. Pregúntame si puedes entrenar hoy, cómo vas esta semana, qué comer, cómo dormiste, cómo prepararte para tu competencia, consejos de técnica de tu deporte o cómo usar la app.';
  if (intencion === 'gracias')
    return '¡Con gusto! 💪 Aquí estoy cuando quieras seguir hablando de tu entrenamiento o tus comidas.';
  if (intencion === 'fuera_tema')
    return 'De eso no sé mucho 😅. Lo mío es tu entrenamiento, la técnica de tu deporte, tu alimentación, tu descanso y cómo usar la app. ¿Te ayudo con algo de eso?';
  if (!intencion) {
    const opciones = prediccion.ranking.map(r => TEMA_EN_PALABRAS[r.intencion]).filter(Boolean).slice(0, 2);
    return `No estoy segura de haberte entendido. ¿Me preguntas por ${opciones.join(' o por ')}? También puedo darte consejos de técnica de tu deporte o explicarte cómo usar la app: dímelo con otras palabras.`;
  }

  const aviso = await avisoEstadoMedico(userId, intencion);
  if (aviso?.enPausa) return `${aviso.texto}\n\n${MIENTRAS_DE_BAJA}`;
  const r = await consulta(userId, intencion);
  const respuesta = r.respuesta || 'No tengo datos suficientes todavía. Registra tu salud y tus comidas para que pueda ayudarte mejor.';
  if (aviso) return `${aviso.texto}\n\n${respuesta}`;
  return intencion === 'riesgo' ? AVISO_LESION + respuesta : respuesta;
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
