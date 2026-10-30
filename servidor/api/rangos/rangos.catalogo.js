/**
 * Rangos de Bronce a Radiante (funciones puras).
 *
 * 8 rangos; los 7 primeros con 3 divisiones (I, II, III), Radiante es el tope: 22 pasos (0-21).
 * Cada marca se compara con 5 referencias (principiante, novato, intermedio, avanzado, élite):
 *   principiante → Plata I · novato → Oro I · intermedio → Platino I · avanzado → Rubí I · élite → Radiante
 * y entre referencias se reparte en línea recta.
 *
 * Referencias ORIENTATIVAS, redondeadas a partir de tablas públicas de adultos que entrenan:
 * - Fuerza: 1RM estimado ÷ peso corporal (estándares tipo ExRx / Symmetric Strength). Con
 *   mancuernas, el peso de UNA mancuerna.
 * - Tests: valores habituales en adultos jóvenes activos y deportistas amateur (Yo-Yo, CMJ,
 *   sprints, Cooper…). No se ajustan por edad: sirven para ver tu progreso, no para diagnosticar.
 * Sin sexo indicado se usa el punto medio entre las referencias de hombres y mujeres.
 */

const RANGOS = [
  { id: 'bronce',    nombre: 'Bronce',    color: '#b0703c' },
  { id: 'plata',     nombre: 'Plata',     color: '#94a3b8' },
  { id: 'oro',       nombre: 'Oro',       color: '#eab308' },
  { id: 'platino',   nombre: 'Platino',   color: '#38bdf8' },
  { id: 'esmeralda', nombre: 'Esmeralda', color: '#10b981' },
  { id: 'rubi',      nombre: 'Rubí',      color: '#e11d48' },
  { id: 'diamante',  nombre: 'Diamante',  color: '#6366f1' },
  { id: 'radiante',  nombre: 'Radiante',  color: '#f59e0b' },
];
const DIVISIONES = ['I', 'II', 'III'];
const PASO_MAX = (RANGOS.length - 1) * DIVISIONES.length; // 21: Radiante

// Paso que corresponde a cada referencia (principiante … élite)
const PASOS_REFERENCIA = [3, 6, 9, 15, 21];

/** Fuerza: patrón del nombre del ejercicio → referencias de 1RM ÷ peso corporal [hombres, mujeres]. */
const FUERZA = [
  { id: 'sentadilla',    patron: /^sentadilla con barra/i,                       h: [0.75, 1.25, 1.5, 2.0, 2.5],  m: [0.5, 0.85, 1.1, 1.5, 1.9] },
  { id: 'banca',         patron: /^press de banca con barra/i,                   h: [0.5, 0.8, 1.1, 1.5, 1.85],   m: [0.3, 0.5, 0.7, 0.95, 1.2] },
  { id: 'bancaMancuernas', patron: /^press (de banca|inclinado) con mancuernas/i, h: [0.15, 0.25, 0.37, 0.5, 0.62], m: [0.08, 0.14, 0.2, 0.28, 0.36], mancuerna: true },
  { id: 'pesoMuerto',    patron: /^peso muerto( \d|$)/i,                          h: [1.0, 1.5, 1.9, 2.4, 2.9],    m: [0.7, 1.05, 1.4, 1.8, 2.2] },
  { id: 'rumano',        patron: /^peso muerto rumano/i,                          h: [0.6, 1.0, 1.35, 1.75, 2.1],  m: [0.45, 0.7, 0.95, 1.25, 1.55] },
  { id: 'militar',       patron: /^press militar/i,                               h: [0.35, 0.55, 0.75, 1.0, 1.25], m: [0.2, 0.35, 0.5, 0.65, 0.8] },
  { id: 'hipThrust',     patron: /^hip thrust/i,                                  h: [0.75, 1.25, 1.75, 2.3, 2.8], m: [0.6, 1.0, 1.5, 2.0, 2.5] },
  { id: 'prensa',        patron: /^prensa de piernas/i,                           h: [1.5, 2.25, 3.0, 3.75, 4.5],  m: [1.0, 1.6, 2.2, 2.8, 3.4] },
  { id: 'remoMancuerna', patron: /^remo con mancuerna/i,                          h: [0.2, 0.32, 0.45, 0.6, 0.75], m: [0.12, 0.2, 0.28, 0.38, 0.48], mancuerna: true },
  { id: 'curl',          patron: /^curl de b[ií]ceps con mancuernas/i,            h: [0.1, 0.17, 0.25, 0.33, 0.42], m: [0.06, 0.1, 0.15, 0.2, 0.26], mancuerna: true },
];

