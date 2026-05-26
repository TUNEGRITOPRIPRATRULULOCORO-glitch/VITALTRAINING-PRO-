# VITAL TRAINING — Documentación Técnica del Proyecto

---

## 1. ¿Qué es el proyecto?

**Vital Training** es una plataforma web de gestión deportiva orientada a equipos de fútbol. Permite que futbolistas registren su alimentación, entrenamientos y estado de salud diario; que nutricionistas hagan seguimiento personalizado de cada atleta; y que el administrador gestione los usuarios y soporte del sistema.

**Problema que resuelve:** Los equipos de fútbol amateur y semiprofesional no tienen herramientas centralizadas para que el nutricionista, el jugador y la administración compartan información de salud, nutrición y rendimiento en un solo lugar.

---

## 2. Arquitectura del Sistema

El sistema sigue una arquitectura de **3 capas separadas**:

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE (Navegador)                   │
│           Frontend: HTML + CSS + JavaScript              │
│           Archivo único: frontend/index.html             │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP REST (JSON)
                           │ Authorization: Bearer <token>
┌──────────────────────────▼──────────────────────────────┐
│                   BACKEND (Node.js + Express)            │
│           Puerto 4000 — server.js                        │
│           Sirve el frontend estático Y la API            │
│           Estructura: api/ → routes → controller → service│
└──────────────────────────┬──────────────────────────────┘
                           │ pg (driver oficial)
                           │ SSL obligatorio
