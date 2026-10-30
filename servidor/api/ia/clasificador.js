/**
 * Clasificador de intenciones de Vita: usa el modelo entrenado en Python (ml/entrenar.py)
 * sin necesitar Python. Repite las mismas cuentas que scikit-learn:
 *
 *   1. Texto en minúsculas y sin tildes (strip_accents="unicode").
 *   2. Trozos de 2 a 4 letras dentro de cada palabra, con un espacio a cada lado ("char_wb").
 *   3. TF-IDF: frecuencia sublineal (1 + ln tf) × idf, y normalización L2.
 *   4. Regresión logística multinomial: puntaje = pesos · x + intercepto, y softmax.
 *
 * El test __tests__/clasificador.test.js comprueba que da las mismas probabilidades que Python.
 */
const path = require('path');

const RUTA_MODELO = path.join(__dirname, 'modelo-intenciones.json');
let modelo = null;

function cargar() {
  if (!modelo) {
    const m = require(RUTA_MODELO);
    modelo = { ...m, idf: Float64Array.from(m.vectorizador.idf), vocabulario: new Map(Object.entries(m.vectorizador.vocabulario)) };
  }
  return modelo;
}

/** Igual que el preprocesador de scikit-learn: minúsculas y luego quitar tildes (NFKD sin marcas). */
function preprocesar(texto) {
  return String(texto).toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '');
}

/** Trozos de letras como _char_wb_ngrams de scikit-learn (cuenta por caracteres reales, no UTF-16). */
function ngramas(texto, minimo, maximo) {
  const lista = [];
  const limpio = texto.replace(/\s\s+/g, ' ');
  for (const palabra of limpio.split(/\s+/).filter(Boolean)) {
    const w = Array.from(` ${palabra} `);
    for (let n = minimo; n <= maximo; n++) {
      let inicio = 0;
      lista.push(w.slice(inicio, inicio + n).join(''));
      while (inicio + n < w.length) {
        inicio++;
        lista.push(w.slice(inicio, inicio + n).join(''));
      }
      if (inicio === 0) break; // palabra más corta que n: se cuenta una sola vez
    }
  }
  return lista;
}

/** Vector TF-IDF disperso: Map índice → valor. */
function vectorizar(texto, m) {
  const [minimo, maximo] = m.vectorizador.ngramas;
  const cuentas = new Map();
  for (const g of ngramas(preprocesar(texto), minimo, maximo)) {
    const i = m.vocabulario.get(g);
    if (i !== undefined) cuentas.set(i, (cuentas.get(i) || 0) + 1);
  }
  let norma = 0;
  for (const [i, tf] of cuentas) {
    const v = (1 + Math.log(tf)) * m.idf[i];
    cuentas.set(i, v);
    norma += v * v;
  }
  norma = Math.sqrt(norma);
  if (norma > 0) for (const [i, v] of cuentas) cuentas.set(i, v / norma);
  return cuentas;
}

/**
 * @returns {{ intencion: string, confianza: number, segura: boolean,
 *             ranking: { intencion: string, probabilidad: number }[] }}
 */
function clasificar(texto) {
  const m = cargar();
  const x = vectorizar(texto, m);
  const puntajes = m.coeficientes.map((pesos, k) => {
    let s = m.interceptos[k];
    for (const [i, v] of x) s += pesos[i] * v;
    return s;
  });
  const maximo = Math.max(...puntajes);
  const exps = puntajes.map(s => Math.exp(s - maximo));
  const suma = exps.reduce((a, b) => a + b, 0);
  const ranking = exps
    .map((e, k) => ({ intencion: m.clases[k], probabilidad: e / suma }))
    .sort((a, b) => b.probabilidad - a.probabilidad);
  return {
    intencion: ranking[0].intencion,
    confianza: ranking[0].probabilidad,
    segura: ranking[0].probabilidad >= m.umbral_confianza,
    ranking,
  };
}

/** Datos del modelo para mostrar (sin los pesos). */
function informacion() {
  const m = cargar();
  return { entrenado: m.entrenado, algoritmo: m.algoritmo, frases: m.frases, clases: m.clases, umbral: m.umbral_confianza, metricas: m.metricas };
}

module.exports = { clasificar, informacion, preprocesar, ngramas };
