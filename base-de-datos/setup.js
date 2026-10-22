const { query } = require('./db');
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function setupDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--'));

  for (const statement of statements) {
    try {
      await query(statement);
    } catch (err) {
      // En una base ya creada, los ADD CONSTRAINT fallan porque la restricción ya existe
      if (!yaExiste(err)) throw err;
    }
  }

  await aplicarMigraciones();
  await seedUsuarios();
  console.log(`✅ Base de datos lista · ${require('./db').motor}`);
}

// Columnas añadidas después de la primera versión del esquema.
// En bases nuevas ya vienen en schema.sql; aquí se añaden a las bases existentes.
const MIGRACIONES = [
  'ALTER TABLE rutinas      ADD COLUMN rpe INTEGER',
  "ALTER TABLE cumplimiento ADD COLUMN estado VARCHAR(20) DEFAULT 'completo'",
  'ALTER TABLE cumplimiento ADD COLUMN rpe INTEGER',
  'ALTER TABLE cumplimiento ADD COLUMN duracion_minutos INTEGER',
];

async function aplicarMigraciones() {
  for (const sql of MIGRACIONES) {
    try {
      await query(sql);
    } catch (err) {
      if (!yaExiste(err)) throw err;
    }
  }
}

// 42701 = columna duplicada, 42710 = objeto duplicado (PostgreSQL); pg-mem solo da el mensaje
function yaExiste(err) {
  return ['42701', '42710'].includes(err.code) || /already exists|ya existe/i.test(err.message);
}

async function seedUsuarios() {
  const { rows } = await query('SELECT COUNT(*) AS cnt FROM usuarios');
  if (parseInt(rows[0].cnt) > 0) return;

  const users = [
    { nombre: 'Admin Sistema', email: 'admin@vital.com',  password: 'admin123',  rol: 'Administrador', deporte_principal: 'Fútbol' },
    { nombre: 'Maria Gomez',   email: 'maria@vital.com',  password: 'nutri123',  rol: 'Nutricionista', deporte_principal: 'Baloncesto' },
    { nombre: 'Pedro Lopez',   email: 'pedro@vital.com',  password: 'nutri123',  rol: 'Nutricionista', deporte_principal: 'Tenis' },
    { nombre: 'Dr. Vital',     email: 'medico@vital.com', password: 'medico123', rol: 'Medico',         deporte_principal: 'Fútbol' },
    { nombre: 'Carlos Ruiz',   email: 'carlos@vital.com', password: 'futbol123', rol: 'Atleta', deporte_principal: 'Fútbol' },
    { nombre: 'Diego Torres',  email: 'diego@vital.com',  password: 'futbol123', rol: 'Atleta', deporte_principal: 'Baloncesto' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await query(
      `INSERT INTO usuarios (nombre, email, password, rol, estado, deporte_principal, fecha_registro)
       VALUES ($1,$2,$3,$4,'Activo',$5,$6) ON CONFLICT (email) DO NOTHING`,
      [u.nombre, u.email, hash, u.rol, u.deporte_principal, new Date().toLocaleDateString('es-CO')]
    );
  }
  console.log('🌱 Usuarios iniciales creados');
}

module.exports = { setupDatabase };