# 🗄️ Servidor — ¿para qué?

Es **el cerebro de la app**: recibe las peticiones de la interfaz, valida permisos, aplica las reglas de negocio y habla con la base de datos.

- `server.js` — punto de entrada (`npm start`)
- `middleware/` — `auth.js` (verifica JWT), `roles.js` (permisos por rol), `cors.js`
- `api/` — un módulo por funcionalidad, siempre con 3 capas:
  - `*.routes.js` → define la URL
  - `*.controller.js` → lee la petición y responde
  - `*.service.js` → lógica de negocio y consultas SQL

Para agregar una funcionalidad nueva: crea `api/<modulo>/` con esos 3 archivos y regístralo en `api/index.js`.
