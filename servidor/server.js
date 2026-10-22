require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const path    = require('path');
const { setupDatabase } = require('../base-de-datos/setup');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
// Límite pequeño para todo; la subida de foto de perfil necesita más (máx. 300 KB de imagen en base64)
const jsonNormal = express.json({ limit: '50kb' });
const jsonFoto   = express.json({ limit: '450kb' });
app.use((req, res, next) => (req.path === '/api/cuenta/foto' ? jsonFoto : jsonNormal)(req, res, next));
app.use(require('./compartido/middleware/cors'));
app.use(express.static(path.join(__dirname, '..', 'interfaz')));

app.use('/api', require('./api'));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'interfaz', 'index.html'));
});

setupDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Vital Sports — Servidor iniciado');
      console.log(`📡 http://localhost:${PORT}`);
      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ Error iniciando base de datos:', err.message);
    process.exit(1);
  });