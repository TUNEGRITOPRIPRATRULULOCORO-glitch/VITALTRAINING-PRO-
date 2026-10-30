/**
 * Búsqueda de productos por código de barras.
 *
 * 1. Primero en nuestra tabla (alimentos_codigos): lo ya consultado responde al instante.
 * 2. Si no está (o lo de Open Food Facts tiene más de un mes), se consulta Open Food Facts,
 *    la base abierta y gratuita de productos del mundo, y se guarda.
 * 3. Si tampoco está ahí, el atleta puede escribir los datos de la etiqueta una vez y desde
 *    entonces el producto aparece para todo el club (fuente 'club').
 */
const { query } = require('../../../base-de-datos/db');
const calc = require('./alimentos.calculos');

const DIAS_VIGENCIA = 30; // lo de Open Food Facts se refresca al mes (su comunidad lo corrige)
const URL_OFF = 'https://world.openfoodfacts.org/api/v2/product/';
const CAMPOS = 'product_name,product_name_es,generic_name_es,brands,nutriments,serving_quantity';
const PUEDEN_CORREGIR = ['Nutricionista', 'Administrador'];

/** Consulta real a Open Food Facts (pide identificarse con un User-Agent propio). */
async function consultarOpenFoodFacts(codigo) {
  // Solo dígitos: el código va dentro de la dirección de Open Food Facts
  if (!/^d{8,14}$/.test(String(codigo))) return null;
  const r = await fetch(`${URL_OFF}${encodeURIComponent(codigo)}.json?fields=${CAMPOS}`, {
    headers: { 'User-Agent': `VitalTraining/1.0 (${process.env.APP_URL || 'https://vitaltraining-pro.onrender.com'})` },
    signal: AbortSignal.timeout(6000),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Open Food Facts respondió ${r.status}`);
  const datos = await r.json();
  return datos.status === 1 ? datos.product : null;
}

let _consultar = consultarOpenFoodFacts;

/** Solo para los tests: sustituye la consulta a internet. */
function _usarConsulta(fn) { _consultar = fn; }

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

const num = v => (v == null ? null : Number(v));

function aProducto(r) {
  return {
    codigo: r.codigo, nombre: r.nombre, marca: r.marca,
    kcal100: num(r.kcal_100), proteina100: num(r.proteina_100),
    carbohidratos100: num(r.carbohidratos_100), grasa100: num(r.grasa_100),
    porcionG: num(r.porcion_g), fuente: r.fuente,
  };
}

function vigente(fila) {
  return Date.now() - new Date(fila.actualizado).getTime() < DIAS_VIGENCIA * 86400000;
}

async function guardar(p, fuente, creadoPor) {
  const valores = [p.nombre, p.marca, p.kcal100, p.proteina100, p.carbohidratos100, p.grasa100, p.porcionG, fuente, creadoPor, new Date().toISOString(), p.codigo];
  const { rows } = await query('SELECT 1 FROM alimentos_codigos WHERE codigo = $1', [p.codigo]);
  if (rows.length) {
    await query(
      `UPDATE alimentos_codigos SET nombre = $1, marca = $2, kcal_100 = $3, proteina_100 = $4, carbohidratos_100 = $5,
              grasa_100 = $6, porcion_g = $7, fuente = $8, creado_por = $9, actualizado = $10 WHERE codigo = $11`, valores);
  } else {
    await query(
      `INSERT INTO alimentos_codigos (nombre, marca, kcal_100, proteina_100, carbohidratos_100, grasa_100, porcion_g, fuente, creado_por, actualizado, codigo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, valores);
  }
}

/** @returns {{ encontrado: true, producto } | { encontrado: false, codigo }} */
async function buscar(codigo) {
  const c = String(codigo || '').trim();
  if (!calc.codigoValido(c)) throw error('Ese código no parece válido: revisa los números.', 400);

  const { rows } = await query('SELECT * FROM alimentos_codigos WHERE codigo = $1', [c]);
  const guardado = rows[0] ? aProducto(rows[0]) : null;
  // Lo que escribió el club no caduca; lo de Open Food Facts se vuelve a pedir pasado un mes
  if (guardado && (guardado.fuente === 'club' || vigente(rows[0]))) return { encontrado: true, producto: guardado };

  let producto;
  try {
    producto = calc.desdeOpenFoodFacts(c, await _consultar(c));
  } catch (err) {
    console.error('Open Food Facts:', err.message);
    if (guardado) return { encontrado: true, producto: guardado };
    throw error('No se pudo consultar la base de alimentos. Inténtalo otra vez o escribe los datos a mano.', 503);
  }
  if (!producto) return guardado ? { encontrado: true, producto: guardado } : { encontrado: false, codigo: c };
  await guardar(producto, 'openfoodfacts', null);
  return { encontrado: true, producto: { ...producto, fuente: 'openfoodfacts' } };
}

/**
 * Producto escrito a mano desde la etiqueta. Si ya existe, solo lo corrige quien lo escribió,
 * un nutricionista o el administrador (lo de Open Food Facts, solo el nutricionista o el admin).
 */
async function guardarManual(codigo, datos, usuario) {
  const c = String(codigo || '').trim();
  if (!calc.codigoValido(c)) throw error('Ese código no parece válido: revisa los números.', 400);
  const producto = { ...calc.validarManual(datos), codigo: c };
  const { rows } = await query('SELECT fuente, creado_por FROM alimentos_codigos WHERE codigo = $1', [c]);
  const existente = rows[0];
  const esAutor = existente && Number(existente.creado_por) === Number(usuario.id);
  if (existente && !esAutor && !PUEDEN_CORREGIR.includes(usuario.rol)) {
    throw error('Ese producto ya está en la base. Si ves un error, avísale a tu nutricionista.', 409);
  }
  await guardar(producto, 'club', Number(usuario.id));
  return { ...producto, fuente: 'club' };
}

module.exports = { buscar, guardarManual, _usarConsulta };
