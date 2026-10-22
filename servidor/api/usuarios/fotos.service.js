const { query } = require('../../../base-de-datos/db');

/**
 * Reglas de la foto de perfil (el navegador ya recorta a 400×400 y comprime;
 * el servidor vuelve a comprobarlo por si alguien se salta la interfaz).
 */
const REGLAS = {
  formatos: ['image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 300 * 1024,
};

// Primeros bytes de cada formato: así no basta con cambiar la extensión o el tipo declarado
const FIRMAS = {
  'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png':  b => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': b => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP',
};

function error(mensaje, status = 400) {
  return Object.assign(new Error(mensaje), { status });
}

/** Valida un data URL ("data:image/jpeg;base64,...") y devuelve { mime, bytes }. */
function validarFoto(dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(dataUrl || ''));
  if (!m) throw error('La foto debe enviarse como imagen en base64.');
  const [, mime, base64] = m;
  if (!REGLAS.formatos.includes(mime)) throw error('Formato no permitido. Usa JPG, PNG o WebP.');

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > REGLAS.maxBytes) throw error(`La foto supera ${REGLAS.maxBytes / 1024} KB.`, 413);
  if (!FIRMAS[mime](bytes)) throw error('El archivo no es una imagen válida.');
  return { mime, bytes };
}

async function guardar(userId, dataUrl) {
  const { mime, bytes } = validarFoto(dataUrl);
  const datos = bytes.toString('base64');
  await query('DELETE FROM fotos_perfil WHERE user_id = $1', [Number(userId)]);
  await query(
    'INSERT INTO fotos_perfil (user_id, mime, datos, actualizado) VALUES ($1, $2, $3, NOW())',
    [Number(userId), mime, datos]
  );
  return { bytes: bytes.length };
}

async function borrar(userId) {
  await query('DELETE FROM fotos_perfil WHERE user_id = $1', [Number(userId)]);
}

/** Devuelve { mime, bytes, actualizado } o null si el usuario no tiene foto. */
async function obtener(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const { rows } = await query('SELECT mime, datos, actualizado FROM fotos_perfil WHERE user_id = $1', [id]);
  if (!rows[0]) return null;
  return { mime: rows[0].mime, bytes: Buffer.from(rows[0].datos, 'base64'), actualizado: rows[0].actualizado };
}

module.exports = { REGLAS, validarFoto, guardar, borrar, obtener };
