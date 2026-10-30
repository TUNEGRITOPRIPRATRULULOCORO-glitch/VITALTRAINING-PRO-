/**
 * Tests físicos de campo por deporte (funciones puras).
 *
 * Se eligieron pruebas estándar con buena repetibilidad (test-retest ICC > 0,9 en estudios con
 * futbolistas): salto con contramovimiento, sprints de 10-30 m, agilidad y Yo-Yo IR1, que es la
 * prueba intermitente que más se relaciona con lo que se corre en un partido.
 *
 * "margen": cambio en % por debajo del cual la diferencia entre dos mediciones puede deberse al
 * error normal de la prueba (los estudios dan errores típicos de ~2-6 %). Solo se habla de mejora
 * o empeoramiento cuando el cambio lo supera.
 *
 * Deportes de resistencia: test de Cooper (12 min) y tiempo en 5 km; natación: 50 y 400 m libre.
 * "Estar en forma": pruebas sin material de la batería Senior Fitness Test (Rikli y Jones) y la
 * caminata de 6 minutos, válidas para cualquier nivel. En los tiempos largos el resultado se
 * escribe en segundos (5:30 = 330).
 */

const PRUEBAS = {
  cmj: {
    nombre: 'Salto con contramovimiento', corto: 'Salto (CMJ)', unidad: 'cm', mejor: 'mayor', margen: 4, min: 10, max: 90,
    mide: 'Potencia de piernas',
    instrucciones: 'Manos en la cintura, baja rápido y salta lo más alto posible. 3 intentos con 1 min de pausa; anota el mejor.',
  },
  sprint10: {
    nombre: 'Sprint 10 m', corto: 'Sprint 10 m', unidad: 's', mejor: 'menor', margen: 2, min: 1.3, max: 3.5, decimales: 2,
    mide: 'Aceleración',
    instrucciones: 'Salida parado, 30 cm detrás de la línea. 3 intentos con 2 min de pausa; anota el mejor tiempo.',
  },
  sprint20: {
    nombre: 'Sprint 20 m', corto: 'Sprint 20 m', unidad: 's', mejor: 'menor', margen: 2, min: 2.4, max: 5, decimales: 2,
    mide: 'Velocidad (unos 3/4 de cancha)',
    instrucciones: 'Salida parado. 3 intentos con 2 min de pausa; anota el mejor tiempo.',
  },
  sprint30: {
    nombre: 'Sprint 30 m', corto: 'Sprint 30 m', unidad: 's', mejor: 'menor', margen: 2, min: 3.4, max: 7, decimales: 2,
    mide: 'Velocidad máxima',
    instrucciones: 'Salida parado. 2-3 intentos con 3 min de pausa; anota el mejor tiempo.',
  },
  agilidad5105: {
    nombre: 'Agilidad 5-10-5', corto: 'Agilidad 5-10-5', unidad: 's', mejor: 'menor', margen: 3, min: 3.8, max: 7.5, decimales: 2,
    mide: 'Cambio de dirección',
    instrucciones: 'Desde el centro: 5 m a un lado, 10 m al otro y 5 m de vuelta al centro, tocando cada línea con la mano.',
  },
  laneAgility: {
    nombre: 'Lane agility', corto: 'Lane agility', unidad: 's', mejor: 'menor', margen: 3, min: 9, max: 16, decimales: 2,
    mide: 'Agilidad en la zona (prueba del draft NBA)',
    instrucciones: 'Rodea la zona: sprint al frente, desplazamiento lateral, carrera atrás y lateral; luego en sentido contrario.',
  },
  yoyo1: {
    nombre: 'Yo-Yo intermitente nivel 1', corto: 'Yo-Yo IR1', unidad: 'm', mejor: 'mayor', margen: 6, min: 40, max: 4000, decimales: 0,
    mide: 'Resistencia intermitente',
    instrucciones: 'Idas y vueltas de 20 m al ritmo de los pitidos, con 10 s de recuperación activa. Anota la distancia total recorrida.',
  },
  balonMedicinal: {
    nombre: 'Lanzamiento de balón medicinal (2 kg)', corto: 'Balón medicinal', unidad: 'm', mejor: 'mayor', margen: 5, min: 2, max: 25, decimales: 1,
    mide: 'Potencia de tronco y brazos',
    instrucciones: 'De pie, de lado, lanza con giro de cadera como un golpe de derecha. 3 intentos por lado; anota el mejor.',
  },
  saltoHorizontal: {
    nombre: 'Salto de longitud sin impulso', corto: 'Salto horizontal', unidad: 'cm', mejor: 'mayor', margen: 3, min: 80, max: 380, decimales: 0,
    mide: 'Potencia horizontal de piernas',
    instrucciones: 'Pies detrás de la línea, balancea los brazos y salta lo más lejos posible. Mide hasta el talón más cercano. 3 intentos.',
  },
  cooper: {
    nombre: 'Test de Cooper (12 minutos)', corto: 'Cooper 12 min', unidad: 'm', mejor: 'mayor', margen: 4, min: 800, max: 5000, decimales: 0,
    mide: 'Resistencia aeróbica',
    instrucciones: 'Corre (o camina si hace falta) la mayor distancia posible en 12 minutos, mejor en pista. Anota los metros.',
  },
  carrera5k: {
    nombre: 'Carrera de 5 km', corto: '5 km', unidad: 's', mejor: 'menor', margen: 2, min: 780, max: 3600, decimales: 0,
    mide: 'Rendimiento en carrera',
    instrucciones: 'Corre 5 km a tu mejor ritmo en terreno llano. Escribe el tiempo en segundos (25:30 = 1530).',
  },
  nado50: {
    nombre: '50 m libre', corto: '50 m libre', unidad: 's', mejor: 'menor', margen: 1.5, min: 20, max: 120, decimales: 2,
    mide: 'Velocidad en el agua',
    instrucciones: 'Salida desde el poyete o desde el agua (anota cuál y repite siempre igual). Un intento a máxima velocidad.',
  },
  nado400: {
    nombre: '400 m libre', corto: '400 m libre', unidad: 's', mejor: 'menor', margen: 1.5, min: 230, max: 900, decimales: 0,
    mide: 'Resistencia en el agua',
    instrucciones: 'Nada 400 m a tu mejor ritmo. Escribe el tiempo en segundos (6:15 = 375).',
  },
  flexiones: {
    nombre: 'Flexiones en 1 minuto', corto: 'Flexiones 1 min', unidad: 'rep', mejor: 'mayor', margen: 8, min: 1, max: 120, decimales: 0,
    mide: 'Resistencia de brazos y pecho',
    instrucciones: 'Cuerpo recto, baja hasta que el pecho quede a un puño del suelo. Cuenta las completas en 1 minuto (puedes apoyar rodillas, pero siempre igual).',
  },
  sentarse30: {
    nombre: 'Sentarse y levantarse en 30 segundos', corto: 'Silla 30 s', unidad: 'rep', mejor: 'mayor', margen: 10, min: 1, max: 60, decimales: 0,
    mide: 'Fuerza de piernas',
    instrucciones: 'Silla sin ruedas contra la pared, brazos cruzados. Cuenta cuántas veces te levantas del todo en 30 segundos.',
  },
  plancha: {
    nombre: 'Plancha frontal', corto: 'Plancha', unidad: 's', mejor: 'mayor', margen: 10, min: 5, max: 600, decimales: 0,
    mide: 'Resistencia del tronco',
    instrucciones: 'Apoyado en antebrazos y puntas de los pies, cuerpo recto. Para cuando la cadera se hunda o suba. Anota los segundos.',
  },
  caminata6: {
    nombre: 'Caminata de 6 minutos', corto: 'Caminata 6 min', unidad: 'm', mejor: 'mayor', margen: 5, min: 150, max: 1100, decimales: 0,
    mide: 'Resistencia para el día a día',
    instrucciones: 'Camina lo más rápido que puedas (sin correr) durante 6 minutos en un recorrido medido. Anota los metros.',
  },
};

