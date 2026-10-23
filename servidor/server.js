require('dotenv').config();

// Render define RENDER=true: ahí siempre es producción, aunque falte NODE_ENV
if (process.env.RENDER === 'true' && !process.env.NODE_ENV) process.env.NODE_ENV = 'production';

// Sin DATABASE_URL en producción la app usaría la base local (PGlite), que en un hosting
// gratuito se queda sin memoria. Mejor avisar claro antes de cargarla.
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL: en producción hay que configurar la base de datos (por ejemplo la cadena de Neon).');
  process.exit(1);
}

const express = require('express');
const helmet  = require('helmet');
const path    = require('path');
const { setupDatabase } = require('../base-de-datos/setup');

const app  = express();
const PORT = process.env.PORT || 4000;
const PRODUCCION = process.env.NODE_ENV === 'production';

if (PRODUCCION && !process.env.JWT_SECRET) {
  console.error('❌ Falta JWT_SECRET: en producción las sesiones no pueden firmarse con la clave de desarrollo.');
  process.exit(1);
}

// En Render (y la mayoría de hostings) hay un proxy delante: sin esto, todos los usuarios
// compartirían la IP del proxy y el límite de intentos de login sería común para todos.
if (PRODUCCION || process.env.TRUST_PROXY) app.set('trust proxy', 1);

// La ventana de "Entrar con Google" necesita comunicarse con la página (popups) y saber de qué web viene
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
// Límite pequeño para todo; la subida de foto de perfil necesita más (máx. 300 KB de imagen en base64)
const jsonNormal = express.json({ limit: '50kb' });
const jsonFoto   = express.json({ limit: '450kb' });
app.use((req, res, next) => (req.path === '/api/cuenta/foto' ? jsonFoto : jsonNormal)(req, res, next));
app.use(require('./compartido/middleware/cors'));
// HTML, JS y CSS: el navegador pregunta siempre si hay versión nueva (responde 304 si no),
// así tras cada despliegue nadie se queda con la interfaz vieja.
const SIEMPRE_REVISAR = /\.(html|js|css)$/;
app.use(express.static(path.join(__dirname, '..', 'interfaz'), {
  setHeaders: (res, ruta) => { if (SIEMPRE_REVISAR.test(ruta)) res.setHeader('Cache-Control', 'no-cache'); },
}));

app.use('/api', require('./api'));

app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, '..', 'interfaz', 'index.html'));
});

setupDatabase()
  .then(async () => {
    // Sin consola en el hosting gratuito: los datos de ejemplo se cargan al arrancar (solo una vez)
    if (process.env.DATOS_DEMO === 'true') await require('../scripts/datos-demo').cargarDatosDemo();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 VitalTraining — Servidor iniciado');
      console.log(PRODUCCION ? `📡 Escuchando en el puerto ${PORT}` : `📡 http://localhost:${PORT}`);
      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ Error iniciando base de datos:', err.message);
    process.exit(1);
  });