┌──────────────────────────▼──────────────────────────────┐
│              BASE DE DATOS (PostgreSQL — Neon)           │
│           Cloud SQL · Serverless · SSL requerido         │
│           10 tablas relacionadas                         │
└─────────────────────────────────────────────────────────┘
```

**Comunicación:** El frontend llama al backend con `fetch()` y un token JWT en el header `Authorization: Bearer <token>`. El backend valida el token, consulta PostgreSQL con queries parametrizadas y devuelve JSON.

---

## 3. Base de Datos

### Motor elegido: PostgreSQL

**¿Por qué PostgreSQL y no MySQL o MongoDB?**
- Soporte nativo de **JSONB** (columnas JSON con índices): permite guardar arrays complejos como `condiciones médicas`, `plan alimenticio semanal` y `comentarios de tickets` sin tablas extra.
- **Constraint `UNIQUE(user_id, fecha)`** en la tabla `salud` para evitar doble registro en el mismo día a nivel de base de datos.
- **`ON DELETE CASCADE`** en todas las foreign keys: al eliminar un usuario se borran automáticamente todos sus datos relacionados.
- **`BIGSERIAL`** para IDs autoincrement seguros.
- Operadores especiales como `ANY($1)` y `ALL($1)` para filtrar arrays de categorías de incidencias.

### Proveedor: Neon (PostgreSQL serverless en la nube)

Neon es una plataforma de PostgreSQL serverless. La conexión se configura mediante la variable de entorno `DATABASE_URL` (connection string completo). Se usa SSL obligatorio (`rejectUnauthorized: false`) porque Neon exige conexión encriptada.

```js
// data/db.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});
```

### Inicialización automática

Al arrancar el servidor, `data/setup.js` ejecuta `data/schema.sql` con `CREATE TABLE IF NOT EXISTS` — esto significa que las tablas se crean solas si no existen. Si la base de datos está vacía también inserta 5 usuarios de prueba con contraseñas hasheadas.

### Tablas y relaciones

| Tabla | Descripción | FK |
|-------|-------------|-----|
| `usuarios` | Todos los usuarios del sistema (Futbolista, Nutricionista, Admin) | — |
| `perfiles` | Datos deportivos del futbolista (posición, peso, altura, edad) | `user_id → usuarios` |
| `perfiles_medicos` | Condiciones médicas, alergias, plan alimenticio y rutina generados por IA local | `user_id → usuarios` |
| `salud` | Registro diario de fatiga, sueño y recuperación (1 por día por usuario) | `user_id → usuarios` |
| `alertas` | Alertas automáticas generadas cuando fatiga ≥ 8 o recuperación ≤ 3 | `user_id → usuarios` |
| `comidas` | Historial de comidas registradas (por el futbolista o el nutricionista) | `user_id → usuarios` |
| `rutinas` | Historial de sesiones de entrenamiento | `user_id → usuarios` |
| `incidencias` | Tickets de soporte (comentarios guardados como JSONB) | `user_id → usuarios` |
| `notas_nutricionista` | Observaciones del nutricionista sobre un atleta | `user_id → usuarios` |
| `cumplimiento` | Registro de cumplimiento del plan semanal | `user_id → usuarios` |

**Relación principal:** todos los datos giran alrededor de `usuarios`. Cada tabla tiene una foreign key `user_id` con `ON DELETE CASCADE`.

**Columnas JSONB usadas:**
- `perfiles_medicos.condiciones` → array de strings con enfermedades
- `perfiles_medicos.alergias` → array de strings con alergias
- `perfiles_medicos.plan_alimenticio` → objeto con 7 días de comidas generadas
- `perfiles_medicos.rutina_semanal` → objeto con 7 días de ejercicios
- `incidencias.comentarios` → array de objetos `{autor, fecha, texto}`

---

## 4. Backend

### Tecnología: Node.js + Express

**¿Por qué Node.js?**
- JavaScript tanto en frontend como backend → mismo lenguaje para el equipo.
- Modelo asíncrono (async/await) ideal para operaciones I/O intensivas como consultas a base de datos.
- Ecosistema npm: acceso a todas las librerías necesarias.

**¿Por qué Express?**
- Framework minimalista y flexible para crear APIs REST.
- Middleware encadenado: cada request pasa por CORS → Helmet → Auth → Roles → Controller.
- Router modular: cada dominio tiene su propio archivo de rutas.

### Estructura de carpetas del backend

```
server.js                    ← Punto de entrada, configura middleware global
api/
  index.js                   ← Router principal, aplica auth en todas las rutas
  auth/
    auth.routes.js            ← POST /login, POST /registro
    auth.controller.js        ← Recibe request, llama al service
    auth.service.js           ← Lógica: bcrypt, JWT, validaciones
  usuarios/                  ← CRUD de usuarios (solo Admin)
  panel/                     ← Dashboard, perfil, historial, alertas, cumplimiento
  salud/                     ← Registros diarios de salud
  nutricionista/             ← Endpoints exclusivos del nutricionista
  incidencias/               ← Sistema de tickets de soporte
  reportes/                  ← Estadísticas globales (solo Admin)
  ia/                        ← Asistente IA local basado en reglas
  perfilMedico/              ← Perfil médico y generación de plan/rutina
middleware/
  auth.js                    ← Verifica JWT en cada request protegida
  roles.js                   ← requireRol() y requireOwnerOrRol()
  cors.js                    ← Configuración de CORS
data/
  db.js                      ← Pool de conexiones PostgreSQL
  schema.sql                 ← DDL de todas las tablas
  setup.js                   ← Inicializa BD y seed de usuarios
```

### Patrón de capas (Routes → Controller → Service)

```
Request HTTP
    ↓
Router (incidencias.routes.js)     → solo define URL y método
    ↓
Controller (incidencias.controller.js) → recibe req/res, valida básico, llama service
    ↓
Service (incidencias.service.js)   → toda la lógica de negocio y queries SQL
    ↓
