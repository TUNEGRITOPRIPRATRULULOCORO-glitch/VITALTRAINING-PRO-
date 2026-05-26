const bcrypt = require('bcrypt');
const { readDB, writeDB } = require('./db');

async function hashPlainPasswords() {
  const db = readDB();
  let changed = false;

  for (const user of db.usuarios) {
    if (user.password && !user.password.startsWith('$2b$')) {
      user.password = await bcrypt.hash(user.password, 10);
      changed = true;
    }
  }

  if (changed) {
    writeDB(db);
    console.log('🔒 Contraseñas migradas a bcrypt');
  }
}

module.exports = { hashPlainPasswords };
