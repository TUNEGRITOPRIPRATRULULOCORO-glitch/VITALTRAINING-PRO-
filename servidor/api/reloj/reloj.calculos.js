/**
 * Sesiones del reloj o del pulsómetro (funciones puras): zonas de pulso, carga y esfuerzo.
 *
 * - FC máxima: fórmula de Tanaka (208 − 0,7 × edad); si en la sesión se vio un pulso más alto, ese.
 * - Zonas por % de la FC máxima: Z1 50-60 %, Z2 60-70 %, Z3 70-80 %, Z4 80-90 %, Z5 90 % o más.
 * - Carga TRIMP (de Edwards): minutos en cada zona × número de la zona.
 * - Esfuerzo (RPE 1-10) estimado = zona media × 2. Así la sesión del reloj cuenta en la carga
 *   aguda/crónica igual que las que se registran a mano (minutos × RPE).
 */

const EDAD_POR_DEFECTO = 20;
const LIMITES_ZONA = [0.5, 0.6, 0.7, 0.8, 0.9];
const PULSO = { min: 30, max: 240 };      // fuera de esto es un error del sensor
const PUNTOS_GRAFICA = 360;               // la curva que se guarda para la gráfica

function fcMaxTeorica(edad) {
  const e = Number(edad) > 0 ? Number(edad) : EDAD_POR_DEFECTO;
  return Math.round(208 - 0.7 * e);
}

/** 1-5, o 0 si está por debajo del 50 % (reposo). */
function zonaDe(bpm, fcMax) {
  const p = bpm / fcMax;
  return LIMITES_ZONA.filter(l => p >= l).length;
}

const pulsoValido = b => b >= PULSO.min && b <= PULSO.max;

function intensidadDe(rpe) {
  if (rpe <= 3) return 'Baja';
  if (rpe <= 6) return 'Media';
  if (rpe <= 8) return 'Alta';
  return 'Muy alta';
}

/**
 * @param {{ duracionSeg: number, pulsos: number[], intervaloSeg: number, edad?: number }} s
 *        pulsos: un valor cada `intervaloSeg` segundos (0 o vacío = sin dato en ese momento)
 */
function resumir({ duracionSeg, pulsos = [], intervaloSeg = 5, edad }) {
  const minutos = Math.max(1, Math.round(Number(duracionSeg) / 60));
  const validos = pulsos.map(Number).filter(pulsoValido);
  if (!validos.length) {
    return { minutos, fcMedia: null, fcMax: null, fcMaxUsada: null, zonas: null, trimp: null, rpe: null, intensidad: null };
  }
  const fcMax = Math.max(...validos);
  const fcMaxUsada = Math.max(fcMaxTeorica(edad), fcMax);
  const zonas = [0, 0, 0, 0, 0]; // minutos en Z1..Z5
  for (const b of validos) {
    const z = zonaDe(b, fcMaxUsada);
    if (z) zonas[z - 1] += intervaloSeg / 60;
  }
  const trimp = Math.round(zonas.reduce((t, m, i) => t + m * (i + 1), 0));
  const rpe = Math.min(10, Math.max(1, Math.round((trimp / minutos) * 2)));
  return {
    minutos,
    fcMedia: Math.round(validos.reduce((t, b) => t + b, 0) / validos.length),
    fcMax,
    fcMaxUsada,
    zonas: zonas.map(m => Math.round(m * 10) / 10),
    trimp,
    rpe,
    intensidad: intensidadDe(rpe),
  };
}

/** Curva reducida a `max` puntos (media de cada tramo, sin contar los huecos) para la gráfica. */
function reducir(pulsos, intervaloSeg, max = PUNTOS_GRAFICA) {
  const grupo = Math.max(1, Math.ceil(pulsos.length / max));
  const curva = [];
  for (let i = 0; i < pulsos.length; i += grupo) {
    const tramo = pulsos.slice(i, i + grupo).map(Number).filter(pulsoValido);
    curva.push(tramo.length ? Math.round(tramo.reduce((t, b) => t + b, 0) / tramo.length) : 0);
  }
  return { pulsos: curva, intervaloSeg: intervaloSeg * grupo };
}

module.exports = { fcMaxTeorica, zonaDe, intensidadDe, resumir, reducir };
