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
};

const BATERIAS = {
  'Fútbol':     ['sprint10', 'sprint30', 'cmj', 'agilidad5105', 'yoyo1'],
  'Baloncesto': ['sprint20', 'cmj', 'laneAgility', 'agilidad5105', 'yoyo1'],
  'Tenis':      ['sprint10', 'agilidad5105', 'cmj', 'balonMedicinal', 'yoyo1'],
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

  const fechas = resultados.map(r => r.fecha).sort();
  const ultimaFecha = fechas.at(-1) || null;
  const diasDesde = ultimaFecha ? diasEntre(ultimaFecha, hoy) : null;
  let proxima = 'sin-datos';
  if (diasDesde !== null) proxima = diasDesde > DIAS_RECOMENDADOS.max ? 'atrasada' : diasDesde >= DIAS_RECOMENDADOS.min ? 'toca' : 'al-dia';

  return { deporte: BATERIAS[deporte] ? deporte : 'Fútbol', pruebas, ultimaFecha, diasDesde, proxima, recomendacion: DIAS_RECOMENDADOS };
}

module.exports = { PRUEBAS, BATERIAS, pruebasDe, validarValor, compararCon, resumir, DIAS_RECOMENDADOS };
