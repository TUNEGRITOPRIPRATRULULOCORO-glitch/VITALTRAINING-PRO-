require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const path    = require('path');
const { setupDatabase } = require('./data/setup');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '50kb' }));
app.use(require('./middleware/cors'));
app.use(express.static(path.join(__dirname, 'frontend')));

app.use('/api', require('./api'));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

setupDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Vital Training — Servidor iniciado');
      console.log(`📡 http://localhost:${PORT}`);
      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ Error iniciando base de datos:', err.message);
    process.exit(1);
  });