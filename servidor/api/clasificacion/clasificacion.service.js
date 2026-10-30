const { query } = require('../../../base-de-datos/db');
const { hoyISO, aFechaISO, sumarDias } = require('../../compartido/fechas');
const calc = require('./clasificacion.calculos');

const ROLES_ATLETA = ['Atleta', 'Futbolista'];
const MAX_FILAS = 50;

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

const enLista = (valores, desde = 1) => valores.map((_, i) => `$${i + desde}`).join(', ');

/** Lunes de la semana de una fecha 'YYYY-MM-DD'. */
function lunesDe(fecha) {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((dia + 6) % 7));
}

async function visible(userId) {
  const { rows } = await query('SELECT visible FROM clasificacion_preferencias WHERE user_id = $1', [Number(userId)]);
  return rows[0] ? rows[0].visible !== false : true;
}

async function cambiarVisible(userId, valor) {
  const v = valor !== false;
  const { rows } = await query('SELECT user_id FROM clasificacion_preferencias WHERE user_id = $1', [Number(userId)]);
  if (rows.length) await query('UPDATE clasificacion_preferencias SET visible = $1 WHERE user_id = $2', [v, Number(userId)]);
  else await query('INSERT INTO clasificacion_preferencias (user_id, visible) VALUES ($1, $2)', [Number(userId), v]);
  return v;
}

/**
 * Con quién compite: su equipo (si tiene) o todos los atletas de su deporte.
 * Fuera del propio equipo solo se muestra el nombre y la inicial del apellido.
 * Quien eligió no aparecer no sale (salvo para sí mismo).
 */
async function poblacion(yo, ambitoPedido) {
  const { rows: [usuario] } = await query('SELECT id, nombre, deporte_principal FROM usuarios WHERE id = $1', [Number(yo.id)]);
  if (!usuario) throw error('Usuario no encontrado.', 404);
  const deporte = usuario.deporte_principal || 'Fútbol';
  const { rows: equipos } = await query(
    'SELECT e.id, e.nombre FROM equipo_miembros m JOIN equipos e ON e.id = m.equipo_id WHERE m.user_id = $1',
    [Number(yo.id)]
  );
  const ambito = ambitoPedido === 'equipo' && equipos.length ? 'equipo' : 'deporte';

  let filas;
  if (ambito === 'equipo') {
    const ids = equipos.map(e => Number(e.id));
    ({ rows: filas } = await query(
      `SELECT DISTINCT u.id, u.nombre FROM equipo_miembros m JOIN usuarios u ON u.id = m.user_id
        WHERE m.equipo_id IN (${enLista(ids)}) AND u.estado = 'Activo' AND u.rol IN (${enLista(ROLES_ATLETA, ids.length + 1)})`,
      [...ids, ...ROLES_ATLETA]
    ));
  } else {
    ({ rows: filas } = await query(
      `SELECT id, nombre FROM usuarios WHERE estado = 'Activo' AND deporte_principal = $1 AND rol IN (${enLista(ROLES_ATLETA, 2)})`,
      [deporte, ...ROLES_ATLETA]
    ));
  }
  const { rows: ocultos } = await query('SELECT user_id FROM clasificacion_preferencias WHERE visible = false');
  const ocultosSet = new Set(ocultos.map(o => Number(o.user_id)));
  const atletas = filas
    .filter(f => Number(f.id) === Number(yo.id) || !ocultosSet.has(Number(f.id)))
    .map(f => ({
      id: Number(f.id),
      esYo: Number(f.id) === Number(yo.id),
      nombre: ambito === 'equipo' || Number(f.id) === Number(yo.id) ? f.nombre : calc.nombreCorto(f.nombre),
    }));
  return {
    ambito,
    deporte,
    titulo: ambito === 'equipo' ? equipos.map(e => e.nombre).join(' · ') : `Todo ${deporte}`,
    tieneEquipo: equipos.length > 0,
    atletas,
  };
}

/** Las primeras filas y, si quedó más abajo, también la propia. */
function recortar(lista) {
  const top = lista.slice(0, MAX_FILAS);
  const yo = lista.find(f => f.esYo);
  return { filas: top, yo: yo || null, total: lista.length, fueraDelTop: yo && !top.includes(yo) ? yo : null };
}

