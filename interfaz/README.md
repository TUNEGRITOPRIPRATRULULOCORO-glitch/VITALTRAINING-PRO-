# 🖥️ Interfaz — ¿para qué?

Es **lo que ve y usa la persona**: pantallas de login, panel del atleta, nutricionista y administrador.

- `index.html` — la aplicación completa (SPA)
- `ayuda.html` — guía de uso
- `styles.css` — estilos
- `privacidad.html` — política de privacidad (pública, en `/privacidad`)
- `manifest.webmanifest`, `sw.js` y `offline.html` — app instalable en el celular (PWA): nombre e iconos, service worker y la página que se ve sin internet
- `js/` — lógica del navegador, un archivo por rol; llama al servidor con `fetch('/api/...')` y un token JWT

## Archivos de `js/` (en el orden en que se cargan)

| Archivo | Qué tiene |
|---|---|
| `comun.js` | Sesión, `apiFetch`, enrutador por rol, fotos de perfil, deportes, avisos, ventanas. Lo usan todos |
| `pwa.js` | App instalable: registra `sw.js` y ofrece "Instalar VitalTraining" (en iPhone explica los pasos) |
| `notificaciones.js` | Activar las notificaciones en el dispositivo (Web Push) y el recordatorio diario |
| `cuenta.js` | "Mi cuenta" (todos los roles): foto, cambiar contraseña, descargar mis datos y borrar la cuenta |
| `auth.js` | Portada pública, entrar, registro (también con Google), recuperar contraseña |
| `mensajes.js` | Chat entre roles y contadores de no leídos |
| `rendimiento.js` | Listo para entrenar, carga y cumplimiento (atleta, nutricionista y médico) |
| `evaluaciones.js` | Tests físicos (atleta y médico) |
| `equipos.js` | Equipos: gestión del admin, código para que el atleta se una y etiquetas de equipo en las listas |
| `lesiones.js` | Lesiones, estado médico y notas clínicas (el médico las registra; atleta y nutricionista las consultan) |
| `admin.js` | Panel del administrador |
| `nutricionista.js` | Panel del nutricionista |
| `medico.js` | Panel del médico |
| `entrenador.js` | Panel del entrenador: sus atletas, registrar tests (verificados) y verificar récords |
| `hoy.js` | Atleta: tarjeta "Hoy te toca…" del dashboard (salud, sesión y comidas del día) |
| `series.js` | Atleta: registro serie a serie en la rutina (sesión anterior, récord, sugerencia) y "Mis récords" |
| `rangos.js` | Atleta: rangos de Bronce a Radiante (fuerza y tests), qué falta para subir y celebración |
| `logros.js` | Atleta: logros (insignias con progreso) y su celebración |
| `reloj-archivos.js` | Lee los archivos .tcx/.gpx del reloj (también lo usan los tests) |
| `reloj.js` | Atleta: importar la sesión del reloj, pulso en vivo por Bluetooth y gráfica de pulso con zonas |
| `escaner.js` | Atleta: escáner de código de barras (cámara o número) para rellenar la comida |
| `clasificacion.js` | Atleta: clasificación de constancia y de marcas con su equipo o su deporte |
| `atleta.js` | Atleta: inicio, perfil, salud, historial, soporte |
| `atleta-plan.js` | Atleta: perfil médico, rutina, plan de comidas, asistente IA |
| `inicio.js` | Arranque: decide qué pantalla mostrar. Va el último |

Son scripts normales (sin módulos ni build): comparten las funciones globales, que es lo que usan los
`onclick="..."` del HTML. Por eso el orden importa: un archivo solo puede **ejecutar al cargarse** código
de los que van antes (llamar funciones de otros desde dentro de una función no tiene problema).
Una pantalla de un rol va en el archivo de ese rol; si la usan varios roles, en uno compartido.
- `img/` — capturas e imágenes

El servidor publica esta carpeta tal cual (sin build). No guardes aquí claves ni lógica sensible: todo lo que está aquí lo puede leer cualquiera.
