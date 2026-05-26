# Vital Training — Arquitectura del Proyecto

## ¿Qué es este archivo?

Guía de referencia para el equipo. Explica cómo está organizado el código,
dónde está cada cosa y qué pasos seguir para implementar la base de datos y la IA.

---

## Estructura de carpetas

```
vital-training-p4000/
│
├── server.js                  Punto de entrada. Configura middlewares y monta /api.
├── database.json              Base de datos temporal en JSON (reemplazar con DB real).
├── package.json
├── .env.example               Plantilla de variables de entorno. Copiar como .env.
│
├── api/                       ← TODA la API está aquí, organizada por módulo.
│   ├── index.js               Monta todos los módulos bajo /api.
│   │
│   ├── auth/                  Login y registro
│   │   ├── auth.routes.js     POST /api/auth/login, /registro
│   │   ├── auth.controller.js
│   │   └── auth.service.js
│   │
│   ├── usuarios/              CRUD de usuarios (panel admin)
│   │   ├── usuarios.routes.js GET|POST|PUT|DELETE /api/usuarios
│   │   ├── usuarios.controller.js
│   │   └── usuarios.service.js
│   │
│   ├── incidencias/           Tickets de soporte
│   │   ├── incidencias.routes.js
│   │   ├── incidencias.controller.js
│   │   └── incidencias.service.js
│   │
│   ├── reportes/              Estadísticas del sistema
│   │   ├── reportes.routes.js GET /api/reportes
│   │   ├── reportes.controller.js
│   │   └── reportes.service.js
│   │
│   ├── panel/                 Panel del futbolista (perfil, dashboard, historial)
│   │   ├── panel.routes.js    /api/panel/:userId/...
│   │   ├── perfil.controller.js / perfil.service.js
│   │   ├── dashboard.controller.js / dashboard.service.js
│   │   └── historial.controller.js / historial.service.js
│   │
│   └── ia/                    Módulo de IA ← IMPLEMENTAR AQUÍ
│       ├── ia.routes.js       /api/ia/:userId/...
│       ├── ia.controller.js
│       └── ia.service.js      ← Leer este archivo para implementar la IA
│
├── config/
│   └── database.js            Configuración de BD. Aquí se conecta MongoDB/PostgreSQL.
│
├── data/
│   └── db.js                  Capa de acceso a datos. readDB() y writeDB().
│
├── middleware/
│   └── cors.js                Configuración de CORS.
│
├── docs/
│   └── ARCHITECTURE.md        Este archivo.
│
└── frontend/
    ├── index.html             HTML único (SPA con paneles ocultos por JS)
    ├── script.js              Toda la lógica del frontend
    └── styles.css             Estilos
```

> **Nota:** Las carpetas `routes/`, `controllers/` y `services/` en la raíz son redirecciones
> hacia `api/`. No editar esas carpetas — el código real está en `api/`.

---

## Flujo de una petición

Cuando el frontend hace `fetch('/api/algo')`:

```
Frontend (script.js)
    ↓ HTTP request
server.js             → app.use('/api', require('./api'))
    ↓
api/index.js          → enruta al módulo correspondiente
    ↓
api/modulo/modulo.routes.js     → define el endpoint y qué controller llama
    ↓
api/modulo/modulo.controller.js → valida el request, llama al service
    ↓
api/modulo/modulo.service.js    → contiene la lógica de negocio
    ↓
data/db.js            → lee/escribe en database.json (temporal)
    ↓ respuesta JSON
Frontend              → recibe y renderiza
```

---

## Cómo implementar la Base de Datos

### Paso 1 — Elegir tecnología

| Opción | Cuándo usar |
|--------|-------------|
| **MongoDB + Mongoose** | Recomendada. Datos flexibles, fácil de empezar. |
| **PostgreSQL** | Si prefieren SQL clásico. |

### Paso 2 — Instalar y configurar

```bash
npm install mongoose
```

Crear cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/atlas).
Copiar la URI de conexión y pegarla en un archivo `.env`:

```
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/vital-training
JWT_SECRET=clave_secreta_larga
IA_API_KEY=tu_clave_de_ia
PORT=4000
```

### Paso 3 — Activar conexión en `config/database.js`