db.js (Pool PostgreSQL)            → ejecuta query parametrizada
```

**Regla:** ningún controlador hace queries directamente. Toda la lógica de negocio está en el service.

### Dependencias principales

| Librería | Versión | Uso |
|----------|---------|-----|
| `express` | 4.22 | Framework HTTP |
| `pg` | 8.21 | Driver PostgreSQL |
| `bcrypt` | 6.0 | Hasheo de contraseñas |
| `jsonwebtoken` | 9.0 | Creación y verificación de JWT |
| `helmet` | 8.2 | Headers HTTP de seguridad |
| `express-rate-limit` | 8.5 | Límite de intentos de login |
| `dotenv` | 17.4 | Variables de entorno desde .env |

---

## 5. Seguridad

### 5.1 Autenticación con JWT

**¿Qué es JWT?** JSON Web Token. Es un token firmado digitalmente que el servidor genera al hacer login. El cliente lo guarda y lo envía en cada petición en el header `Authorization: Bearer <token>`.

**Flujo:**
1. El usuario envía email + password a `POST /api/auth/login`
2. El backend verifica el password con `bcrypt.compare()`
3. Si es correcto, genera un JWT firmado con `JWT_SECRET` y expiración de 8 horas
4. El frontend guarda el token en `sessionStorage`
5. Cada request siguiente incluye el token → el middleware `auth.js` lo verifica con `jwt.verify()`
6. Si el token expiró o es inválido → 401 Unauthorized → el frontend redirige al login

**Payload del token:**
```json
{ "id": 1, "nombre": "Carlos Ruiz", "email": "carlos@vital.com", "rol": "Futbolista" }
```

### 5.2 Encriptación de contraseñas con bcrypt

Bcrypt nunca guarda la contraseña en texto plano. Aplica una función de hash con **10 rondas de salt** (trabajo computacional deliberadamente lento para dificultar ataques de fuerza bruta).

```js
// Al crear usuario:
const hashed = await bcrypt.hash(password, 10);  // "abc123" → "$2b$10$..."

// Al verificar login:
const match = await bcrypt.compare(password, usuario.password); // true/false
```

La contraseña nunca viaja de vuelta al cliente. En todas las queries de SELECT se excluye el campo `password`.

### 5.3 Control de roles

Existen 3 roles con permisos distintos:

| Rol | Acceso |
|-----|--------|
| **Futbolista** | Solo sus propios datos (panel, salud, historial, plan, IA, soporte) |
| **Nutricionista** | Sus datos + ver/gestionar datos de todos los futbolistas + tickets de nutrición/salud |
| **Administrador** | Todo: usuarios, reportes, todos los tickets, todos los datos |

**Middleware `requireRol`:** verifica que `req.user.rol` sea uno de los roles permitidos.

```js
// Ejemplo: solo Admin puede gestionar usuarios
router.use('/usuarios', requireRol('Administrador'), usuariosRoutes);
```

**Middleware `requireOwnerOrRol`:** permite al dueño del recurso O a un rol privilegiado.

```js
// Ejemplo: el futbolista puede ver sus datos, y también el nutricionista o admin
router.param('userId', requireOwnerOrRol('Administrador', 'Nutricionista'));
```

### 5.4 Routing de tickets por categoría

Los tickets se enrutan automáticamente por categoría sin columna extra en la BD:

```js
const CATS_NUTRI = ['Nutrición', 'Plan alimenticio', 'Salud', 'Alimentación'];

