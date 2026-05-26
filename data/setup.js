const { query } = require('./db');
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function setupDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await query(schema);
  await seedUsuarios();
  console.log('✅ Base de datos lista');
}

async function seedUsuarios() {
  const { rows } = await query('SELECT COUNT(*) AS cnt FROM usuarios');
  if (parseInt(rows[0].cnt) > 0) return;

  const users = [
    { nombre: 'Admin Sistema', email: 'admin@vital.com',  password: 'admin123',  rol: 'Administrador' },
    { nombre: 'Maria Gomez',   email: 'maria@vital.com',  password: 'nutri123',  rol: 'Nutricionista' },
    { nombre: 'Pedro Lopez',   email: 'pedro@vital.com',  password: 'nutri123',  rol: 'Nutricionista' },
    { nombre: 'Carlos Ruiz',   email: 'carlos@vital.com', password: 'futbol123', rol: 'Futbolista'    },
    { nombre: 'Diego Torres',  email: 'diego@vital.com',  password: 'futbol123', rol: 'Futbolista'    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await query(
      `INSERT INTO usuarios (nombre, email, password, rol, estado, fecha_registro)
       VALUES ($1,$2,$3,$4,'Activo',$5) ON CONFLICT (email) DO NOTHING`,
      [u.nombre, u.email, hash, u.rol, new Date().toLocaleDateString('es-CO')]
    );
  }
  console.log('🌱 Usuarios iniciales creados');
}

module.exports = { setupDatabase };