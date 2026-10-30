/**
 * Catálogos de lesiones y estado médico del atleta (funciones puras).
 *
 * El estado sale de las lesiones activas (sin fecha de alta):
 * - apto:     ninguna lesión activa
 * - adaptado: en recuperación, entrena solo lo que indicó el médico
 * - no_apto:  baja médica, no entrena (gana si hay varias lesiones)
 */

const ZONAS = [
  'Cabeza', 'Cuello', 'Hombro', 'Brazo o codo', 'Muñeca o mano', 'Pecho o costillas', 'Espalda',
  'Abdomen', 'Cadera o ingle', 'Isquiotibiales', 'Cuádriceps', 'Rodilla', 'Gemelo o pantorrilla',
  'Tendón de Aquiles', 'Tobillo', 'Pie', 'Otra',
];
const TIPOS = ['Muscular', 'Ligamento o articulación', 'Tendón', 'Ósea', 'Contusión', 'Conmoción', 'Otra'];
const GRAVEDADES = ['leve', 'moderada', 'grave'];

const RESTRICCIONES = {
  no_apto:  { etiqueta: 'Baja médica', descripcion: 'No entrena hasta el alta' },
  adaptado: { etiqueta: 'En recuperación', descripcion: 'Entrena adaptado, según las indicaciones' },
};

const ESTADOS = {
  apto:     { etiqueta: 'Apto',            mensaje: 'Sin lesiones activas.' },
  adaptado: { etiqueta: 'En recuperación', mensaje: 'Entrena solo lo que indicó el médico.' },
  no_apto:  { etiqueta: 'Baja médica',     mensaje: 'No entrenes hasta que el médico te dé el alta.' },
};

// Fecha lejana para las lesiones que siguen activas (los periodos cubren también los días que vienen)
const SIN_FIN = '9999-12-31';

/** Estado médico a partir de las lesiones activas. */
function estadoDesde(activas = []) {
  const estado = activas.some(l => l.restriccion === 'no_apto') ? 'no_apto'
    : activas.length ? 'adaptado'
    : 'apto';
  return { estado, ...ESTADOS[estado], zonas: [...new Set(activas.map(l => l.zona))] };
}

/** Problema de validación de una lesión nueva o editada, o null si está bien. */
function validarLesion(datos, hoy, { parcial = false } = {}) {
  const falta = campo => !parcial && !datos[campo];
  if (falta('zona') || (datos.zona && !ZONAS.includes(datos.zona))) return 'Elige la zona de la lesión.';
  if (falta('tipo') || (datos.tipo && !TIPOS.includes(datos.tipo))) return 'Elige el tipo de lesión.';
  if (falta('gravedad') || (datos.gravedad && !GRAVEDADES.includes(datos.gravedad))) return 'Elige la gravedad: leve, moderada o grave.';
  if (datos.restriccion && !RESTRICCIONES[datos.restriccion]) return 'La restricción debe ser "no_apto" o "adaptado".';
  for (const campo of ['fechaInicio', 'altaEstimada']) {
    const v = datos[campo];
    if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))) return 'Fecha no válida.';
  }
  if (datos.fechaInicio && datos.fechaInicio > hoy) return 'La lesión no puede empezar en el futuro.';
  if (datos.altaEstimada && datos.fechaInicio && datos.altaEstimada < datos.fechaInicio)
    return 'El alta estimada no puede ser anterior al inicio de la lesión.';
  return null;
}

module.exports = { ZONAS, TIPOS, GRAVEDADES, RESTRICCIONES, ESTADOS, SIN_FIN, estadoDesde, validarLesion };
