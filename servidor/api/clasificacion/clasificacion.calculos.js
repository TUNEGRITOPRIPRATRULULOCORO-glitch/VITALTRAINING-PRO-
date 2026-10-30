/**
 * Clasificación (funciones puras): puntos de constancia y orden de las tablas.
 *
 * Constancia premia cumplir el plan, no el talento: cualquiera puede ir primero.
 *   · Registrar cómo amaneciste ........ 10 puntos por día
 *   · Sesión del plan completa ......... 30 (a medias: 15; entreno apuntado a mano: 15)
 *   · Comida apuntada ................... 5 (máximo 4 por día: 20)
 * Como mucho cuenta una sesión por día, para que nadie sume puntos apuntando de más.
 */

const PUNTOS = { salud: 10, sesionCompleta: 30, sesionParcial: 15, entrenoManual: 15, comida: 5 };
const MAX_COMIDAS_DIA = 4;

/**
 * Puntos de cada atleta.
 * @param datos { salud: [{user_id, fecha}], cumplimiento: [{user_id, fecha, estado}],
 *                rutinas: [{user_id, fecha}], comidas: [{user_id, fecha}] } (fechas 'YYYY-MM-DD')
 * @returns {Object<string, {puntos, salud, sesiones, comidas}>}
 */
function puntosConstancia(ids, datos) {
  const r = Object.fromEntries(ids.map(id => [String(id), { puntos: 0, salud: 0, sesiones: 0, comidas: 0 }]));
  const dias = (filas) => {
    const vistos = new Set();
    return filas.filter(f => { const k = `${f.user_id}|${f.fecha}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
  };

  for (const s of dias(datos.salud || [])) {
    const a = r[String(s.user_id)]; if (!a) continue;
    a.salud++; a.puntos += PUNTOS.salud;
  }

  // Una sesión por día: completa gana a parcial, y la del plan a la apuntada a mano
  const sesionDia = {};
  for (const c of datos.cumplimiento || []) {
    const k = `${c.user_id}|${c.fecha}`;
    const valor = c.estado === 'parcial' ? PUNTOS.sesionParcial : PUNTOS.sesionCompleta;
    sesionDia[k] = Math.max(sesionDia[k] || 0, valor);
  }
  for (const m of datos.rutinas || []) {
    const k = `${m.user_id}|${m.fecha}`;
    sesionDia[k] = Math.max(sesionDia[k] || 0, PUNTOS.entrenoManual);
  }
  for (const [k, valor] of Object.entries(sesionDia)) {
    const a = r[k.split('|')[0]]; if (!a) continue;
    a.sesiones++; a.puntos += valor;
  }

  const comidasDia = {};
  for (const c of datos.comidas || []) {
    const k = `${c.user_id}|${c.fecha}`;
    comidasDia[k] = Math.min(MAX_COMIDAS_DIA, (comidasDia[k] || 0) + 1);
  }
  for (const [k, n] of Object.entries(comidasDia)) {
    const a = r[k.split('|')[0]]; if (!a) continue;
    a.comidas += n; a.puntos += n * PUNTOS.comida;
  }
  return r;
}

/**
 * Ordena de mayor a menor y pone la posición (los empates comparten puesto: 1, 2, 2, 4).
 * desempate: función opcional (a, b) para ordenar dentro de un empate (no cambia el puesto).
 */
function ordenar(filas, desempate = () => 0) {
  const lista = [...filas].sort((a, b) => b.puntos - a.puntos || desempate(a, b));
  let puesto = 0;
  return lista.map((f, i) => {
    if (i === 0 || f.puntos !== lista[i - 1].puntos) puesto = i + 1;
    return { ...f, posicion: puesto };
  });
}

/** "Diego Torres" → "Diego T." (fuera del propio equipo no se muestra el apellido completo). */
function nombreCorto(nombre = '') {
  const [primero, segundo] = String(nombre).trim().split(/\s+/);
  return segundo ? `${primero} ${segundo[0].toUpperCase()}.` : primero || 'Atleta';
}

module.exports = { PUNTOS, MAX_COMIDAS_DIA, puntosConstancia, ordenar, nombreCorto };
