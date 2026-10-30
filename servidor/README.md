# 🗄️ Servidor — ¿para qué?

Es **el cerebro de la app**: recibe las peticiones de la interfaz, valida permisos, aplica las reglas de negocio y habla con la base de datos.

Está organizado como un **monolito modular**: una sola aplicación, dividida en módulos independientes.

- `server.js` — punto de entrada (`npm start`)
- `compartido/` — lo que usan todos los módulos (middleware de JWT, roles, CORS, lista de deportes)
- `api/` — un módulo por funcionalidad; `api/index.js` los monta bajo `/api`

## Módulos y sus tablas

| Módulo | Tablas propias (solo él escribe) | Expone a otros módulos |
|---|---|---|
| `auth` | `restablecimientos` (también entrar con Google) | — |
| `usuarios` | `usuarios`, `fotos_perfil` | `buscarIdPorEmail`, `registrarAtleta`, `actualizarDeporte` |
| `panel` | `perfiles`, `comidas`, `rutinas`, `alertas`, `cumplimiento` | `crearAlerta`, `registrarComidaAsignada`, `registrarRutinaAsignada` |
| `salud` | `salud` | — |
| `perfilMedico` | `perfiles_medicos` | — |
| `nutricionista` | `notas_nutricionista` | — |
| `incidencias` | `incidencias` | — |
| `reportes` | — (solo lectura) | — |
| `ia` | `ia_mensajes` (chat con el asistente) | — |
| `rendimiento` | — (solo lectura) | — |
| `mensajes` | `mensajes` | — |
| `evaluaciones` | `evaluaciones` | — |
| `equipos` | `equipos`, `equipo_miembros` | `accesoAtleta` (middleware), `filtrarAtletas`, `puedenHablar`... — ver abajo |
| `series` | `series` | `records` (registro serie a serie, récords y sugerencia de carga) |
| `rangos` | `rangos` | — (Bronce … Radiante en fuerza y tests; guarda el más alto: nunca se baja) |
| `notificaciones` | `push_suscripciones`, `push_claves` | `enviar`, `avisoDeAlerta` (avisos al celular; nunca fallan) |
| `logros` | `logros` | — (insignias; un logro ganado no se pierde) |
| `reloj` | `sesiones_reloj` | — (sesiones del reloj o pulsómetro: zonas, TRIMP y esfuerzo; la sesión va a `rutinas`) |
| `alimentos` | `alimentos_codigos` | — (productos por código de barras: nuestra base y Open Food Facts) |
| `clasificacion` | `clasificacion_preferencias` | — (constancia y marcas entre atletas del equipo o del deporte) |
| `lesiones` | `lesiones`, `notas_clinicas` | `estadosDe`, `estadoDe` (apto / en recuperación / baja médica) |
| `avisos` | — (decide qué correo mandar y a quién) | `bienvenida`, `restablecerPassword`, `alertaSalud`, `alertaCarga` |

## Las 3 reglas

1. **Cada tabla tiene un dueño.** Solo el módulo dueño hace `INSERT`, `UPDATE` o `DELETE` en ella. Los demás pueden leerla con `SELECT`/`JOIN`, pero si necesitan escribir, llaman a una función del dueño.
2. **Cada módulo tiene un `index.js` público.** Desde otro módulo solo se importa `require('../<modulo>')`, nunca un archivo interno como `require('../panel/historial.service')`.
3. **Lo común va en `compartido/`.** Si algo lo usan varios módulos y no pertenece a ninguno, va ahí.

## Equipos: qué atletas ve cada profesional (módulo `equipos`)

- **Sin ningún equipo creado**, la app es un club único: cada nutricionista y médico ve a todos los atletas.
- **Con equipos**, un nutricionista o médico solo ve, abre y escribe a los atletas de sus equipos. Las rutas `/:userId` de un atleta usan el middleware `accesoAtleta`, y las listas pasan por `filtrarAtletas`. Los correos de alerta van solo a los médicos del atleta.
- El administrador ve siempre a todos. Crea los equipos y añade a los profesionales; los atletas se unen con el código del equipo (un atleta está en un solo equipo).

## Quién puede hablar con quién (módulo `mensajes`)

| De  A | Atleta | Nutricionista | Médico | Administración |
|---|---|---|---|---|
| **Atleta** | — | ✅ chat | ✅ chat | 🎫 solo por ticket |
| **Nutricionista** | ✅ | — | ✅ | ✅ (prioridad) |
| **Médico** | ✅ | ✅ | — | ✅ (prioridad) |
| **Administración** | — | ✅ | ✅ | — |

Las reglas viven en `api/mensajes/mensajes.permisos.js`. Los tickets de atletas llegan a la bandeja común de administración, no a un administrador concreto. En la pantalla de Soporte del admin, los mensajes de nutricionistas y médicos aparecen arriba, antes que los tickets.

## Agregar un módulo nuevo

1. Crea `api/<modulo>/` con `<modulo>.routes.js`, `<modulo>.controller.js` y `<modulo>.service.js`
2. Crea `api/<modulo>/index.js` exportando `{ router }` (y las funciones que otros módulos necesiten)
3. Regístralo en `api/index.js`
4. Añádelo a la tabla de arriba
