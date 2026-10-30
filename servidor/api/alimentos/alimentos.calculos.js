/**
 * Productos por código de barras (funciones puras): validar el código, pasar lo que responde
 * Open Food Facts a nuestro formato y calcular lo que aporta la porción que se comió.
 * Los valores nutricionales van siempre por 100 g (o 100 ml), como en la etiqueta.
 */

/**
 * EAN-13, EAN-8, UPC-A (12) e ITF-14: solo dígitos y con su dígito de control correcto
 * (así un número mal escrito a mano no busca otro producto).
 */
function codigoValido(codigo) {
  const c = String(codigo || '');
  if (!/^(\d{8}|\d{12,14})$/.test(c)) return false;
  const digitos = c.split('').map(Number);
  const control = digitos.pop();
  // Desde la derecha, los dígitos pesan 3, 1, 3, 1…
  const suma = digitos.reverse().reduce((t, d, i) => t + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === control;
}

const redondear = (v, decimales = 1) => Math.round(v * 10 ** decimales) / 10 ** decimales;

/** Número o null (Open Food Facts deja campos vacíos o como texto). */
function numero(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? redondear(n) : null;
}

/**
 * Producto de Open Food Facts → { codigo, nombre, marca, kcal100, proteina100, carbohidratos100, grasa100, porcionG }.
 * null si no trae lo mínimo para registrar la comida (nombre y calorías).
 */
function desdeOpenFoodFacts(codigo, p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const nombre = String(p.product_name_es || p.product_name || p.generic_name_es || '').trim().slice(0, 160);
  // Si no hay kcal, se calculan desde los kJ de la etiqueta
  const kj = numero(n.energy_100g ?? n['energy-kj_100g']);
  const kcal100 = numero(n['energy-kcal_100g']) ?? (kj == null ? null : Math.round(kj / 4.184));
  if (!nombre || kcal100 == null) return null;
  const porcion = numero(p.serving_quantity);
  return {
    codigo: String(codigo),
    nombre,
    marca: String(p.brands || '').split(',')[0].trim().slice(0, 120) || null,
    kcal100,
    proteina100: numero(n.proteins_100g),
    carbohidratos100: numero(n.carbohydrates_100g),
    grasa100: numero(n.fat_100g),
    porcionG: porcion && porcion <= 2000 ? porcion : null,
  };
}

/** Lo que aporta comer `gramos` de un producto. */
function porcion(producto, gramos) {
  const g = Number(gramos);
  const por = (v, dec) => (v == null ? null : redondear((Number(v) * g) / 100, dec));
  return {
    gramos: g,
    calorias: Math.round((Number(producto.kcal100) * g) / 100),
    proteina: por(producto.proteina100, 1),
    carbohidratos: por(producto.carbohidratos100, 1),
    grasa: por(producto.grasa100, 1),
  };
}

function error(mensaje, status = 400) {
  return Object.assign(new Error(mensaje), { status });
}

/** Producto escrito a mano desde la etiqueta (cuando el código no está en ninguna base). */
function validarManual(datos = {}) {
  const nombre = String(datos.nombre || '').trim();
  if (nombre.length < 2 || nombre.length > 160) throw error('Escribe el nombre del producto.');
  const campo = (valor, max, etiqueta, obligatorio = false) => {
    if (valor === undefined || valor === null || valor === '') {
      if (obligatorio) throw error(`Falta ${etiqueta}.`);
      return null;
    }
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0 || n > max) throw error(`Revisa ${etiqueta}: debe estar entre 0 y ${max}.`);
    return redondear(n);
  };
  return {
    nombre,
    marca: String(datos.marca || '').trim().slice(0, 120) || null,
    kcal100: campo(datos.kcal100, 900, 'las calorías por 100 g', true),
    proteina100: campo(datos.proteina100, 100, 'la proteína por 100 g'),
    carbohidratos100: campo(datos.carbohidratos100, 100, 'los carbohidratos por 100 g'),
    grasa100: campo(datos.grasa100, 100, 'la grasa por 100 g'),
    porcionG: campo(datos.porcionG, 2000, 'la porción'),
  };
}

module.exports = { codigoValido, desdeOpenFoodFacts, porcion, validarManual };