/** Tests físicos (ids del módulo evaluaciones) → referencias en su unidad [hombres, mujeres]. */
const TESTS = {
  cmj:             { h: [25, 33, 40, 48, 58],            m: [18, 24, 30, 36, 44] },
  sprint10:        { h: [2.1, 1.95, 1.82, 1.72, 1.62],    m: [2.3, 2.15, 2.02, 1.92, 1.82] },
  sprint20:        { h: [3.6, 3.35, 3.15, 3.0, 2.88],     m: [3.95, 3.7, 3.48, 3.3, 3.15] },
  sprint30:        { h: [5.0, 4.65, 4.35, 4.15, 3.98],    m: [5.5, 5.15, 4.85, 4.62, 4.42] },
  agilidad5105:    { h: [5.6, 5.2, 4.9, 4.65, 4.45],      m: [6.1, 5.7, 5.35, 5.1, 4.9] },
  laneAgility:     { h: [13.0, 12.2, 11.6, 11.1, 10.7],   m: [14.0, 13.2, 12.6, 12.1, 11.7] },
  yoyo1:           { h: [600, 1000, 1600, 2200, 2700],    m: [400, 700, 1100, 1500, 1900] },
  balonMedicinal:  { h: [6, 8, 10, 12, 14],               m: [4.5, 6, 7.5, 9, 10.5] },
  saltoHorizontal: { h: [170, 200, 225, 250, 275],        m: [130, 155, 180, 200, 220] },
  cooper:          { h: [1900, 2300, 2700, 3000, 3300],   m: [1600, 1900, 2300, 2600, 2900] },
  carrera5k:       { h: [2100, 1740, 1500, 1290, 1110],   m: [2340, 1980, 1710, 1470, 1260] },
  nado50:          { h: [50, 40, 33, 29, 26],             m: [56, 45, 37, 32, 29] },
  nado400:         { h: [600, 480, 390, 330, 290],        m: [660, 530, 430, 365, 320] },
  flexiones:       { h: [10, 20, 30, 45, 60],             m: [5, 12, 20, 30, 40] },
  sentarse30:      { h: [10, 13, 16, 20, 25],             m: [9, 12, 15, 19, 23] },
  plancha:         { h: [30, 60, 90, 150, 240],           m: [25, 50, 80, 130, 210] },
  caminata6:       { h: [450, 520, 600, 680, 760],        m: [420, 490, 560, 640, 720] },
};

/** Referencias según el sexo (punto medio si no se indicó). */
function referenciasPara(def, sexo) {
  if (sexo === 'Hombre') return def.h;
  if (sexo === 'Mujer') return def.m;
  return def.h.map((v, i) => (v + def.m[i]) / 2);
}

/**
 * Puntos (valor → paso) de la escala. Antes de "principiante" se baja hasta Bronce I a la misma
 * distancia que hay entre principiante y novato (sirve igual si menos es mejor: el tramo va al revés).
 */
function escala(refs) {
  const inicio = refs[0] - (refs[1] - refs[0]);
  return [[inicio, 0], ...refs.map((v, i) => [v, PASOS_REFERENCIA[i]])];
}

/** Paso (0-21) de un valor. */
function pasoDe(valor, refs) {
  return Math.min(PASO_MAX, Math.floor(pasoExacto(valor, refs) + 1e-9));
}

/** Paso con decimales: la parte decimal es cuánto llevas hacia el siguiente (0,62 = 62 %). */
function pasoExacto(valor, refs) {
  const puntos = escala(refs);
  const mejora = refs[1] > refs[0]; // ¿más es mejor?
  const mejorQue = (a, b) => (mejora ? a >= b : a <= b);
  if (!mejorQue(valor, puntos[0][0])) return 0;
  if (mejorQue(valor, puntos.at(-1)[0])) return PASO_MAX;
  for (let i = 1; i < puntos.length; i++) {
    const [v0, p0] = puntos[i - 1], [v1, p1] = puntos[i];
    if (mejorQue(valor, v0) && !mejorQue(valor, v1)) {
      return Math.min(PASO_MAX, p0 + ((valor - v0) / (v1 - v0)) * (p1 - p0));
    }
  }
  return PASO_MAX;
}

/** Valor mínimo que hace falta para llegar a un paso (el inverso de pasoDe). */
function valorParaPaso(paso, refs) {
  const puntos = escala(refs);
  for (let i = 1; i < puntos.length; i++) {
    const [v0, p0] = puntos[i - 1], [v1, p1] = puntos[i];
    if (paso >= p0 && paso <= p1) return v0 + ((paso - p0) / (p1 - p0)) * (v1 - v0);
  }
  return puntos.at(-1)[0];
}

/** { id, nombre, division, color, paso, etiqueta } de un paso. */
function rangoDe(paso) {
  const p = Math.max(0, Math.min(PASO_MAX, paso));
  if (p === PASO_MAX) return { ...RANGOS.at(-1), division: null, paso: p, etiqueta: RANGOS.at(-1).nombre };
  const r = RANGOS[Math.floor(p / DIVISIONES.length)];
  const division = DIVISIONES[p % DIVISIONES.length];
  return { ...r, division, paso: p, etiqueta: `${r.nombre} ${division}` };
}

function ejercicioDeFuerza(nombre) {
  return FUERZA.find(f => f.patron.test(String(nombre || '').trim())) || null;
}

module.exports = {
  RANGOS, DIVISIONES, PASO_MAX, PASOS_REFERENCIA, FUERZA, TESTS,
  referenciasPara, pasoDe, pasoExacto, valorParaPaso, rangoDe, ejercicioDeFuerza,
};