function destinatario(categoria) {
  return CATS_NUTRI.includes(categoria) ? 'Nutricionista' : 'Administrador';
}
```

El nutricionista solo ve tickets de las 4 categorías que le corresponden. El admin ve el resto. Ninguno puede responder tickets del otro.

### 5.5 Otras medidas de seguridad

| Medida | Implementación | Qué protege |
|--------|---------------|-------------|
| **Helmet** | `helmet({ contentSecurityPolicy: false })` | 15+ headers HTTP de seguridad automáticos |
| **Rate limiting** | 10 intentos / 15 minutos en `/api/auth/login` | Ataques de fuerza bruta al login |
| **Payload limit** | `express.json({ limit: '50kb' })` | Ataques con bodies enormes |
| **CORS** | Configurable por `CORS_ORIGIN` en .env | Solo permite el origen configurado en producción |
| **Queries parametrizadas** | `query('SELECT ... WHERE id = $1', [id])` | SQL Injection imposible |
| **XSS** | `escapeHtml()` en todo innerHTML del frontend | Inyección de scripts en la interfaz |
| **IDOR bloqueado** | `requireOwnerOrRol` en rutas con `:userId` | Impide acceder a datos de otros usuarios |

---

## 6. Frontend

### Tecnología: HTML + CSS + JavaScript vanilla (SPA)

**¿Qué es una SPA?** Single Page Application. Todo el sistema está en un solo archivo `index.html`. La navegación entre vistas se hace con JavaScript modificando el DOM, sin recargar la página.

**¿Por qué vanilla y no React/Vue?**
- Sin build tools, sin npm en frontend → se despliega como archivos estáticos simples.
- El backend sirve el frontend directamente con `express.static('frontend')`.
- Todo en un repositorio unificado.

### Estructura del frontend

```
frontend/
  index.html    ← Contiene todos los paneles (admin, nutricionista, futbolista) ocultos con CSS
  script.js     ← Toda la lógica: auth, routing de vistas, llamadas API, renderizado
  styles.css    ← Estilos: variables CSS, dark mode, componentes reutilizables
```

### Cómo funciona la navegación

Cada panel tiene su función de renderizado:
- `renderView(view)` → Admin
- `ntRenderView(view)` → Nutricionista  
- `pfRenderView(view)` → Futbolista

Al iniciar, `window.addEventListener('load')` revisa si hay sesión guardada en `sessionStorage`. Si la hay, llama a `routeUser()` que muestra el panel correspondiente al rol.

### Gestión de estado de sesión

```js
// Guardar al hacer login:
sessionStorage.setItem('vt_user', JSON.stringify(usuario));
sessionStorage.setItem('vt_token', token);

// Leer en cada petición:
const token = sessionStorage.getItem('vt_token');
// Header automático en todos los fetch:
'Authorization': `Bearer ${token}`
```

Si el backend devuelve 401, el frontend borra la sesión y muestra el login automáticamente.

### Gráficas: Chart.js v3

Se usa Chart.js cargado desde CDN para:
- Barras: actividad por día (comidas/rutinas/salud)
- Dona: distribución de usuarios por rol
- Línea: tendencia de salud (fatiga/sueño/recuperación)
- Barras: fatiga actual por atleta

Cada gráfica se registra en `chartInstances{}` y se destruye antes de renderizar una nueva vista, evitando memory leaks.

---

## 7. API REST — Todos los Endpoints

### Autenticación

| Método | Endpoint | Auth | Body | Respuesta |
|--------|----------|------|------|-----------|
| POST | `/api/auth/login` | No | `{ email, password }` | `{ usuario, token }` |
| POST | `/api/auth/registro` | No | `{ nombre, email, password, peso, altura, ... }` | `{ usuario }` |

### Usuarios (solo Administrador)

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| GET | `/api/usuarios` | — (query: `q`, `rol`, `estado`) | `[{ id, nombre, email, rol, estado }]` |
| POST | `/api/usuarios` | `{ nombre, email, password, rol }` | `{ id, nombre, email, rol, estado }` |
| PUT | `/api/usuarios/:id` | `{ nombre, email, rol, estado }` | usuario actualizado |
| DELETE | `/api/usuarios/:id` | — | `{ mensaje }` |

### Panel del Futbolista (dueño del recurso, Admin o Nutricionista)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/panel/:userId/perfil` | Perfil deportivo |
| PUT | `/api/panel/:userId/perfil` | Actualizar perfil |
| GET | `/api/panel/:userId/dashboard` | Resumen: perfil + últimas comidas + rutinas + alertas |
| GET | `/api/panel/:userId/historial/comidas` | Historial paginado de comidas |
| POST | `/api/panel/:userId/comidas` | Registrar comida |
| DELETE | `/api/panel/:userId/comidas/:comidaId` | Eliminar comida |
| GET | `/api/panel/:userId/historial/rutinas` | Historial paginado de rutinas |
| POST | `/api/panel/:userId/rutinas` | Registrar rutina |
| DELETE | `/api/panel/:userId/rutinas/:rutinaId` | Eliminar rutina |
| GET | `/api/panel/:userId/historial/alertas` | Alertas del usuario |
| PUT | `/api/panel/:userId/alertas/:alertaId/leer` | Marcar alerta como leída |
| PUT | `/api/panel/:userId/alertas/leer-todas` | Marcar todas las alertas como leídas |

