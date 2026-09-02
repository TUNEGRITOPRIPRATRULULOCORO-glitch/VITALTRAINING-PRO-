const { Pool } = require('pg');

// SSL solo si es una conexión remota (Railway), no en local con Docker
const esLocal = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@db:');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL && !esLocal) ? { rejectUnauthorized: false } : false
});

const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };