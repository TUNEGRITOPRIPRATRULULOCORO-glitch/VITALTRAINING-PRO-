/**
 * Cálculos de rendimiento — funciones puras, sin acceso a base de datos.
 * Todas las fechas se manejan como texto 'YYYY-MM-DD' (UTC), igual que el resto de la app.
 */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// RPE (esfuerzo percibido 1-10) estimado cuando la sesión solo tiene intensidad
const RPE_POR_INTENSIDAD = { baja: 3, media: 5, alta: 7 };
const RPE_POR_DEFECTO = 5;
const MINUTOS_POR_DEFECTO = 60;

const VENTANA_DIAS = 28;
const MIN_DIAS_CARGA = 14; // con menos historial, la comparación aguda/crónica no es fiable

// ─── Fechas ───────────────────────────────────────────────────────────────────

const { aFechaISO, sumarDias, ultimosDias } = require('../../compartido/fechas');

function nombreDia(fechaISO) {
  return DIAS[new Date(`${fechaISO}T00:00:00Z`).getUTCDay()];
}

function diasEntre(desdeISO, hastaISO) {
  return Math.round((new Date(`${hastaISO}T00:00:00Z`) - new Date(`${desdeISO}T00:00:00Z`)) / 86400000);
}

// ─── Carga de entrenamiento ───────────────────────────────────────────────────

/** Carga de una sesión = minutos × RPE (método sRPE de Foster). */
function cargaSesion({ minutos, rpe, intensidad }) {
  const mins = Number(minutos) > 0 ? Number(minutos) : MINUTOS_POR_DEFECTO;
  const esfuerzo = Number(rpe) >= 1
    ? Number(rpe)
    : RPE_POR_INTENSIDAD[String(intensidad || '').toLowerCase()] || RPE_POR_DEFECTO;
  return mins * esfuerzo;
}

/**
 * Compara la carga de los últimos 7 días (aguda) con el promedio semanal de los
 * últimos 28 (crónica). Un ratio por encima de 1,5 se asocia a más riesgo de lesión.
 */
function calcularCarga(sesiones, hoy) {
  const dias = ultimosDias(hoy, VENTANA_DIAS);
  const porDia = Object.fromEntries(dias.map(f => [f, 0]));

  let primeraFecha = null;
  for (const s of sesiones) {
    const fecha = aFechaISO(s.fecha);
    if (!(fecha in porDia)) continue;
    porDia[fecha] += cargaSesion(s);
    if (!primeraFecha || fecha < primeraFecha) primeraFecha = fecha;
  }

  const serie = dias.map(fecha => ({ fecha, carga: porDia[fecha] }));
  const aguda = serie.slice(-7).reduce((t, d) => t + d.carga, 0);
  const total = serie.reduce((t, d) => t + d.carga, 0);
  const diasConHistorial = primeraFecha ? diasEntre(primeraFecha, hoy) + 1 : 0;

  if (diasConHistorial < MIN_DIAS_CARGA) {
    return {
      aguda, cronica: null, ratio: null, cambioPorcentaje: null, riesgo: 'sin-datos', serie,
      titulo: 'Aún sin datos',
      mensaje: `Necesitamos ${MIN_DIAS_CARGA} días de entrenamientos registrados para comparar tus semanas.`,
      consejo: 'Marca tus sesiones como completadas en Mi Plan.'
    };
  }

  // Promedio semanal sobre los días que realmente hay historial (máx. 28)
  const cronica = Math.round(total / (diasConHistorial / 7));
  const ratio = cronica > 0 ? Math.round((aguda / cronica) * 100) / 100 : null;
  // Cuánto más (o menos) entrenó esta semana respecto a su semana normal, en %
  const cambioPorcentaje = ratio === null ? null : Math.round((ratio - 1) * 100);
  return { aguda, cronica, ratio, cambioPorcentaje, serie, ...clasificarRatio(ratio) };
}

/** Riesgo + textos en lenguaje sencillo para el atleta. */
function clasificarRatio(ratio) {
  if (ratio === null) return {
    riesgo: 'sin-datos', titulo: 'Sin entrenamientos recientes',
    mensaje: 'No registraste entrenamientos en las últimas semanas.',
    consejo: 'Marca tus sesiones como completadas en Mi Plan.'
  };
  if (ratio > 1.5) return {
    riesgo: 'alto', titulo: 'Demasiada carga',
    mensaje: 'Esta semana entrenaste mucho más de lo normal para ti. Así aumenta el riesgo de lesión.',
    consejo: 'Baja la intensidad durante 2 o 3 días.'
  };
  if (ratio > 1.3) return {
    riesgo: 'precaucion', titulo: 'Carga en aumento',
    mensaje: 'Estás entrenando más de lo habitual.',
    consejo: 'Mantén este nivel y no subas más esta semana.'
  };
  if (ratio >= 0.8) return {
    riesgo: 'optimo', titulo: 'Carga equilibrada',
    mensaje: 'Entrenas parecido a tu semana normal.',
    consejo: 'Sigue así: es la zona más segura para mejorar.'
  };
  return {
    riesgo: 'bajo', titulo: 'Carga baja',
    mensaje: 'Esta semana entrenaste menos de lo normal.',
    consejo: 'Si no tienes molestias, retoma tu plan poco a poco.'
  };
}