### Salud

| Método | Endpoint | Body | Descripción |
|--------|----------|------|-------------|
| GET | `/api/salud/:userId` | — | Historial de salud ordenado por fecha DESC |
| POST | `/api/salud/:userId` | `{ fatiga, sueno, recuperacion, notas, fecha }` | Registrar salud del día (solo 1 por día) |

Al registrar: si `fatiga ≥ 8` o `recuperacion ≤ 3` o `sueno ≤ 4` → se genera una alerta automática.

### Nutricionista (Nutricionista y Administrador)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/nutricionista/futbolistas` | Lista todos los futbolistas activos con resumen de salud |
| GET | `/api/nutricionista/futbolistas/:userId` | Detalle completo: salud, comidas, rutinas, alertas, notas |
| POST | `/api/nutricionista/futbolistas/:userId/notas` | Agregar nota clínica |
| POST | `/api/nutricionista/futbolistas/:userId/comidas` | Registrar comida al atleta |
| POST | `/api/nutricionista/futbolistas/:userId/rutinas` | Registrar rutina al atleta |

### Incidencias (Tickets de Soporte)

| Método | Endpoint | Permisos | Descripción |
|--------|----------|----------|-------------|
| GET | `/api/incidencias` | Todos | Futbolista: solo los suyos. Nutricionista: solo categorías de nutrición. Admin: todos |
| POST | `/api/incidencias` | Todos | Crear ticket (se enruta por categoría) |
| PUT | `/api/incidencias/:id/estado` | Admin o destinatario | Cambiar estado (abierta/en progreso/resuelta) |
| POST | `/api/incidencias/:id/comentarios` | Admin o destinatario | Agregar comentario/respuesta |

