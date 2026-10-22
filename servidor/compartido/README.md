# Compartido

Código que usan varios módulos de `servidor/api/` y que no pertenece a ninguno.

- `middleware/auth.js` — verifica el token JWT
- `middleware/roles.js` — `requireRol()` y `requireOwnerOrRol()`
- `middleware/cors.js` — configuración de CORS

No pongas aquí lógica de negocio de un módulo concreto: eso va dentro del módulo.
