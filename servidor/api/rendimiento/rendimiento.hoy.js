/**
 * "Hoy te toca…": lo que el atleta tiene que hacer hoy, en una sola lista (función pura).
 *
 * Junta lo que la app ya sabe: su rutina, su plan de comidas (con el tipo de día: entreno,
 * descanso, víspera de partido, partido…), si registró su salud, si hizo la sesión, qué comidas
 * apuntó y si el médico lo tiene de baja. Nunca regaña: lo que falta queda "pendiente".
 */

// Las tres comidas principales cuentan en el progreso; las meriendas se muestran como sugerencia
const COMIDAS_PRINCIPALES = [
  { toma: 'desayuno', titulo: 'Desayuno' },
  { toma: 'almuerzo', titulo: 'Almuerzo' },
  { toma: 'cena',     titulo: 'Cena' },
];

const CONTEXTO = {
  partido:        { icono: '🏆', etiqueta: 'Día de partido', mensaje: 'Comida principal 3-4 h antes, rica en carbohidratos y baja en grasa. Hidrátate bien y ¡a darlo todo!' },
  precompetencia: { icono: '⚡', etiqueta: 'Víspera de partido', mensaje: 'Mañana compites: entreno suave de activación, más carbohidratos en las comidas y a dormir temprano.' },
  recuperacion:   { icono: '🧘', etiqueta: 'Recuperación', mensaje: 'Hoy toca recuperar: sesión suave, estiramientos y proteína en cada comida.' },
  descanso:       { icono: '😌', etiqueta: 'Descanso', mensaje: 'Hoy descansas. Un paseo suave y unos estiramientos ayudan a recuperar.' },
  entreno:        { icono: '💪', etiqueta: 'Entreno', mensaje: 'Día de entreno: sigue tu rutina y come según tu plan.' },
};

function kcalDe(comida) {
  return comida ? { nombre: comida.nombre, kcal: comida.kcal, proteina: comida.proteina, carbs: comida.carbs, grasa: comida.grasa } : null;
}

/**
 * @param {object} d
 * @param {string} d.fecha        'YYYY-MM-DD'
 * @param {string} d.dia          'Lunes'…'Domingo'
 * @param {object|null} d.plan    { rutinaSemanal, planAlimenticio } o null si no hizo el perfil médico
 * @param {boolean} d.saludHoy    si ya registró su salud hoy
 * @param {object|null} d.listo   resultado de calcularListo
 * @param {string|null} d.sesion  'completo' | 'parcial' | null (lo que marcó hoy)
 * @param {string[]} d.comidasHoy tipos de las comidas que apuntó hoy ('desayuno', 'almuerzo'…)
 * @param {object|null} d.estadoMedico { estado, zonas, activas: [{ indicaciones }] }
 */