### Perfil Médico y Plan Personalizado

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/perfil-medico/catalogos` | Listas de condiciones, alergias y preferencias disponibles |
| GET | `/api/perfil-medico/:userId` | Obtener perfil médico + plan alimenticio + rutina |
| POST | `/api/perfil-medico/:userId` | Guardar condiciones/alergias/preferencia → genera plan y rutina |

### Asistente IA

| Método | Endpoint | Query param |
|--------|----------|-------------|
| GET | `/api/ia/:userId/consulta` | `?tipo=estado_semana` / `tendencia` / `resumen` / `entrenar_hoy` / `fatiga` / `sobrecarga` / `sueno` / `recuperacion` / `nutricion` / `calorias` / `riesgo` / `alertas` / `partido` / `plan` / `mejorar` |

### Reportes (solo Administrador)

| Método | Endpoint | Respuesta |
|--------|----------|-----------|
| GET | `/api/reportes` | Totales de usuarios, incidencias, comidas, rutinas, fatiga por atleta, actividad últimos 7 días |

---

## 8. Roles y Flujo Principal

### Flujo de un Futbolista

1. Se registra → rol `Futbolista` asignado automáticamente
2. Completa onboarding médico: selecciona condiciones, alergias, preferencia alimenticia
3. El sistema genera automáticamente: plan alimenticio personalizado de 7 días + rutina de entrenamiento adaptada a su posición
4. Registra su salud diaria (fatiga, sueño, recuperación)
5. Registra comidas y entrenamientos
6. Consulta al Asistente IA para análisis de su estado
7. Abre tickets de soporte dirigidos al nutricionista o al equipo técnico

### Flujo de un Nutricionista

1. Inicia sesión → ve dashboard con todos los atletas activos
2. Revisa estado de fatiga en tiempo real
3. Abre el perfil de un atleta → ve salud, comidas, rutinas, alertas
4. Agrega notas clínicas y puede registrar comidas/rutinas al atleta
5. Atiende tickets de soporte de nutrición/salud → responde y cambia estado

### Flujo del Administrador

1. Gestiona usuarios: crear, editar rol/estado, desactivar
2. Ve reportes globales: usuarios por rol, incidencias por estado, actividad de la plataforma
3. Atiende tickets técnicos (Bug, Soporte técnico, Mejora, Consulta)
4. Ve todos los tickets con indicador de a quién van dirigidos (🥗 Nutricionista / 🛠 Soporte)

---

## 9. Asistente IA — Cómo funciona

**Importante:** el asistente NO usa una API de inteligencia artificial externa (como OpenAI). Es una **IA local basada en reglas** (rule-based AI). Funciona así:

1. Cuando el futbolista hace una consulta, el backend recupera todos sus datos de la BD: salud, comidas, rutinas, alertas, perfil médico
2. El service `ia.service.js` analiza los datos con lógica condicional (promedios, tendencias, umbrales)
3. Devuelve una respuesta en texto con tipo de alerta (`success`, `warning`, `danger`)
4. Si el atleta tiene condiciones médicas registradas, la IA adapta sus recomendaciones

**Tipos de consulta disponibles (15 en total):** estado de la semana, tendencia, resumen, ¿puedo entrenar hoy?, fatiga, sobrecarga, sueño, recuperación, nutrición, calorías, riesgo de lesión, alertas, pre-partido, plan de la semana, cómo mejorar.

---

## 10. Plan Alimenticio y Rutina — Cómo se Genera

Cuando el futbolista guarda su perfil médico, el backend ejecuta dos generadores en `perfilMedico.service.js`:

**Plan alimenticio:**
- Tiene un pool de 12 desayunos, 12 almuerzos, 11 cenas y 8 meriendas
- Cada comida tiene etiquetas: alérgenos que NO contiene, preferencias incompatibles, condiciones donde es recomendable o a evitar
- El sistema filtra: excluye comidas con alérgenos del usuario, excluye las incompatibles con su preferencia, excluye las contraindicadas para sus condiciones
- Asigna una comida diferente por día en un ciclo de 7 días

**Rutina de entrenamiento:**
- Hay 6 plantillas base por posición (Portero, Defensa Central, Lateral, Mediocampista, Extremo, Delantero)
- Cada día tiene grupos de ejercicios asignados (fuerza, cardio, técnica, velocidad, recuperación)
- Cada ejercicio tiene una lista de condiciones médicas con las que es incompatible
- El sistema filtra los ejercicios contraindicados para las condiciones del atleta
- El resultado se guarda como JSONB en la tabla `perfiles_medicos`

---

## 11. Variables de Entorno

El archivo `.env` (nunca subido a Git) debe contener:

```env
PORT=4000
JWT_SECRET=tu-clave-secreta-muy-larga-y-segura
JWT_EXPIRES_IN=8h
DATABASE_URL=postgresql://usuario:password@host/basedatos?sslmode=require
CORS_ORIGIN=https://tu-dominio.com
```

El `.env.example` está incluido en el repositorio como plantilla. El `.env` real está en `.gitignore`.

---

## 12. Pruebas Unitarias

Se usa **Jest** como framework de pruebas. Los tests están en la carpeta `__tests__/`.

**Archivos de prueba:**
- `auth.test.js` — Login, registro, hasheo de contraseñas, cuentas inactivas, email duplicado, case-insensitive
- `usuarios.test.js` — CRUD de usuarios, validaciones
- `salud.test.js` — Registro de salud, validación de rangos, duplicado del día
- `historial.test.js` — Historial de comidas y rutinas
- `incidencias.test.js` — Creación y gestión de tickets
- `middleware.test.js` — Verificación de JWT, control de roles
- `perfilMedico.test.js` — Guardado de perfil médico
- `reportes.test.js` — Estadísticas del sistema
- `dashboard.test.js` — Resumen del dashboard

**Configuración de cobertura:** el umbral mínimo está fijado en **60% de líneas** en `package.json`:
```json
"coverageThreshold": { "global": { "lines": 60 } }
```

**Ejecutar pruebas:**
```bash
npm test                    # Corre todos los tests
npm run test:coverage       # Genera reporte de cobertura en /coverage/
```

Los tests mockean la base de datos con `jest.mock('../data/db')` para no necesitar conexión real.

---

## 13. Docker

El proyecto incluye `Dockerfile` y `docker-compose.yml` para contenerización.

**Dockerfile explicado:**
```dockerfile
FROM node:20-alpine          # Imagen base: Node 20 en Alpine Linux (liviana, ~50MB)
WORKDIR /app                 # Directorio de trabajo dentro del contenedor
COPY package*.json ./        # Copia solo manifests primero (cache de capas)
RUN npm ci --only=production # Instala solo dependencias de producción
COPY . .                     # Copia el código
EXPOSE 4000                  # Documenta el puerto expuesto
HEALTHCHECK ...              # Verifica que el servidor responda
CMD ["node", "server.js"]    # Comando de inicio
```

**Ejecutar con Docker:**
```bash
docker build -t vital-training .
docker run -p 4000:4000 \
  -e DATABASE_URL=... \
  -e JWT_SECRET=... \
  vital-training
