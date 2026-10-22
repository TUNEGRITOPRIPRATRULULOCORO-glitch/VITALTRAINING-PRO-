/**
 * Fechas como texto 'YYYY-MM-DD' (UTC), igual que guarda el resto de la app.
 * Se calculan en JavaScript y no en SQL porque la base en memoria (pg-mem)
 * no soporta funciones como generate_series ni convertir DATE a texto.
 */

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Normaliza lo que devuelve la base para una columna DATE. */
function aFechaISO(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  // pg-mem devuelve medianoche UTC; node-pg devuelve medianoche en la hora local del servidor
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return d.toISOString().slice(0, 10);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Últimos `n` días terminando en `hoy`, del más antiguo al más reciente. */
function ultimosDias(hoy, n) {
  return Array.from({ length: n }, (_, i) => sumarDias(hoy, i - n + 1));
}

module.exports = { hoyISO, aFechaISO, sumarDias, ultimosDias };
