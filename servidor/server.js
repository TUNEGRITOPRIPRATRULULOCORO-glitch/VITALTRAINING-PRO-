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

// Política de contenido: el navegador solo carga código, estilos e imágenes de estos sitios.
// - jsdelivr: gráficas (Chart.js) · fonts.googleapis/gstatic: tipografías · accounts.google.com: "Entrar con Google"
// - 'unsafe-inline' en scripts y atributos: la interfaz usa onclick="..." en el HTML (y ayuda.html un <script> propio)
// - blob: y data: en imágenes: fotos de perfil (se descargan con el token y se muestran como blob)
const GOOGLE_GSI = 'https://accounts.google.com/gsi/';
const politicaContenido = {
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', `${GOOGLE_GSI}client`],
    scriptSrcAttr: ["'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', `${GOOGLE_GSI}style`],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: ["'self'", GOOGLE_GSI],
    frameSrc: [GOOGLE_GSI],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    // En local la app va por http: forzar https rompería la carga
    upgradeInsecureRequests: PRODUCCION ? [] : null,
  },
};

// La ventana de "Entrar con Google" necesita comunicarse con la página (popups) y saber de qué web viene
app.use(helmet({
  contentSecurityPolicy: politicaContenido,
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
  extensions: ['html'], // /privacidad sirve privacidad.html
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
      // Club de demostración (solo si se definió su contraseña): se crea después de arrancar, sin bloquear
      if (process.env.CLUB_DEMO_PASSWORD) {
        require('../scripts/club-demo').crearClubDemo().catch(err => console.error('❌ Club demo:', err.message));
      }
    });
  })
  .catch(err => {
    console.error('❌ Error iniciando base de datos:', err.message);
    process.exit(1);
  });