```

---

## 14. Cómo Levantar el Proyecto Localmente

**Requisitos previos:** Node.js 18+, una base de datos PostgreSQL (local o Neon)

```bash
# 1. Clonar y entrar al directorio
git clone <url-del-repositorio>
cd vital-training-p4000

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env con DATABASE_URL y JWT_SECRET reales

# 4. Iniciar servidor
npm start
# El servidor crea las tablas automáticamente si no existen
# Abre http://localhost:4000

# Usuarios de prueba creados automáticamente:
# admin@vital.com / admin123  → Administrador
# maria@vital.com / nutri123  → Nutricionista
# carlos@vital.com / futbol123 → Futbolista
```

---

## 15. Preguntas Frecuentes del Profesor

**P: ¿Por qué PostgreSQL y no MySQL?**
R: Porque necesitábamos guardar estructuras de datos complejas como arrays de condiciones médicas y planes alimenticios de 7 días. PostgreSQL tiene el tipo JSONB que permite guardarlos con índices, lo cual sería una tabla adicional en MySQL. Además, PostgreSQL tiene mejor soporte para operadores de arrays como `ANY()` y `ALL()` que usamos para filtrar tickets por categoría.

**P: ¿Por qué el plan alimenticio y la rutina se guardan como JSONB en lugar de tablas?**
R: El plan completo de 7 días tiene una estructura anidada compleja (día → comidas → macronutrientes). Guardarlo como JSONB evita crear 4-5 tablas adicionales (plan, días del plan, comidas del plan, ejercicios del día) y simplifica las lecturas. La desventaja es que no se puede filtrar eficientemente por campos internos del plan, pero como siempre se lee el plan completo de un usuario, esto no es un problema.

**P: ¿Cómo funciona el JWT?**
R: El JWT tiene 3 partes separadas por puntos: Header (algoritmo), Payload (datos del usuario: id, nombre, email, rol) y Signature (firma con la clave secreta). El servidor verifica la firma en cada request. Si alguien modifica el payload, la firma no coincide y el token es rechazado. El token expira en 8 horas.

**P: ¿Qué pasa si alguien roba el JWT?**
R: En el sistema actual puede usarlo hasta que expire (8 horas). La mitigación es: tokens de corta duración, guardado en sessionStorage (no localStorage ni cookie, desaparece al cerrar el navegador) y HTTPS en producción.

**P: ¿Cómo evitan SQL Injection?**
R: Usando queries parametrizadas en todo el código. Nunca concatenamos strings del usuario directamente en el SQL. El driver `pg` separa el SQL de los parámetros y el motor de PostgreSQL los trata como datos, nunca como código.

**P: ¿Qué es bcrypt y cuántas rondas usan?**
R: bcrypt es un algoritmo de hashing diseñado específicamente para contraseñas. Tiene un factor de costo intencional: 10 rondas significa que el hash requiere 2^10 = 1024 iteraciones internas. Esto hace que probar millones de contraseñas sea muy lento para un atacante, aunque no para el usuario legítimo.

**P: ¿Cómo funciona el control de roles?**
R: El rol viene dentro del JWT. Al hacer login, el payload del token incluye `{ rol: "Nutricionista" }`. En cada endpoint protegido, el middleware extrae el rol del token (ya verificado) y lo compara con los roles permitidos. No se consulta la base de datos en cada request para verificar el rol.

**P: ¿Por qué el nutricionista y el admin no ven los mismos tickets?**
R: El destinatario del ticket no se guarda en la base de datos. Se calcula dinámicamente con la función `destinatario(categoria)` que devuelve 'Nutricionista' para las categorías Nutrición/Plan alimenticio/Salud/Alimentación y 'Administrador' para el resto. En el controlador, según el rol del usuario que hace la petición, se aplica el filtro correspondiente.

**P: ¿Qué es la IA del sistema?**
R: No es una IA de machine learning ni conecta a servicios externos como ChatGPT. Es un sistema de reglas basado en umbrales y promedios. Analiza los datos reales del atleta (fatiga promedio, tendencia de sueño, historial de rutinas) y genera recomendaciones en texto. La ventaja es que funciona offline, es gratuita y sus respuestas son predecibles y explicables.

**P: ¿Están las pruebas conectadas a la base de datos real?**
R: No. Las pruebas usan `jest.mock('../data/db')` para simular la base de datos. Esto significa que las pruebas son rápidas, no dependen de conexión a internet y no contaminan los datos reales. El trade-off es que no prueban la integración real con PostgreSQL.

**P: ¿Qué hace Helmet?**
R: Helmet configura automáticamente más de 15 headers HTTP de seguridad. Por ejemplo: `X-Content-Type-Options: nosniff` (evita que el browser interprete archivos como un tipo distinto), `X-Frame-Options: DENY` (evita que el sitio se cargue en un iframe, previene clickjacking), `Strict-Transport-Security` (fuerza HTTPS), entre otros.

**P: ¿Por qué el frontend es un solo archivo HTML?**
R: Es una decisión de simplicidad para el proyecto académico. Al ser un SPA con JavaScript vanilla, el servidor Express sirve el HTML estático y luego toda la navegación la maneja JS en el cliente sin recargar la página. No necesita un servidor de frontend separado (como el que necesitaría React). Todo el deployment es un solo proceso de Node.js.

---

## 16. Entidades y Reglas de Negocio Implementadas

1. **Un futbolista solo puede registrar una entrada de salud por día** — constraint `UNIQUE(user_id, fecha)` en la tabla `salud`.
2. **Las alertas se generan automáticamente** — cuando fatiga ≥ 8, recuperación ≤ 3 o sueño ≤ 4 al guardar salud.
3. **El plan alimenticio y la rutina se regeneran** cada vez que el futbolista actualiza su perfil médico.
4. **Los tickets se enrutan automáticamente** por categoría al rol correspondiente.
5. **Un futbolista no puede ver datos de otro futbolista** — middleware `requireOwnerOrRol` en todas las rutas con `:userId`.
6. **Las contraseñas deben tener mínimo 8 caracteres** — validado en frontend y backend.
7. **No se puede crear un usuario con email duplicado** — constraint `UNIQUE` en `email` y verificación en el service.
8. **Al eliminar un usuario, se eliminan todos sus datos** — `ON DELETE CASCADE` en todas las foreign keys.
9. **Las cuentas inactivas no pueden iniciar sesión** — verificación de `estado === 'Activo'` antes de generar el token.
10. **El login está limitado a 10 intentos en 15 minutos** — `express-rate-limit` en la ruta de login.