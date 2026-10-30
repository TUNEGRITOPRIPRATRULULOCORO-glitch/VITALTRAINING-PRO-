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
    if (await restriccionYaCreada(statement)) continue;
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
  'ALTER TABLE perfiles     ADD COLUMN sexo VARCHAR(20)',
  'ALTER TABLE perfiles     ADD COLUMN dia_partido VARCHAR(12)',
  'ALTER TABLE evaluaciones ADD COLUMN verificado BOOLEAN DEFAULT FALSE',
  'ALTER TABLE series       ADD COLUMN verificado BOOLEAN DEFAULT FALSE',
  'ALTER TABLE series       ADD COLUMN verificado_por VARCHAR(255)',
];

// PostgreSQL y PGlite permiten comprobar antes; pg-mem (tests) no, y ahí se usa el error "ya existe".
// Evitar errores a propósito mantiene limpios los registros del servidor en producción.
const COMPRUEBA_ANTES = require('./db').motor !== 'pg-mem';

async function restriccionYaCreada(sql) {
  const m = /ADD CONSTRAINT (\w+)/i.exec(sql);
  if (!m || !COMPRUEBA_ANTES) return false;
  const { rows } = await query('SELECT 1 FROM pg_constraint WHERE conname = $1', [m[1]]);
  return rows.length > 0;
}

async function aplicarMigraciones() {
  for (const migracion of MIGRACIONES) {
    const sql = COMPRUEBA_ANTES ? migracion.replace(/ADD COLUMN /i, 'ADD COLUMN IF NOT EXISTS ') : migracion;
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

/**
 * Usuarios iniciales, solo si la base está vacía.
 * - En desarrollo: el admin y las cuentas de prueba con contraseñas conocidas.
 * - En producción (NODE_ENV=production): el admin usa ADMIN_PASSWORD (obligatoria) y las
 *   cuentas de prueba solo se crean si DATOS_DEMO=true (útil para una demo en clase).
 */
async function seedUsuarios() {
  const { rows } = await query('SELECT COUNT(*) AS cnt FROM usuarios');
  if (Number.parseInt(rows[0].cnt, 10) > 0) return;

  const produccion = process.env.NODE_ENV === 'production';
  if (produccion && !process.env.ADMIN_PASSWORD) {
    throw new Error('Falta ADMIN_PASSWORD: en producción la contraseña del administrador no puede ser la de prueba.');
  }
  const conDemo = !produccion || process.env.DATOS_DEMO === 'true';

  const users = [
    { nombre: 'Admin Sistema', email: 'admin@vital.com',  password: process.env.ADMIN_PASSWORD || 'admin123', rol: 'Administrador', deporte_principal: 'Fútbol' },
    ...(conDemo ? [
      { nombre: 'Maria Gomez',   email: 'maria@vital.com',  password: 'nutri123',  rol: 'Nutricionista', deporte_principal: 'Baloncesto' },
      { nombre: 'Pedro Lopez',   email: 'pedro@vital.com',  password: 'nutri123',  rol: 'Nutricionista', deporte_principal: 'Tenis' },
      { nombre: 'Dr. Vital',     email: 'medico@vital.com', password: 'medico123', rol: 'Medico',         deporte_principal: 'Fútbol' }, // NOSONAR: cuenta de demostración con contraseña pública a propósito
      { nombre: 'Profe Ramírez', email: 'entrenador@vital.com', password: 'entrenador123', rol: 'Entrenador', deporte_principal: 'Fútbol' }, // NOSONAR: cuenta de demostración con contraseña pública a propósito
      { nombre: 'Carlos Ruiz',   email: 'carlos@vital.com', password: 'futbol123', rol: 'Atleta', deporte_principal: 'Fútbol' }, // NOSONAR: cuenta de demostración con contraseña pública a propósito
      { nombre: 'Diego Torres',  email: 'diego@vital.com',  password: 'futbol123', rol: 'Atleta', deporte_principal: 'Baloncesto' }, // NOSONAR: cuenta de demostración con contraseña pública a propósito
    ] : []),
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