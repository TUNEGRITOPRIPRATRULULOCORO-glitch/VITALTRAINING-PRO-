const { query } = require('../../../base-de-datos/db');
const { hoyISO } = require('../../compartido/fechas');
const cat = require('./rangos.catalogo');

const kg = v => `${String(Math.round(v * 2) / 2).replace('.', ',')} kg`;
const subirMedio = v => Math.ceil(v * 2) / 2;
const numero = (v, decimales = 0) => String(Number(v.toFixed(decimales))).replace('.', ',');

/** Lo que falta para el siguiente paso en una prueba, en su unidad ("3 cm más", "0,05 s menos"). */
function faltaTest(prueba, valor, objetivo) {
  const decimales = prueba.decimales ?? (prueba.unidad === 's' ? 2 : 0);
  const escala = 10 ** decimales;
  // Se redondea hacia el lado que alcanza: hacia arriba si más es mejor, hacia abajo si menos
  const meta = (prueba.mejor === 'mayor' ? Math.ceil(objetivo * escala - 1e-9) : Math.floor(objetivo * escala + 1e-9)) / escala;
  const cuanto = numero(Math.max(Math.abs(meta - valor), 1 / escala), decimales);
  return `${cuanto} ${prueba.unidad} ${prueba.mejor === 'mayor' ? 'más' : 'menos'} (llegar a ${numero(meta, decimales)} ${prueba.unidad})`;
}

function faltaFuerza(record, pesoCorporal, refs, paso) {
  const objetivo = cat.valorParaPaso(paso + 1, refs) * pesoCorporal;
  const reps = Math.min(record.repeticiones || 5, 12);
  const ejemplo = subirMedio(objetivo / (1 + reps / 30));
  return `≈ ${kg(Math.max(0.5, objetivo - record.e1rm))} más en tu máximo estimado (por ejemplo ${kg(ejemplo)} × ${reps})`;
}

/** Rangos guardados: el más alto que alcanzó en cada marca (nunca se baja de rango). */
async function guardados(userId) {
  const { rows } = await query('SELECT clave, paso FROM rangos WHERE user_id = $1', [Number(userId)]);
  return Object.fromEntries(rows.map(r => [r.clave, Number(r.paso)]));
}

async function guardar(userId, clave, paso, existia) {
  if (existia) await query('UPDATE rangos SET paso = $1, fecha = $2 WHERE user_id = $3 AND clave = $4', [paso, hoyISO(), Number(userId), clave]);
  else await query('INSERT INTO rangos (user_id, clave, paso, fecha) VALUES ($1, $2, $3, $4)', [Number(userId), clave, paso, hoyISO()]);
}

/**
 * Rangos del atleta en sus ejercicios de fuerza y sus tests físicos.
 * Solo cuando lo mira el propio atleta (y no está de baja) se guardan las subidas: así la
 * celebración "¡Subiste a Oro II!" la ve él.
 */
async function obtener(userId, lector) {
  const id = Number(userId);
  const [ficha, records, tests, estado, antes] = await Promise.all([
    require('../perfilMedico').obtenerFicha(id),
    require('../series').records(id),
    require('../evaluaciones').mejoresMarcas(id),
    require('../lesiones').estadoDe(id).catch(() => null),
    guardados(id),
  ]);
  const enPausa = estado?.estado === 'no_apto';
  const sexo = ['Hombre', 'Mujer'].includes(ficha?.sexo) ? ficha.sexo : null;
  const pesoCorporal = ficha?.peso > 0 ? Number(ficha.peso) : null;
  const propio = Number(lector?.id) === id;
  const rangos = [];
  const pendientes = [];

  const anotar = async (clave, base, exacto, falta) => {
    const pasoCalculado = Math.min(cat.PASO_MAX, Math.floor(exacto + 1e-9));
    const previo = antes[clave];
    const paso = Math.max(previo ?? 0, pasoCalculado);
    let subio = false, nuevo = false;
    if (propio && !enPausa && (previo === undefined || pasoCalculado > previo)) {
      await guardar(id, clave, paso, previo !== undefined);
      subio = previo !== undefined;
      nuevo = previo === undefined;
    }
    rangos.push({
      clave, ...base,
      rango: cat.rangoDe(paso),
      siguiente: paso < cat.PASO_MAX && !enPausa ? {
        rango: cat.rangoDe(paso + 1),
        falta: falta(paso),
        // Cuánto lleva hacia el siguiente (si su marca actual quedó por debajo del rango guardado, empieza en 0)
        progreso: pasoCalculado === paso ? Math.round((exacto - paso) * 100) / 100 : 0,
      } : null,
      subio, nuevo,
    });
  };

  for (const r of records) {
    const def = cat.ejercicioDeFuerza(r.ejercicio);
    if (!def || !r.record?.e1rm) continue;
    if (!pesoCorporal) { pendientes.push(`Añade tu peso en Mi Perfil para tener rango en ${r.ejercicio}.`); continue; }
    const refs = cat.referenciasPara(def, sexo);
    const relativo = r.record.e1rm / pesoCorporal;
    await anotar(`fuerza:${r.ejercicio}`, {
      tipo: 'fuerza', nombre: r.ejercicio,
      marca: `${kg(r.record.peso)} × ${r.record.repeticiones} · ≈ ${kg(r.record.e1rm)} máx. (${numero(relativo, 2)} × tu peso)${def.mancuerna ? ' · por mancuerna' : ''}`,
    }, cat.pasoExacto(relativo, refs), paso => faltaFuerza(r.record, pesoCorporal, refs, paso));
  }

  for (const t of tests) {
    const def = cat.TESTS[t.prueba.id];
    if (!def) continue;
    const refs = cat.referenciasPara(def, sexo);
    await anotar(`test:${t.prueba.id}`, {
      tipo: 'test', nombre: t.prueba.corto,
      marca: `${numero(t.valor, t.prueba.decimales ?? 2)} ${t.prueba.unidad}`,
    }, cat.pasoExacto(t.valor, refs), paso => faltaTest(t.prueba, t.valor, cat.valorParaPaso(paso + 1, refs)));
  }

  rangos.sort((a, b) => b.rango.paso - a.rango.paso || a.nombre.localeCompare(b.nombre, 'es'));
  if (!sexo) pendientes.push('Indica tu sexo en Mi Perfil: las referencias cambian entre hombres y mujeres.');
  return { enPausa, sexo, pesoCorporal, mejor: rangos[0]?.rango || null, rangos, pendientes: [...new Set(pendientes)] };
}

module.exports = { obtener };
