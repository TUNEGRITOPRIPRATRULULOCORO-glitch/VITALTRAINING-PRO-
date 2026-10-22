# 🗄️ Servidor — ¿para qué?

Es **el cerebro de la app**: recibe las peticiones de la interfaz, valida permisos, aplica las reglas de negocio y habla con la base de datos.

Está organizado como un **monolito modular**: una sola aplicación, dividida en módulos independientes.

- `server.js` — punto de entrada (`npm start`)
- `compartido/` — lo que usan todos los módulos (middleware de JWT, roles, CORS)
- `api/` — un módulo por funcionalidad; `api/index.js` los monta bajo `/api`

## Módulos y sus tablas

| Módulo | Tablas propias (solo él escribe) | Expone a otros módulos |
|---|---|---|
| `auth` | — | — |
| `usuarios` | `usuarios` | `buscarIdPorEmail`, `registrarAtleta`, `actualizarDeporte` |
| `panel` | `perfiles`, `comidas`, `rutinas`, `alertas`, `cumplimiento` | `crearAlerta`, `registrarComidaAsignada`, `registrarRutinaAsignada` |
| `salud` | `salud` | — |
| `perfilMedico` | `perfiles_medicos` | — |
| `nutricionista` | `notas_nutricionista` | — |
| `incidencias` | `incidencias` | — |
| `reportes` | — (solo lectura) | — |
| `ia` | — (solo lectura) | — |

## Las 3 reglas

1. **Cada tabla tiene un dueño.** Solo el módulo dueño hace `INSERT`, `UPDATE` o `DELETE` en ella. Los demás pueden leerla con `SELECT`/`JOIN`, pero si necesitan escribir, llaman a una función del dueño.
2. **Cada módulo tiene un `index.js` público.** Desde otro módulo solo se importa `require('../<modulo>')`, nunca un archivo interno como `require('../panel/historial.service')`.
3. **Lo común va en `compartido/`.** Si algo lo usan varios módulos y no pertenece a ninguno, va ahí.

## Agregar un módulo nuevo

1. Crea `api/<modulo>/` con `<modulo>.routes.js`, `<modulo>.controller.js` y `<modulo>.service.js`
2. Crea `api/<modulo>/index.js` exportando `{ router }` (y las funciones que otros módulos necesiten)
3. Regístralo en `api/index.js`
4. Añádelo a la tabla de arriba
