# Vital Training — Sistema de Gestión Deportiva

Plataforma web para la gestión integral de futbolistas, nutricionistas y administradores. Permite hacer seguimiento de salud, planes de alimentación personalizados, rutinas de entrenamiento adaptadas al perfil médico y asistencia con IA.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 · CSS3 · JavaScript (SPA vanilla) |
| Backend | Node.js 20 · Express 4 |
| Base de datos | JSON flat-file (`database.json`) |
| Autenticación | JWT (Bearer Token · 8h) |
| Seguridad | bcrypt (salt rounds: 10) |
| Contenedor | Docker · Docker Compose |
| CI/CD | GitHub Actions |
| Tests | Jest 29 |

---

## Arquitectura

El proyecto está dividido en 4 bloques:

| Bloque | Carpeta | ¿Para qué? |
|---|---|---|
| 🖥️ **Interfaz** | [`interfaz/`](interfaz/) | Lo que ve el usuario: pantallas HTML, estilos y JS del navegador |
| 🗄️ **Servidor** | [`servidor/`](servidor/) | API REST con Express, organizada como monolito modular ([reglas](servidor/README.md)) |
| ✉️ **Servicios** | [`servicios/`](servicios/) | Integraciones externas: correo, pagos, IA (n8n) |
| 💾 **Base de datos** | [`base-de-datos/`](base-de-datos/) | Conexión a PostgreSQL, tablas (`schema.sql`) y datos iniciales |

```
vital-training/
├── interfaz/               # 🖥️ INTERFAZ — SPA en HTML, CSS y JS
│   ├── index.html
│   ├── ayuda.html
│   ├── privacidad.html
│   ├── styles.css
│   ├── js/                 # lógica del navegador, un archivo por rol (ver interfaz/README.md)
│   └── img/
│
├── servidor/               # 🗄️ SERVIDOR — Node.js + Express
│   ├── server.js           # Punto de entrada
│   ├── compartido/         # middleware común: auth (JWT) · roles · cors
│   └── api/                # Monolito modular: un módulo por funcionalidad, cada uno con index.js público
│       ├── auth/           # Login · Registro
│       ├── usuarios/       # CRUD usuarios (Admin)
│       ├── panel/          # Dashboard · Historial · Perfil
│       ├── salud/          # Registros diarios de salud
│       ├── perfilMedico/   # Onboarding · Plan alimenticio · Rutina
│       ├── ia/             # Asistente IA + contexto para n8n
│       ├── rendimiento/    # Listo para entrenar · carga y riesgo de lesión · cumplimiento
│       ├── mensajes/       # Chat atleta ↔ nutricionista/médico, equipo ↔ administración
│       ├── evaluaciones/   # Tests físicos periódicos (salto, sprint, agilidad, Yo-Yo)
│       ├── nutricionista/  # Panel nutricionista
│       ├── incidencias/    # Soporte / tickets
│       └── reportes/       # Estadísticas admin
│
├── servicios/              # ✉️ SERVICIOS — integraciones con terceros
│   └── correo/             # Envío de correos (Brevo) y plantillas
│
├── base-de-datos/          # 💾 BASE DE DATOS — PostgreSQL
│   ├── db.js               # Conexión (PostgreSQL real o pg-mem en memoria)
│   ├── schema.sql          # Definición de tablas
│   └── setup.js            # Crea tablas y usuarios de prueba al arrancar
│
├── __tests__/              # Pruebas unitarias Jest
├── scripts/                # Utilidades sueltas (no forman parte de la app)
├── Dockerfile
└── docker-compose.yml
```

### Roles del sistema

| Rol | Acceso |
|---|---|
| **Administrador** | Dashboard global · Gestión de usuarios · Reportes · Soporte |
| **Nutricionista** | Panel de pacientes · Estado de salud · Alertas |
| **Médico** | Consulta de expedientes médicos de atletas |
| **Futbolista** | Mi Salud · Mi Plan · Historial · Asistente IA · Soporte |

---

## Requisitos previos

- Node.js 20+
- npm 9+
- (Opcional) Docker Desktop

---

## Ejecución local

### Sin Docker

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd vital-training

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env si es necesario

# 4. (Opcional) Cargar datos de ejemplo
npm run demo

