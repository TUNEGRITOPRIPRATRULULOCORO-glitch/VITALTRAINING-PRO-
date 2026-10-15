let pool;
let query;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');

  // SSL solo si es una conexión remota (Railway), no en local con Docker
  const esLocal = process.env.DATABASE_URL.includes('@db:');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: !esLocal && process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  query = (text, params) => pool.query(text, params);
} else {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const { Pool: PgMemPool } = db.adapters.createPg();

  pool = new PgMemPool();
  query = (text, params) => pool.query(text, params);
}

module.exports = { query, pool };