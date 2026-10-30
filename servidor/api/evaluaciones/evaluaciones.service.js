const { query } = require('../../../base-de-datos/db');
const { hoyISO, aFechaISO } = require('../../compartido/fechas');
const catalogo = require('./evaluaciones.catalogo');

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

async function deporteDe(userId) {
  const { rows } = await query('SELECT deporte_principal FROM usuarios WHERE id = $1', [Number(userId)]);
  if (!rows[0]) throw error('Atleta no encontrado.', 404);
  return rows[0].deporte_principal || 'Fútbol';
}

function aResultado(r) {
  return {
    id: Number(r.id),
    prueba: r.prueba,
    valor: Number(r.valor),
    fecha: aFechaISO(r.fecha),
    notas: r.notas || '',
    registradoPor: r.registrado_por || null,
    verificado: r.verificado === true,
  };
}

/** Batería del deporte del atleta con su historial y tendencias. */
async function obtener(userId) {
  const deporte = await deporteDe(userId);
  const { rows } = await query(
    'SELECT id, prueba, valor, fecha, notas, registrado_por, verificado FROM evaluaciones WHERE user_id = $1 ORDER BY fecha, id',
    [Number(userId)]
  );
  return catalogo.resumir(deporte, rows.map(aResultado), hoyISO());
}

// Quién da por buena una marca: un profesional que la midió (no el propio atleta)
const ROLES_VERIFICAN = ['Entrenador', 'Medico', 'Médico', 'Administrador'];
const esVerificador = (autor, userId) => !!autor && Number(autor.id) !== Number(userId) && ROLES_VERIFICAN.includes(autor.rol);

/**
 * Registra un resultado. Si lo registra un profesional queda verificado.
 * Un atleta que está en un equipo no registra sus propios tests: los mide su entrenador
 * (así nadie sube marcas falsas a la clasificación del equipo).
 */
async function registrar(userId, datos, autor) {
  const verificado = esVerificador(autor, userId);
  if (!verificado && await require('../equipos').tieneEquipo(userId))
    throw error('En tu equipo los tests los registra tu entrenador: así todas las marcas son reales.', 403);
  const deporte = await deporteDe(userId);
  const prueba = String(datos.prueba || '');
  if (!catalogo.pruebasDe(deporte).some(p => p.id === prueba))
    throw error(`Esa prueba no forma parte de la batería de ${deporte}.`, 400);
  const problema = catalogo.validarValor(prueba, datos.valor);
  if (problema) throw error(problema, 400);

  const fecha = datos.fecha ? String(datos.fecha).slice(0, 10) : hoyISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) throw error('Fecha no válida.', 400);
  if (fecha > hoyISO()) throw error('La fecha no puede ser futura.', 400);

  const { rows } = await query(
    `INSERT INTO evaluaciones (user_id, prueba, valor, fecha, notas, registrado_por, verificado)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, prueba, valor, fecha, notas, registrado_por, verificado`,
    [Number(userId), prueba, Number(datos.valor), fecha, String(datos.notas || '').slice(0, 300), autor?.nombre || null, verificado]
  );
  return aResultado(rows[0]);
}

/** El atleta puede borrar lo que apuntó él, pero no una marca verificada por un profesional. */
async function eliminar(userId, id, autor = null) {
  if (autor && !esVerificador(autor, userId)) {
    const { rows: [r] } = await query('SELECT verificado FROM evaluaciones WHERE id = $1 AND user_id = $2', [Number(id), Number(userId)]);
    if (r?.verificado) throw error('Esta marca la registró tu entrenador: solo él puede borrarla.', 403);
  }
  const { rows } = await query(
    'DELETE FROM evaluaciones WHERE id = $1 AND user_id = $2 RETURNING id',
    [Number(id), Number(userId)]
  );
  return rows.length > 0;
}

/** Mejor marca de cada prueba que hizo el atleta (de cualquier batería), para los rangos. */
async function mejoresMarcas(userId) {
  const { rows } = await query('SELECT prueba, valor, fecha FROM evaluaciones WHERE user_id = $1', [Number(userId)]);
  const mejores = {};
  for (const r of rows) {
    const p = catalogo.PRUEBAS[r.prueba];
    if (!p) continue;
    const valor = Number(r.valor);
    const actual = mejores[r.prueba];
    if (!actual || (p.mejor === 'mayor' ? valor > actual.valor : valor < actual.valor))
      mejores[r.prueba] = { prueba: { id: r.prueba, ...p }, valor, fecha: aFechaISO(r.fecha) };
  }
  return Object.values(mejores);
}

module.exports = { obtener, registrar, eliminar, mejoresMarcas };
