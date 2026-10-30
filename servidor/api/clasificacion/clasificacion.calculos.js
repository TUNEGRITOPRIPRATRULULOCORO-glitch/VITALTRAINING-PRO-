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

/*
 * Marcas sin verificar (anti-trampas). Una marca que registró o confirmó un entrenador está
 * verificada. Las demás pueden entrar en la clasificación de todo el deporte, salvo que sean
 * sospechosas: de nivel Diamante o más, o una mejora demasiado grande de golpe.
 */
const ELITE = 18;                                  // Diamante I: a partir de aquí hay que verificar
const MAX_MEJORA = { test: 15, fuerza: 25 };       // % de mejora sobre su mejor marca anterior…
const VENTANA_MEJORA_DIAS = { test: 60, fuerza: 30 }; // …en tan pocos días

/** Por qué una marca sin verificar no entra, o null si puede entrar. */
function motivoSospecha({ tipo, verificado, puntos, mejoraPct, dias }) {
  if (verificado) return null;
  if (puntos >= ELITE) return 'Las marcas de nivel Diamante o superior necesitan que un entrenador las verifique.';
  if (mejoraPct != null && mejoraPct > MAX_MEJORA[tipo] && dias != null && dias <= VENTANA_MEJORA_DIAS[tipo])
    return `Mejoraste más de un ${MAX_MEJORA[tipo]} % de golpe: para entrar en la clasificación, pide a un entrenador que la verifique.`;
  return null;
}

/**
 * Recorre las marcas de un atleta en orden de fecha y calcula cuánto mejoró cada una sobre
 * su mejor marca anterior (en %, siempre positivo si es mejor) y cuántos días pasaron.
 * filas: [{ fecha, valor }] · mayorEsMejor: true en saltos o kilos, false en tiempos
 */
function conMejora(filas, mayorEsMejor = true) {
  const orden = [...filas].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  let mejor = null;
  return orden.map(f => {
    const mejoraPct = mejor ? Math.round(((mayorEsMejor ? f.valor - mejor.valor : mejor.valor - f.valor) / mejor.valor) * 1000) / 10 : null;
    const dias = mejor ? Math.round((new Date(f.fecha) - new Date(mejor.fecha)) / 86400000) : null;
    const salida = { ...f, mejoraPct, dias };
    if (!mejor || (mayorEsMejor ? f.valor > mejor.valor : f.valor < mejor.valor)) mejor = f;
    return salida;
  });
}

module.exports = { PUNTOS, MAX_COMIDAS_DIA, ELITE, MAX_MEJORA, puntosConstancia, ordenar, nombreCorto, motivoSospecha, conMejora };