const BATERIAS = {
  'Fútbol':     ['sprint10', 'sprint30', 'cmj', 'agilidad5105', 'yoyo1'],
  'Baloncesto': ['sprint20', 'cmj', 'laneAgility', 'agilidad5105', 'yoyo1'],
  'Tenis':      ['sprint10', 'agilidad5105', 'cmj', 'balonMedicinal', 'yoyo1'],
  'Béisbol':    ['sprint30', 'agilidad5105', 'cmj', 'balonMedicinal'],
  'Atletismo':  ['sprint30', 'cmj', 'saltoHorizontal', 'balonMedicinal', 'cooper'],
  'Running':    ['cooper', 'carrera5k', 'cmj'],
  'Natación':   ['nado50', 'nado400', 'cmj', 'flexiones'],
  'Boxeo':      ['balonMedicinal', 'cmj', 'flexiones', 'cooper'],
  'Gimnasio':   ['flexiones', 'plancha', 'cmj', 'saltoHorizontal'],
  'Estar en forma': ['sentarse30', 'flexiones', 'plancha', 'caminata6'],
};

const DIAS_RECOMENDADOS = { min: 28, max: 42 }; // repetir cada 4-6 semanas

function pruebasDe(deporte) {
  const claves = BATERIAS[deporte] || BATERIAS['Fútbol'];
  return claves.map(id => ({ id, ...PRUEBAS[id] }));
}