function construirHoy({ fecha, dia, plan, saludHoy, listo, sesion, comidasHoy = [], estadoMedico = null }) {
  const diaRutina = plan?.rutinaSemanal?.semana?.find(d => d.dia === dia) || null;
  const diaComidas = plan?.planAlimenticio?.semana?.find(d => d.dia === dia) || null;
  const tipoDia = diaComidas?.tipoDia || (diaRutina ? (diaRutina.ejercicios?.length ? 'entreno' : 'descanso') : null);
  const deBaja = estadoMedico?.estado === 'no_apto';
  const adaptado = estadoMedico?.estado === 'adaptado';
  const indicaciones = (estadoMedico?.activas || []).map(l => l.indicaciones).filter(Boolean).join(' · ');
  const zonas = (estadoMedico?.zonas || []).join(', ');

  const contexto = deBaja
    ? { icono: '🩹', etiqueta: 'Baja médica', mensaje: `Estás de baja (${zonas}): hoy tu trabajo es recuperarte.${indicaciones ? ` Indicaciones del médico: ${indicaciones}` : ''}` }
    : CONTEXTO[tipoDia] || { icono: '📋', etiqueta: 'Hoy', mensaje: 'Completa tu perfil médico en Mi Plan para tener tu rutina y tus comidas de cada día.' };

  const tareas = [];

  tareas.push({
    id: 'salud',
    estado: saludHoy ? 'hecho' : 'pendiente',
    titulo: saludHoy ? 'Registraste cómo amaneciste' : 'Registra cómo amaneciste',
    detalle: saludHoy && listo?.puntaje != null ? `Listo para entrenar: ${listo.puntaje}/100. ${listo.mensaje}` : saludHoy ? listo?.mensaje || '' : 'Fatiga, sueño y recuperación: 10 segundos. Con eso sabemos si hoy toca apretar o bajar el ritmo.',
    accion: saludHoy ? null : 'salud',
  });

  if (!plan) {
    tareas.push({ id: 'plan', estado: 'pendiente', titulo: 'Completa tu perfil médico', detalle: 'Con él armamos tu rutina y tu plan de comidas según tu deporte, tu posición y tu cuerpo.', accion: 'plan' });
  } else if (diaRutina) {
    const ejercicios = diaRutina.ejercicios?.length || 0;
    const entreno = { id: 'entreno', titulo: diaRutina.tipo || 'Entreno', accion: 'rutina', ejercicios };
    if (!ejercicios) {
      Object.assign(entreno, { estado: 'descanso', titulo: 'Hoy no hay sesión', detalle: 'Descanso activo: estiramientos suaves.' });
    } else if (deBaja) {
      Object.assign(entreno, { estado: 'baja', titulo: 'Entreno en pausa', detalle: 'Estás de baja médica: no hagas la sesión hasta que el médico te dé el alta.' });
    } else {
      const aviso = adaptado ? `Adaptado por tu lesión (${zonas}): haz solo lo que te indicó el médico.`
        : listo?.nivel === 'bajo' ? 'Tu cuerpo pide descanso: hoy mejor una sesión suave o recuperación activa.'
        : listo?.nivel === 'medio' ? 'Hazla, pero baja la intensidad un 20 %.'
        : '';
      Object.assign(entreno, {
        estado: sesion === 'completo' ? 'hecho' : sesion === 'parcial' ? 'parcial' : 'pendiente',
        detalle: `${ejercicios} ${ejercicios === 1 ? 'ejercicio' : 'ejercicios'}${aviso ? ` · ${aviso}` : ''}`,
      });
    }
    tareas.push(entreno);
  }

  const apuntadas = new Set(comidasHoy.map(t => String(t).toLowerCase()));
  if (diaComidas) {
    for (const { toma, titulo } of COMIDAS_PRINCIPALES) {
      const comida = kcalDe(diaComidas[toma]);
      if (!comida?.kcal) continue; // "Sin opción segura": no se pide registrarla
      tareas.push({ id: toma, estado: apuntadas.has(toma) ? 'hecho' : 'pendiente', titulo, comida, tipoRegistro: toma });
    }
  }

  const cuentan = tareas.filter(t => ['hecho', 'parcial', 'pendiente'].includes(t.estado));
  const meriendas = diaComidas ? ['meriendaMañana', 'meriendaTarde'].map(t => kcalDe(diaComidas[t])).filter(c => c?.kcal) : [];
  const competicion = tipoDia === 'partido' || tipoDia === 'precompetencia';

  return {
    fecha, dia, tipoDia,
    ...contexto,
    tareas,
    progreso: { hechas: cuentan.filter(t => t.estado !== 'pendiente').length, total: cuentan.length },
    objetivo: diaComidas?.objetivo ? { kcal: diaComidas.objetivo.kcal, proteina: diaComidas.objetivo.proteina, carbs: diaComidas.objetivo.carbs, grasa: diaComidas.objetivo.grasa } : null,
    meriendas,
    consejos: [
      diaComidas?.objetivo?.aguaLitros ? `💧 Agua: ${String(diaComidas.objetivo.aguaLitros).replace('.', ',')} L` : null,
      competicion ? '😴 Duerme 8-9 h' : '😴 Duerme 7-9 h',
    ].filter(Boolean),
  };
}

module.exports = { construirHoy, CONTEXTO };