Descomentar el bloque de conexión que ya está escrito en ese archivo.
Llamar `conectarDB()` en `server.js` antes de `app.listen()`.

### Paso 4 — Crear modelos (carpeta `models/`)

Crear un archivo por cada "tabla" de `database.json`:

```
models/
├── Usuario.js
├── Perfil.js
├── Comida.js
├── Rutina.js
├── Alerta.js
├── Incidencia.js
└── Salud.js       ← pendiente de implementar
```

### Paso 5 — Reemplazar data/db.js

Cada función en `api/*/**.service.js` llama a `readDB()` / `writeDB()`.
Cuando tengan MongoDB, solo hay que reemplazar esas llamadas por
queries de Mongoose. El resto del código no cambia.

---

## Cómo implementar la IA

### Archivo principal: `api/ia/ia.service.js`

Ese archivo tiene instrucciones completas. Resumen:

1. Instalar el SDK:
   ```bash
   npm install @anthropic-ai/sdk
   ```

2. Copiar `.env.example` como `.env` y agregar la API key:
   ```
   IA_API_KEY=sk-ant-...
   ```

3. En cada función de `api/ia/ia.service.js`, reemplazar el `throw new Error(...)` por el llamado real a la API.

4. `api/ia/ia.controller.js` y `api/ia/ia.routes.js` ya están listos. No hay que tocarlos.

### Endpoints disponibles (cuando esté implementado)

| Endpoint | Qué devuelve |
|----------|-------------|
| `GET /api/ia/:userId/nutricion` | Recomendaciones de alimentación |
| `GET /api/ia/:userId/sobrecarga` | Detección de sobrecarga deportiva |
| `GET /api/ia/:userId/lesiones` | Riesgo de lesión y prevención |
| `GET /api/ia/:userId/recuperacion` | Plan de recuperación |

---

## Estructura de datos (tablas)

### `usuarios`
```json
{
  "id": 1,
  "nombre": "Carlos Rodríguez",
  "email": "carlos@vitaltraining.com",
  "password": "...",
  "rol": "Futbolista | Nutricionista | Administrador",
  "estado": "Activo | Inactivo",
  "peso": 72, "altura": 178,
  "posicion": "Mediocampista",
  "frecuencia": "3-4 veces por semana",
  "condiciones": ["Diabetes"],
  "fechaNacimiento": "2002-03-15",
  "fechaRegistro": "22/5/2026"
}
```

### `perfiles`
```json
{ "userId": 1, "nombre": "Carlos", "edad": 24, "peso": 72, "altura": 178, "posicion": "Mediocampista", "updatedAt": "..." }
```

### `comidas`
```json
{ "id": 1, "userId": 1, "nombre": "Avena con frutas", "tipo": "desayuno", "calorias": 350, "fecha": "2026-05-01", "hora": "08:00", "createdAt": "..." }
```

### `rutinas`
```json
{ "id": 1, "userId": 1, "nombre": "Cardio + Técnica", "tipo": "entrenamiento", "duracionMinutos": 60, "intensidad": "media", "descripcion": "...", "fecha": "...", "createdAt": "..." }
```

### `alertas`
```json
{ "id": 1, "userId": 1, "tipo": "hidratacion", "mensaje": "Recuerda tomar agua", "leida": false, "fecha": "...", "createdAt": "..." }
```

### `salud` ← PENDIENTE DE IMPLEMENTAR EN EL FRONTEND
```json
{ "id": 1, "userId": 1, "fecha": "2026-05-01", "fatiga": 3, "sueno": 7, "recuperacion": 4, "notas": "Pierna cansada", "createdAt": "..." }
```
Los valores de `fatiga`, `sueno` y `recuperacion` van del 1 al 10.

### `incidencias`
```json
{ "id": 1, "titulo": "...", "usuario": "Carlos", "categoria": "Bug", "prioridad": "alta", "estado": "abierta", "fecha": "...", "descripcion": "...", "comentarios": [] }
```

---

## Variables de entorno (.env)

Crear este archivo en la raíz del proyecto. **No subir a GitHub.**

```
PORT=4000
MONGO_URI=mongodb+srv://...
JWT_SECRET=clave_secreta_muy_larga
IA_API_KEY=sk-ant-...
```

Agregar al `.gitignore`:
```
.env
node_modules/
```
