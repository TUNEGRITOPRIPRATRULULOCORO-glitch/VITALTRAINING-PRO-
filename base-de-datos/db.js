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
  const { Pool, types } = require('pg');

  // Los ids (BIGSERIAL) y COUNT(*) llegan como texto por defecto; como número, igual que en desarrollo
  types.setTypeParser(20, valor => Number.parseInt(valor, 10));

  // SSL para bases en la nube (Neon, Railway...); sin SSL para Docker (@db:) o una base en este equipo
  const esLocal = /@(db|localhost|127.0.0.1)[:/]/.test(process.env.DATABASE_URL) || /sslmode=disable/.test(process.env.DATABASE_URL);

  // En la nube se verifica siempre el certificado del servidor (equivale a sslmode=verify-full).
  // Se quita "sslmode" de la dirección: la librería le cambiará el significado en su próxima versión
  // (avisa al arrancar) y su valor tendría prioridad sobre esta configuración.
  const direccion = new URL(process.env.DATABASE_URL);
  direccion.searchParams.delete('sslmode');

  pool = new Pool({
    connectionString: direccion.toString(),
    ssl: esLocal ? false : { rejectUnauthorized: true },
    // Conexiones simultáneas (algunas bases gratuitas admiten pocas)
    max: Number(process.env.PG_POOL_MAX) || 10
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