# 5. Iniciar servidor
npm start
```

Abrir en el navegador: **http://localhost:4000**

**Dónde se guardan los datos:**

| Situación | Base de datos | ¿Se conserva al reiniciar? |
|---|---|---|
| `DATABASE_URL` en `.env` | PostgreSQL real | Sí |
| Desarrollo sin `DATABASE_URL` | PGlite (PostgreSQL en un archivo) en `base-de-datos/datos-locales/` | Sí |
| Tests (`npm test`) | pg-mem en memoria | No (cada test empieza vacío) |

Para empezar de cero en local, borra la carpeta `base-de-datos/datos-locales/`. Esa carpeta no se sube a GitHub.

### Publicarla en internet

Guía paso a paso para tenerla en un enlace público gratis (Neon + Render): **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

### Con Docker

Antes, copia `.env.example` como `.env` y rellena `POSTGRES_PASSWORD` y `JWT_SECRET` (las contraseñas no van en `docker-compose.yml`).

```bash
# Construir y levantar
docker-compose up --build

# Detener
docker-compose down
```

Abrir en el navegador: **http://localhost:4000**

---

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `4000` |
| `JWT_SECRET` | Clave secreta para firmar tokens | `vt-super-secret-key-2026` |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `8h` |

---

## Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@vital.com` | `admin123` |
| Nutricionista | `maria@vital.com` | `nutri123` |
| Nutricionista | `pedro@vital.com` | `nutri123` |
| Médico | `medico@vital.com` | `medico123` |
| Futbolista | `carlos@vital.com` | `futbol123` |
| Futbolista | `diego@vital.com` | `futbol123` |

---

## API REST — Endpoints principales

Todas las rutas (excepto `/api/auth/*`) requieren header:
```
Authorization: Bearer <token>
```

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/registro` | Registrar nuevo futbolista |

### Panel Futbolista
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/panel/:id/dashboard` | Resumen del panel |
| `GET` | `/api/panel/:id/historial/comidas` | Historial de comidas (paginado) |
| `POST` | `/api/panel/:id/comidas` | Registrar comida |
| `DELETE` | `/api/panel/:id/comidas/:comidaId` | Eliminar comida |
| `GET` | `/api/panel/:id/cumplimiento` | Registros de cumplimiento de rutina |
| `POST` | `/api/panel/:id/cumplimiento` | Marcar día de rutina como completado |

### Salud
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/salud/:id` | Obtener registros de salud |
| `POST` | `/api/salud/:id` | Registrar estado de salud del día |

### Perfil Médico
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/perfil-medico/catalogos` | Catálogos (condiciones, alergias, preferencias) |
| `GET` | `/api/perfil-medico/:id` | Obtener perfil médico del usuario |
| `POST` | `/api/perfil-medico/:id` | Guardar/actualizar perfil médico |

### Asistente IA
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/ia/:id/consulta` | Consulta al asistente IA |

### Admin — Usuarios
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/usuarios` | Listar todos los usuarios |
| `POST` | `/api/usuarios` | Crear usuario |
| `PUT` | `/api/usuarios/:id` | Actualizar usuario |
| `DELETE` | `/api/usuarios/:id` | Eliminar usuario |

---

## Pruebas

```bash
# Ejecutar pruebas
npm test

# Ejecutar con cobertura
npm test -- --coverage
```

Los reportes de cobertura se generan en `coverage/lcov-report/index.html`.

---

## Docker

```dockerfile
# Imagen base: Node 20 Alpine
# Puerto expuesto: 4000
# Comando: node servidor/server.js
```

```bash
# Solo el contenedor
docker build -t vital-training .
docker run -p 4000:4000 vital-training

# Con compose (recomendado)
docker-compose up --build
```

---

## Flujo principal

```
1. Registro / Login
       ↓
2. Futbolista → Onboarding médico (condiciones · alergias · preferencia)
       ↓
3. Generación automática de Plan Alimenticio + Rutina Semanal
       ↓
4. Registro diario de salud (fatiga · sueño · recuperación)
       ↓
5. Asistente IA analiza perfil médico + datos de salud
       ↓
6. Nutricionista monitorea pacientes · Admin supervisa plataforma
```

---

## Licencia

ISC — Proyecto académico · Vital Training 2026