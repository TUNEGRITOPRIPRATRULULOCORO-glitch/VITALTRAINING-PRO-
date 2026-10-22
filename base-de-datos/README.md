# 💾 Base de datos — ¿para qué?

Es **donde se guarda la información**: usuarios, perfiles médicos, comidas, rutinas, salud, incidencias.

- `db.js` — conexión. Si existe `DATABASE_URL` en `.env` usa PostgreSQL real; si no, usa **pg-mem** (base en memoria, se borra al reiniciar — útil para desarrollo)
- `schema.sql` — definición de todas las tablas (`CREATE TABLE IF NOT EXISTS`)
- `setup.js` — al arrancar el servidor ejecuta `schema.sql` y crea los usuarios de prueba si la base está vacía

Para cambiar o añadir tablas edita `schema.sql`.
