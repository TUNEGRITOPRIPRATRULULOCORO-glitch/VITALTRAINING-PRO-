# VitalTraining

Plataforma web que junta en un solo lugar al **atleta, su nutricionista, su médico y el club**: entrenamiento, alimentación, salud, lesiones y seguimiento del equipo.

**App publicada:** https://vitaltraining-pro.onrender.com · se puede **instalar en el celular** como una app.

---

## Qué hace

| Rol | Qué puede hacer |
|---|---|
| **Atleta** | **"Hoy te toca…"**: lo que tiene que hacer hoy (salud, sesión y comidas). Rutina por deporte y posición, y plan de comidas para cualquier dieta (también vegana o con alergias). Registro de su salud diaria y de sus series (peso y repeticiones) con récords, **rangos de Bronce a Radiante**, **logros**, **clasificación** con su equipo o su deporte, tests físicos, **notificaciones en el celular**, chat con su entrenador, su nutricionista y su médico, y **Vita**, el asistente con IA |
| **Nutricionista** | Sus atletas, con estado de salud, carga de entrenamiento, cumplimiento y lesiones activas. Notas, comidas y rutinas asignadas, y mensajes |
| **Entrenador** | Sus atletas, con estado médico, "listo para entrenar" y carga. **Registra los tests físicos** (quedan ✓ verificados) y **verifica los récords de fuerza** que vio: así la clasificación del equipo no tiene marcas falsas |
| **Médico** | Expedientes: lesiones con estado **apto / en recuperación / baja médica**, notas clínicas (visibles para el atleta o solo para médicos), salud diaria, riesgo de lesión por carga y tests físicos |
| **Administrador** | Usuarios, **equipos** (cada profesional solo ve a los atletas de sus equipos), reportes y soporte |

**10 deportes:** fútbol, baloncesto, tenis, béisbol, atletismo, running, natación, boxeo, gimnasio y "estar en forma".

**Lo que la diferencia:** las apps que estudiamos (TrainingPeaks, Fitbod, Volt, MacroFactor, Peak, TrainHeroic, Strong, TrainUp) son de entrenamiento **o** de nutrición. Ninguna junta al atleta, al nutricionista y al médico, ni tiene un expediente médico.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | HTML, CSS y JavaScript sin frameworks (SPA) · app instalable (PWA) · Chart.js |
| Servidor | Node.js 20 · Express 4 · monolito modular (20 módulos) |
| Base de datos | PostgreSQL: **Neon** en la web, **PGlite** en tu computador, **pg-mem** en los tests |
| Seguridad | JWT · bcrypt · Helmet con CSP · límites de intentos · acceso por equipo |
| IA | Modelo propio de **machine learning** (Python + scikit-learn) para entender al atleta; Claude opcional |
| Servicios | Brevo (correos) · Google (entrar con Google) |
| Calidad | Jest (452 tests, ~94 % de cobertura) · GitHub Actions · SonarQube Cloud |
| Publicación | Docker · Render |

---

## Estructura

```
interfaz/        Lo que ve el usuario: index.html, styles.css, js/ (un archivo por rol), app instalable
servidor/        API con Express, un módulo por funcionalidad en servidor/api/
servicios/       Integraciones externas (correo con Brevo)
base-de-datos/   Conexión, tablas (schema.sql) y datos iniciales
ml/              Modelo de machine learning de Vita (Python + scikit-learn)
__tests__/       Pruebas con Jest
docs/            Arquitectura y guía de despliegue
```

Cada carpeta tiene su README con el detalle: [servidor](servidor/README.md) (módulos, tablas y reglas), [interfaz](interfaz/README.md) (archivos JS) y [ml](ml/README.md) (el modelo).

---

## Ejecutarla en tu computador

Necesitas **Node.js 20** o más nuevo.

```bash
git clone https://github.com/TUNEGRITOPRIPRATRULULOCORO-glitch/VITALTRAINING-PRO-.git
cd VITALTRAINING-PRO-
npm install
npm start
```

Abre **http://localhost:4000**. No hace falta configurar nada: la base de datos se crea sola en `base-de-datos/datos-locales/` y se conserva al reiniciar. Para empezar de cero, borra esa carpeta.

**Cuentas de prueba (solo en tu computador; en la web publicada están desactivadas):**

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@vital.com` | `admin123` |
| Nutricionista | `maria@vital.com` | `nutri123` |
| Médico | `medico@vital.com` | `medico123` |
| Entrenador | `entrenador@vital.com` | `entrenador123` |
| Atleta | `carlos@vital.com` · `diego@vital.com` | `futbol123` |

Con Docker (base PostgreSQL en un contenedor): copia `.env.example` como `.env`, rellena `POSTGRES_PASSWORD` y `JWT_SECRET`, y ejecuta `docker-compose up --build`.

---

## Variables de entorno

En local no hace falta ninguna. En la web viven en Render (grupo **Pro**); el código nunca lleva sus valores. Ver [`.env.example`](.env.example).

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Base PostgreSQL (Neon). Sin ella, base local |
| `JWT_SECRET` · `JWT_EXPIRES_IN` | Firmar las sesiones (obligatoria en producción) · duración (8 h) |
| `ADMIN_PASSWORD` | Contraseña del admin al crear la base en producción |
| `DATOS_DEMO` | `true` crea las cuentas de prueba (en la web está en `false`) |
| `BREVO_API_KEY` · `CORREO_REMITENTE` · `CORREO_NOMBRE` · `APP_URL` | Correos (bienvenida, contraseña, alertas) |
| `GOOGLE_CLIENT_ID` | Botón "Entrar con Google" |
| `ANTHROPIC_API_KEY` | Opcional: Vita conversa con Claude. Sin ella usa el modelo propio, gratis |
| `CRON_SECRET` | Secreto de la tarea diaria de GitHub Actions que envía el recordatorio al celular (mismo valor en GitHub y en Render) |
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` | Opcional: claves de las notificaciones. Sin ellas el servidor las genera y las guarda en la base |
| `CORS_ORIGIN` · `PORT` | Dominio permitido si la interfaz va aparte · puerto (4000) |

---

## Pruebas

```bash
npm test                 # 452 pruebas
npm run test:coverage    # con informe de cobertura en coverage/lcov-report/index.html
```

Las pruebas de servicios usan una base PostgreSQL en memoria (pg-mem) con las tablas reales: no tocan tus datos. GitHub Actions las pasa en cada subida y construye la imagen de Docker; SonarQube Cloud analiza la calidad.

---

## Documentación

| Documento | Para qué |
|---|---|
| [DOCUMENTACION.md](DOCUMENTACION.md) | **Documentación técnica completa**: arquitectura, base de datos, seguridad, cómo funciona cada parte, API y preguntas frecuentes |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Dónde vive la app (Render, Neon, GitHub…) y guion para presentarla |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Publicarla gratis paso a paso (Neon + Render) |
| [ml/README.md](ml/README.md) | El modelo de machine learning de Vita |

---

## Licencia

ISC · Proyecto académico · VitalTraining 2026
