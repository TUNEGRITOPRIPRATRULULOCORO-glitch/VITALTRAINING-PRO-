/**
 * Conexión a la base de datos. Se elige sola según el entorno:
 *
 * 1. DATABASE_URL en .env  → PostgreSQL real (producción, Docker).
 * 2. Tests (NODE_ENV=test) → pg-mem: en memoria, rápida y vacía en cada ejecución.
 * 3. Desarrollo local      → PGlite: PostgreSQL completo guardado en disco, en
 *                            base-de-datos/datos-locales/. Los datos (fotos, mensajes,
 *                            registros...) se conservan al reiniciar el servidor.
 *                            Para empezar de cero basta con borrar esa carpeta.
 */
const path = require('path');

let pool = null;
let query;
let motor;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');

  // SSL solo si es una conexión remota (Railway), no en local con Docker
  const esLocal = process.env.DATABASE_URL.includes('@db:');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: !esLocal ? { rejectUnauthorized: false } : false
  });

  query = (text, params) => pool.query(text, params);
  motor = 'postgresql';
} else if (process.env.NODE_ENV === 'test') {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const { Pool: PgMemPool } = db.adapters.createPg();

  pool = new PgMemPool();
  query = (text, params) => pool.query(text, params);
  motor = 'pg-mem';
} else {
  const { PGlite } = require('@electric-sql/pglite');
  const carpeta = process.env.DATOS_LOCALES || path.join(__dirname, 'datos-locales');
  const db = new PGlite(carpeta);

  query = async (text, params) => {
    await db.waitReady;
    return db.query(text, params);
  };
  motor = `pglite (${carpeta})`;
}

module.exports = { query, pool, motor };