/** Clasificación de constancia de la semana (desde el lunes) o de los últimos 30 días. */
async function constancia(yo, { ambito, periodo } = {}) {
  const pob = await poblacion(yo, ambito);
  const hoy = hoyISO();
  const desde = periodo === 'mes' ? sumarDias(hoy, -29) : lunesDe(hoy);
  const ids = pob.atletas.map(a => a.id);
  if (!ids.length) return { ...pob, atletas: undefined, periodo, desde, hasta: hoy, puntos: calc.PUNTOS, ...recortar([]) };
  const consulta = (tabla, extra = '') => query(
    `SELECT user_id, fecha${extra} FROM ${tabla} WHERE user_id IN (${enLista(ids)}) AND fecha >= $${ids.length + 1} AND fecha <= $${ids.length + 2}`,
    [...ids, desde, hoy]
  ).then(r => r.rows.map(f => ({ ...f, fecha: aFechaISO(f.fecha) })));
  const [salud, cumplimiento, rutinas, comidas] = await Promise.all([
    consulta('salud'), consulta('cumplimiento', ', estado'), consulta('rutinas'), consulta('comidas'),
  ]);
  const puntos = calc.puntosConstancia(ids, { salud, cumplimiento, rutinas, comidas });
  const lista = calc.ordenar(pob.atletas.map(a => ({ ...a, ...puntos[String(a.id)] })), (a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return { ...pob, atletas: undefined, periodo: periodo === 'mes' ? 'mes' : 'semana', desde, hasta: hoy, puntos: calc.PUNTOS, ...recortar(lista) };
}

/**
 * Mejor marca de cada atleta en un test o un levantamiento, ordenada por su puntuación de rango.
 * Para que la comparación sea justa:
 * - solo compite quien indicó su sexo (y su peso, en fuerza): con el punto medio de las escalas
 *   alguien saldría favorecido;
 * - en el equipo solo cuentan marcas verificadas por un profesional, y en todo el deporte no
 *   entran las sospechosas sin verificar (ver clasificacion.calculos.js).
 * Si mi mejor marca se queda fuera, se me dice por qué.
 */
async function marcas(yo, { ambito, clave } = {}) {
  const pob = await poblacion(yo, ambito);
  const rangos = require('../rangos');
  const [tipo, id] = String(clave || '').split(':');
  const ids = pob.atletas.map(a => a.id);
  if (!ids.length) return { ...pob, atletas: undefined, clave, ...recortar([]) };

  // Sexo y peso de cada atleta: las escalas de los rangos dependen de ellos
  const { rows: fichas } = await query(
    `SELECT u.id, COALESCE(p.peso, u.peso) AS peso, p.sexo FROM usuarios u LEFT JOIN perfiles p ON p.user_id = u.id
      WHERE u.id IN (${enLista(ids)})`, ids
  );
  const ficha = Object.fromEntries(fichas.map(f => [Number(f.id), { peso: Number(f.peso) || null, sexo: ['Hombre', 'Mujer'].includes(f.sexo) ? f.sexo : null }]));
  // Todas las marcas de cada atleta: { valor comparable, fecha, verificado, texto }
  const porAtleta = {};
  const anotar = (uid, marca) => (porAtleta[uid] ||= []).push(marca);
  let mayorEsMejor = true, puntuar;

  if (tipo === 'test') {
    const prueba = require('../evaluaciones').pruebasDe(pob.deporte).find(p => p.id === id);
    if (!prueba) throw error('Esa prueba no es de tu deporte.', 400);
    mayorEsMejor = prueba.mejor === 'mayor';
    const { rows } = await query(
      `SELECT user_id, valor, fecha, verificado FROM evaluaciones WHERE prueba = $1 AND user_id IN (${enLista(ids, 2)})`, [id, ...ids]
    );
    for (const r of rows) {
      const valor = Number(r.valor);
      anotar(Number(r.user_id), { valor, fecha: aFechaISO(r.fecha), verificado: r.verificado === true, texto: `${String(valor).replace('.', ',')} ${prueba.unidad}` });
    }
    puntuar = (uid, m) => rangos.puntuarTest(id, m.valor, ficha[uid]?.sexo);
  } else if (tipo === 'fuerza') {
    if (!rangos.levantamientos().some(l => l.id === id)) throw error('Levantamiento desconocido.', 400);
    const { rows } = await query(
      `SELECT user_id, ejercicio, peso, repeticiones, fecha, verificado FROM series WHERE peso > 0 AND user_id IN (${enLista(ids)})`, ids
    );
    for (const r of rows) {
      if (rangos.ejercicioDeFuerza(r.ejercicio)?.id !== id) continue;
      const peso = Number(r.peso), reps = Number(r.repeticiones);
      const e1rm = Math.round(peso * (1 + Math.min(reps, 12) / 30) * 2) / 2; // Epley, igual que en series
      anotar(Number(r.user_id), { valor: e1rm, fecha: aFechaISO(r.fecha), verificado: r.verificado === true, texto: `${String(peso).replace('.', ',')} kg × ${reps}` });
    }
    puntuar = (uid, m) => rangos.puntuarFuerza(id, m.valor, ficha[uid]?.peso, ficha[uid]?.sexo);
  } else {
    throw error('Elige una prueba o un levantamiento.', 400);
  }

  // En el equipo solo cuentan las marcas verificadas por un profesional; en todo el deporte,
  // también las del atleta, salvo las sospechosas (anti-trampas)
  const soloVerificadas = pob.ambito === 'equipo';
  const mejores = {};
  let avisoVerificar = null;
  for (const [uid, marcas] of Object.entries(porAtleta)) {
    const evaluadas = calc.conMejora(marcas, mayorEsMejor).map(m => {
      const puntos = puntuar(uid, m);
      const motivo = soloVerificadas
        ? (m.verificado ? null : 'En tu equipo solo cuentan las marcas que registra o verifica tu entrenador.')
        : calc.motivoSospecha({ tipo, verificado: m.verificado, puntos, mejoraPct: m.mejoraPct, dias: m.dias });
      return { ...m, puntos, motivo };
    }).filter(m => m.puntos != null);
    const mejorDe = lista => lista.reduce((a, b) => (!a || b.puntos > a.puntos ? b : a), null);
    const valida = mejorDe(evaluadas.filter(m => !m.motivo));
    if (valida) mejores[uid] = valida;
    const mejorTotal = mejorDe(evaluadas);
    if (Number(uid) === Number(yo.id) && mejorTotal?.motivo && (!valida || mejorTotal.puntos > valida.puntos)) avisoVerificar = mejorTotal.motivo;
  }
  for (const [uid, m] of Object.entries(mejores)) {
    if (tipo === 'fuerza' && ficha[uid]?.peso) m.texto += ` · ${String(Math.round(m.valor / ficha[uid].peso * 100) / 100).replace('.', ',')} × su peso`;
  }

  const completo = a => ficha[a.id]?.sexo && (tipo !== 'fuerza' || ficha[a.id]?.peso);
  const yo_ = pob.atletas.find(a => a.esYo);
  const meFalta = yo_ && porAtleta[yo_.id] && !completo(yo_)
    ? (tipo === 'fuerza' && !ficha[yo_.id]?.peso ? 'Indica tu peso y tu sexo en Mi Perfil para entrar en esta clasificación.' : 'Indica tu sexo en Mi Perfil para entrar en esta clasificación: las escalas son distintas para hombres y mujeres.')
    : avisoVerificar;
  const lista = calc.ordenar(
    pob.atletas
      .filter(a => mejores[a.id] && completo(a))
      .map(a => {
        const m = mejores[a.id];
        return { ...a, puntos: Math.round(m.puntos * 100) / 100, marca: m.texto, fecha: m.fecha, verificado: m.verificado, rango: rangos.rangoDe(Math.floor(m.puntos + 1e-9)) };
      }),
    (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0) // en empate, quien lo logró antes
  );
  return { ...pob, atletas: undefined, clave, faltaDato: meFalta, ...recortar(lista) };
}

/** Lo que se puede elegir: ámbito, tests de su deporte y levantamientos. */
async function opciones(yo) {
  const pob = await poblacion(yo, 'equipo');
  return {
    deporte: pob.deporte,
    tieneEquipo: pob.tieneEquipo,
    equipo: pob.tieneEquipo ? pob.titulo : null,
    visible: await visible(yo.id),
    tests: require('../evaluaciones').pruebasDe(pob.deporte).map(p => ({ clave: `test:${p.id}`, nombre: p.corto, unidad: p.unidad })),
    levantamientos: require('../rangos').levantamientos().map(l => ({ clave: `fuerza:${l.id}`, nombre: l.nombre })),
  };
}

module.exports = { constancia, marcas, opciones, cambiarVisible, poblacion, lunesDe };