/** Comprueba que el valor tenga sentido para la prueba. Devuelve un mensaje de error o null. */
function validarValor(pruebaId, valor) {
  const p = PRUEBAS[pruebaId];
  if (!p) return 'Prueba desconocida.';
  const n = Number(valor);
  if (!Number.isFinite(n)) return 'El resultado debe ser un número.';
  if (n < p.min || n > p.max) return `Para ${p.corto} el resultado debe estar entre ${p.min} y ${p.max} ${p.unidad}.`;
  return null;
}

/**
 * Compara una medición con la anterior: cambio en % (positivo = mejora, sea la prueba
 * de "más es mejor" o de "menos es mejor") y si supera el margen de error de la prueba.
 */
function compararCon(prueba, actual, anterior) {
  if (anterior == null) return { cambioPct: null, tendencia: 'primera' };
  const bruto = ((actual - anterior) / anterior) * 100;
  const cambioPct = Math.round((prueba.mejor === 'mayor' ? bruto : -bruto) * 10) / 10;
  if (Math.abs(cambioPct) < prueba.margen) return { cambioPct, tendencia: 'estable' };
  return { cambioPct, tendencia: cambioPct > 0 ? 'mejora' : 'empeora' };
}

function diasEntre(desde, hasta) {
  return Math.round((new Date(`${hasta}T00:00:00Z`) - new Date(`${desde}T00:00:00Z`)) / 86400000);
}

/**
 * Resumen por prueba: historial ordenado, última, anterior, mejor marca (mejorMarca) y tendencia.
 * ("mejor" sigue siendo la dirección de la prueba: "mayor" o "menor".)
 * resultados: [{ id, prueba, valor, fecha (YYYY-MM-DD), notas, registradoPor }]
 */
function resumir(deporte, resultados, hoy) {
  const pruebas = pruebasDe(deporte).map(p => {
    const historial = resultados
      .filter(r => r.prueba === p.id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
    const ultimo = historial.at(-1) || null;
    const anterior = historial.at(-2) || null;
    const mejorMarca = historial.reduce((m, r) =>
      !m || (p.mejor === 'mayor' ? r.valor > m.valor : r.valor < m.valor) ? r : m, null);
    return {
      ...p,
      historial,
      ultimo,
      anterior,
      mejorMarca,
      ...(ultimo ? compararCon(p, ultimo.valor, anterior?.valor) : { cambioPct: null, tendencia: 'sin-datos' }),
    };
  });

  const fechas = resultados.map(r => r.fecha).sort((a, b) => a.localeCompare(b));
  const ultimaFecha = fechas.at(-1) || null;
  const diasDesde = ultimaFecha ? diasEntre(ultimaFecha, hoy) : null;
  let proxima = 'sin-datos';
  if (diasDesde !== null) proxima = diasDesde > DIAS_RECOMENDADOS.max ? 'atrasada' : diasDesde >= DIAS_RECOMENDADOS.min ? 'toca' : 'al-dia';

  return { deporte: BATERIAS[deporte] ? deporte : 'Fútbol', pruebas, ultimaFecha, diasDesde, proxima, recomendacion: DIAS_RECOMENDADOS };
}

module.exports = { PRUEBAS, BATERIAS, pruebasDe, validarValor, compararCon, resumir, DIAS_RECOMENDADOS };