// ─── Listo para entrenar ──────────────────────────────────────────────────────

/**
 * Puntaje 0-100 a partir del registro de salud de hoy.
 * La fatiga resta; el sueño y la recuperación suman. Si la carga está en riesgo alto, resta 10.
 */
function calcularListo(saludHoy, riesgoCarga) {
  if (!saludHoy) {
    return { puntaje: null, nivel: 'sin-datos', mensaje: 'Registra tu salud de hoy para saber si estás listo para entrenar.' };
  }
  const { fatiga, sueno, recuperacion } = saludHoy;
  let puntaje = Math.round(((11 - fatiga) + sueno + recuperacion) / 30 * 100);
  if (riesgoCarga === 'alto') puntaje = Math.max(0, puntaje - 10);

  if (puntaje >= 75) return { puntaje, nivel: 'alto',  mensaje: 'Estás listo. Entrena según tu plan.' };
  if (puntaje >= 50) return { puntaje, nivel: 'medio', mensaje: 'Entrena, pero baja la intensidad un 20 %.' };
  return { puntaje, nivel: 'bajo', mensaje: 'Hoy toca descanso o recuperación activa.' };
}

// ─── Cumplimiento ─────────────────────────────────────────────────────────────

/** Lunes de la semana de una fecha (las semanas van de lunes a domingo). */
function lunesDe(fechaISO) {
  const diaSemana = new Date(`${fechaISO}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fechaISO, -((diaSemana + 6) % 7));
}

/**
 * Calendario de 4 semanas completas, de lunes a domingo, terminando en el domingo
 * de la semana actual (así cada día queda siempre en la misma columna).
 * Estados: completo | parcial | fallado (tocaba entrenar y no se registró)
 * | pendiente (hoy, aún sin registrar) | proximo (día de entreno que aún no llega)
 * | descanso | sin-plan (antes de tener plan)
 */
function calcularCumplimiento(rutinaSemanal, registros, hoy, inicioPlan) {
  const diasConEntreno = new Set(
    (rutinaSemanal?.semana || []).filter(d => d.ejercicios?.length).map(d => d.dia)
  );
  const registroPorFecha = {};
  for (const r of registros) {
    const fecha = aFechaISO(r.fecha);
    // Si hay varios registros el mismo día, "completo" gana sobre "parcial"
    if (registroPorFecha[fecha] !== 'completo') registroPorFecha[fecha] = r.estado === 'parcial' ? 'parcial' : 'completo';
  }
  const inicio = aFechaISO(inicioPlan);

  const domingo = sumarDias(lunesDe(hoy), 6);
  const dias = ultimosDias(domingo, VENTANA_DIAS).map(fecha => {
    const dia = nombreDia(fecha);
    let estado;
    if (registroPorFecha[fecha])        estado = registroPorFecha[fecha];
    else if (inicio && fecha < inicio)  estado = 'sin-plan';
    else if (!diasConEntreno.has(dia))  estado = 'descanso';
    else if (fecha > hoy)               estado = 'proximo';
    else if (fecha === hoy)             estado = 'pendiente';
    else                                estado = 'fallado';
    return { fecha, dia, estado, hoy: fecha === hoy };
  });

  const cuenta = e => dias.filter(d => d.estado === e).length;
  const completos = cuenta('completo');
  const parciales = cuenta('parcial');
  const evaluados = completos + parciales + cuenta('fallado');
  const porcentaje = evaluados ? Math.round((completos + parciales * 0.5) / evaluados * 100) : null;

  return { dias, completos, parciales, fallados: cuenta('fallado'), porcentaje };
}

// ─── Racha ────────────────────────────────────────────────────────────────────

/** Días seguidos registrando salud, contando hasta hoy (o hasta ayer si hoy aún no registra). */
function calcularRacha(fechasSalud, hoy) {
  const fechas = new Set(fechasSalud.map(aFechaISO));
  let dia = fechas.has(hoy) ? hoy : sumarDias(hoy, -1);
  let racha = 0;
  while (fechas.has(dia)) {
    racha++;
    dia = sumarDias(dia, -1);
  }
  return racha;
}

module.exports = {
  aFechaISO, sumarDias, nombreDia,
  cargaSesion, calcularCarga, clasificarRatio,
  calcularListo, calcularCumplimiento, calcularRacha, lunesDe,
  VENTANA_DIAS
};
