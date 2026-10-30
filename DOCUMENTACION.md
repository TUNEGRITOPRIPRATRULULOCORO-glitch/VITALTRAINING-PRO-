# VitalTraining — Documentación técnica

Cómo está construida la app, por qué se tomó cada decisión y cómo funciona cada parte por dentro. Para ejecutarla, ver el [README](README.md); para dónde vive en internet, [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

---

## 1. Qué es y qué problema resuelve

**VitalTraining** es una plataforma web para gestionar el entrenamiento, la alimentación y la salud de deportistas, con cinco roles: **Atleta**, **Entrenador**, **Nutricionista**, **Médico** y **Administrador**. Sirve para clubes (fútbol, baloncesto, tenis, béisbol, atletismo, natación, boxeo…) y también para quien entrena por su cuenta (gimnasio, running, "estar en forma").

**Problema:** en los clubes amateur y semiprofesionales el atleta, el nutricionista, el médico y la administración no comparten la información. Cada uno usa su hoja de cálculo, su chat o su app, y nadie ve el cuadro completo. Las apps del mercado que estudiamos (TrainingPeaks, Fitbod, Volt, MacroFactor, Peak, TrainHeroic, Strong, TrainUp) cubren entrenamiento **o** nutrición, pero ninguna junta a los tres profesionales ni tiene expediente médico.

---

## 2. Arquitectura

```
┌───────────────────────────────────────────────────────────┐
│ NAVEGADOR o app instalada (PWA)                            │
│ interfaz/: index.html + styles.css + js/ (un archivo/rol) │
└─────────────────────────────┬─────────────────────────────┘
                              │ HTTPS · JSON · Authorization: Bearer <token>
┌─────────────────────────────▼─────────────────────────────┐
│ SERVIDOR Node.js + Express (servidor/server.js)            │
│ Helmet → JSON con límite → CORS → archivos estáticos       │
│ /api → auth (JWT) → rol → acceso por equipo → módulo       │
└───────────┬───────────────────────┬───────────────────────┘
            │ pg (SSL verificado)    │ HTTPS
┌───────────▼───────────┐   ┌───────▼───────────────────────┐
│ PostgreSQL · Neon      │   │ Brevo (correos) · Google      │
│ 27 tablas · 14 índices │   │ (entrar con Google) · Claude  │
└───────────────────────┘   │ (opcional)                     │
                            └───────────────────────────────┘
```

### Monolito modular

Una sola aplicación (un proceso, un despliegue), dividida en **22 módulos** independientes dentro de `servidor/api/`. Se eligió frente a microservicios porque, para un equipo pequeño y un hosting gratuito, los microservicios añadirían red, despliegues y bases separadas sin beneficio real. A cambio, se mantienen las fronteras como si fueran servicios:

1. **Cada tabla tiene un dueño.** Solo su módulo hace `INSERT`, `UPDATE` o `DELETE`; los demás leen o llaman a una función del dueño.
2. **Cada módulo expone un `index.js` público.** Nadie importa archivos internos de otro módulo.
3. **Lo común va en `servidor/compartido/`** (middleware, fechas, deportes).

Cada módulo sigue el patrón **routes → controller → service**: las rutas declaran permisos, el controlador traduce HTTP y el servicio tiene la lógica y las consultas. Los cálculos puros (sin base de datos) van en archivos `*.calculos.js` o `*.catalogo.js`, fáciles de probar.

| Módulo | Tablas propias | Qué hace |
|---|---|---|
| `auth` | `restablecimientos` | Entrar, registrarse, entrar con Google, recuperar contraseña |
| `usuarios` | `usuarios`, `fotos_perfil` | Gestión de cuentas (admin) y fotos de perfil |
| `panel` | `perfiles`, `comidas`, `rutinas`, `alertas`, `cumplimiento` | Dashboard, perfil, historial, sesiones cumplidas |
| `salud` | `salud` | Registro diario de fatiga, sueño y recuperación, con alertas |
| `perfilMedico` | `perfiles_medicos` | Condiciones, alergias, dieta; genera rutina y plan de comidas |
| `rendimiento` | — (lectura) | Listo para entrenar, carga, cumplimiento y "Hoy te toca…" |
| `lesiones` | `lesiones`, `notas_clinicas` | Lesiones, estado apto / en recuperación / baja y notas clínicas |
| `equipos` | `equipos`, `equipo_miembros` | Equipos y qué atletas ve cada profesional |
| `series` | `series` | Registro serie a serie, récords y sugerencia de carga |
| `rangos` | `rangos` | Rangos de Bronce a Radiante en fuerza y tests |
| `clasificacion` | `clasificacion_preferencias` | Clasificaciones de constancia y de marcas (con anti-trampas) |
| `logros` | `logros` | Insignias por constancia, entrenamiento, progreso y resiliencia |
| `notificaciones` | `push_suscripciones`, `push_claves` | Avisos en el celular (Web Push) y recordatorio diario |
| `evaluaciones` | `evaluaciones` | Tests físicos periódicos por deporte |
| `nutricionista` | `notas_nutricionista` | Panel del nutricionista |
| `mensajes` | `mensajes` | Chat entre roles |
| `incidencias` | `incidencias` | Tickets de soporte |
| `ia` | `ia_mensajes` | Vita: el asistente (modelo propio + Claude opcional) |
| `reportes` | — (lectura) | Estadísticas del admin |
| `avisos` | — | Decide qué correo mandar y a quién |

---

## 3. Base de datos

### PostgreSQL, en tres versiones según dónde corre

| Dónde | Motor | Por qué |
|---|---|---|
| La web (Render) | **Neon**, PostgreSQL en la nube | Datos que sobreviven a reinicios y despliegues; plan gratis |
| Tu computador | **PGlite**, PostgreSQL en un archivo | Sin instalar nada; los datos se conservan en `base-de-datos/datos-locales/` |
| Los tests | **pg-mem**, PostgreSQL en memoria | Cada prueba empieza con una base limpia y real, sin tocar datos |

El mismo `schema.sql` sirve para los tres. Al arrancar, `base-de-datos/setup.js` crea lo que falte (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) y aplica migraciones de columnas nuevas, así que **desplegar nunca borra datos**.

**¿Por qué PostgreSQL y no MySQL o MongoDB?** Por las restricciones y la integridad (claves foráneas con `ON DELETE CASCADE`, `UNIQUE` compuestos), y por **JSONB** para guardar estructuras anidadas como el plan de comidas de 7 días o la rutina semanal, que siempre se leen completas.

### Tablas (27)

| Grupo | Tablas |
|---|---|
| Cuentas | `usuarios`, `fotos_perfil`, `restablecimientos` |
| Atleta | `perfiles`, `perfiles_medicos` (JSONB: condiciones, alergias, plan de comidas, rutina), `salud`, `comidas`, `rutinas`, `cumplimiento`, `alertas`, `sesiones_reloj` (pulso, zonas y curva de cada sesión del reloj) |
| Alimentos | `alimentos_codigos` (productos por código de barras, de Open Food Facts o escritos por el club) |
| Rendimiento | `evaluaciones`, `series` (ambas con marca de *verificado*), `rangos`, `logros`, `clasificacion_preferencias` |
| Notificaciones | `push_suscripciones`, `push_claves` |
| Médico y nutrición | `lesiones`, `notas_clinicas`, `notas_nutricionista` |
| Club | `equipos`, `equipo_miembros` |
| Comunicación | `mensajes`, `incidencias` (JSONB: comentarios), `ia_mensajes` |

Todas las tablas de un usuario tienen `user_id → usuarios(id) ON DELETE CASCADE`: al borrar una cuenta se borran sus datos.

### Índices

Casi todas las pantallas consultan "los datos de este atleta en estas fechas". Hay **14 índices** sobre `(user_id, fecha)` y similares (comidas, rutinas, series, evaluaciones, mensajes, lesiones…); `salud`, `cumplimiento`, `equipo_miembros` y `rangos` ya tienen el suyo por su `UNIQUE`. Sin ellos, con cientos de usuarios, cada consulta recorrería la tabla entera.

---

## 4. Seguridad

### Sesión: JWT, revisada contra la base

1. Al entrar, `bcrypt.compare()` verifica la contraseña y el servidor firma un **JWT** con `JWT_SECRET` (dura 8 h).
2. La interfaz lo guarda en `sessionStorage` (se borra al cerrar el navegador) y lo envía en `Authorization: Bearer`.
3. En cada petición, el middleware `auth.js` verifica la firma **y comprueba en la base que la cuenta sigue activa y su rol actual** (con 30 s de memoria para no consultar en cada petición). Así, si el admin desactiva una cuenta o cambia su rol, el token viejo deja de servir enseguida.

### Contraseñas
**bcrypt** con 10 rondas. Mínimo 8 caracteres, validado en el servidor. La contraseña nunca vuelve al cliente. La recuperación usa un enlace de un solo uso: en la base solo se guarda el hash del token.

### Permisos en tres capas
| Capa | Qué comprueba |
|---|---|
| `requireRol(...)` | El rol puede usar esa sección (por ejemplo, solo el admin gestiona usuarios) |
| `accesoAtleta(...)` (módulo equipos) | En rutas `/:userId`: es el propio atleta, el admin, o un profesional **que comparte equipo con ese atleta** |
| Reglas del servicio | Por ejemplo: solo el médico registra lesiones; las notas clínicas privadas solo las ven médicos; cada médico borra solo sus notas; solo el atleta apunta sus series |

### Otras medidas
| Medida | Qué protege |
|---|---|
| **Helmet con política de contenido (CSP)** | Solo se cargan scripts, estilos e imágenes de orígenes permitidos |
| **SRI** en Chart.js | Si el CDN sirviera un archivo alterado, el navegador no lo ejecuta |
| **Límites de intentos** | Login 10, registro 10, recuperar contraseña 5 por 15 min; chat con Vita 30 mensajes por 10 min |
| **Tamaño máximo de petición** | 50 KB (450 KB solo para subir la foto) |
| **Consultas parametrizadas** | Inyección SQL |
| **`escapeHtml()`** en toda la interfaz | Inyección de scripts (XSS) |
| **SSL con certificado verificado** hacia Neon | Que alguien se haga pasar por la base de datos |
| **Docker sin root** y solo las carpetas necesarias | Nada de `.env`, tests ni `.git` en la imagen |
| **Secretos solo en Render** | El código lleva los nombres de las variables, nunca sus valores |
| **Fotos de perfil solo con sesión** | Nadie las ve sin iniciar sesión |

---

## 5. Interfaz

- **SPA sin frameworks**: un `index.html` y un archivo JS por rol o función (`interfaz/js/`). Sin compilación: el servidor publica la carpeta tal cual. Ver [interfaz/README.md](interfaz/README.md).
- **App instalable (PWA)**: `manifest.webmanifest` (nombre, iconos, colores), `sw.js` (service worker) y `offline.html`. Se instala desde Chrome (Android y ordenador) o con "Añadir a pantalla de inicio" en Safari (iPhone). Las pantallas siempre se piden al servidor primero, así nadie se queda con una versión vieja; los datos de `/api` nunca se guardan en el celular; sin internet se ve un aviso amable.
- Modo oscuro, diseño adaptado a móvil, gráficas con Chart.js y música de fondo opcional.

---

## 6. Cómo funciona cada parte

### Plan de comidas
1. **Calorías**: gasto en reposo con la fórmula **Mifflin-St Jeor** (peso, altura, edad, sexo) por un factor según el tipo de día (descanso ×1,40, entreno ×1,70, víspera de partido ×1,60, partido ×1,85…).
2. **Macros**: carbohidratos por kg según el día (3,5 a 7 g/kg, guías ACSM 2016 y consenso UEFA), proteína 1,6-2,0 g/kg, grasa entre el 20 % y el 35 %.
3. **Platos**: catálogo de 83 platos, cada uno con sus ingredientes clave. Las **alergias y la dieta (vegana, vegetariana, pescetariana) son filtros estrictos**; las condiciones médicas solo quitan platos si quedan al menos 3 opciones. Si una alergia o condición no aparece en la lista, el atleta **la escribe** (por ejemplo "aguacate") y el plan descarta los platos que la nombran; lo escrito también lo ven su nutricionista y su médico. Lo marcado en cada paso del perfil médico se conserva al volver atrás.
4. **Porciones**: se reparte la energía del día (desayuno 25 %, almuerzo 30 %, cena 25 %, meriendas 10 % + 10 %) y se escala la porción del plato.

### Rutina
Plantillas por **deporte y posición**, basadas en evidencia (citada en `servidor/api/perfilMedico/rutinas.js`). Se quitan los ejercicios contraindicados por las condiciones médicas del atleta, y la semana se organiza alrededor de su **día de competición** (víspera suave, día siguiente de recuperación). Ese día se llama según el deporte: partido, partido o torneo, competencia, carrera o **sparring o pelea** en boxeo. En **boxeo el estilo cambia la rutina**: fajador (volumen y corta distancia), estilista (jab y juego de piernas), contragolpeador (reacción y defensa) o pegador (potencia); cada uno suma su trabajo específico a los días de técnica.

### Listo para entrenar, carga y cumplimiento
- **Listo para entrenar (0-100)**: `((11 − fatiga) + sueño + recuperación) / 30 × 100`, menos 10 si la carga está en riesgo. ≥75 listo, ≥50 bajar intensidad, <50 descanso.
- **Carga**: cada sesión suma *minutos × esfuerzo percibido (1-10)*. Se comparan los últimos 7 días con la media de las últimas 4 semanas: más de 1,5 veces es **riesgo alto de lesión** y avisa al médico por correo.
- **Cumplimiento**: calendario de 4 semanas con lo completado, parcial o no hecho. Los días de lesión no cuentan como fallados.

### Lesiones y estado médico
El médico registra zona, tipo, gravedad e indicaciones, y decide si el atleta está de **baja** o puede entrenar **adaptado**. El estado manda en todo lo demás: de baja, "listo para entrenar" muestra *Baja médica*, la rutina queda en pausa, los rangos se congelan, Vita no le dice que está listo y el **plan de comidas pasa a días de descanso con más proteína** (2,0 g/kg y sin déficit para perder peso); en recuperación, los días de entreno pasan a ser de recuperación. El atleta recibe un aviso al registrar, cambiar o dar el alta.

### Equipos
Mientras no hay equipos, la app es un club único: cada profesional ve a todos los atletas. Con equipos, **un nutricionista o médico solo ve, abre y escribe a los atletas de sus equipos**, y los correos de alerta van solo a sus médicos. El admin crea los equipos y añade a los profesionales; los atletas se unen con un **código de 6 caracteres**.

**Registro con equipo.** Lo primero que pregunta el registro es cómo se va a usar la app: *Entreno por mi cuenta* (atleta independiente), *Me uno a mi equipo* (pide el código **antes** que los datos y muestra el nombre del equipo) o *Voy a crear un equipo* (la cuenta es de **entrenador**, el equipo nace con su código y el entrenador lo ve en su panel para invitar a sus atletas). Todo se comprueba antes de crear la cuenta, así no quedan cuentas a medias. El atleta da desde el registro su **fecha de nacimiento** (válida, no futura y de **5 años o más**), su **sexo**, su **día de competición** y, en boxeo, su **estilo de pelea**.

### "Hoy te toca…"
Junta en una lista lo del día: registrar la salud, la sesión de la rutina y las 3 comidas del plan, con progreso ("2/5 hecho"), según el tipo de día (entreno, víspera, partido, descanso, baja). "La comí" apunta la comida del plan con un toque. Nunca regaña.

### Series, récords y sugerencia de carga
El atleta apunta peso y repeticiones de cada serie viendo la sesión anterior. **Récord** = mejor máximo estimado con la fórmula de **Epley** (`peso × (1 + reps/30)`, fiable hasta ~12 repeticiones). **Sugerencia por doble progresión**: si completó las repeticiones objetivo en todas las series, sube 2,5 kg (1 kg con pesos pequeños); si no, mismo peso y una repetición más. Lesionado o con el cuerpo pidiendo descanso, no sube.

### Tests físicos
Cada deporte tiene su batería de pruebas (salto, sprints, agilidad, Yo-Yo, Cooper, natación…). **Se recomienda repetirlos cada semana**, cuando el atleta o su entrenador lo vean preparado (pasadas 3 semanas, la app avisa de que ya toca); se pueden registrar en cualquier momento.

### Rangos
8 rangos (Bronce, Plata, Oro, Platino, Esmeralda, Rubí, Diamante y Radiante); los 7 primeros con 3 divisiones. En **fuerza** se compara el máximo estimado con el **peso corporal**; en **tests físicos**, la mejor marca. Las referencias son distintas para hombres y mujeres y orientativas. Se guarda el rango más alto alcanzado: **nunca se baja**. Cada rango tiene su emblema (de una medalla de bronce a una corona radiante con alas) y cada división le añade adornos; la app muestra el % que falta para el siguiente, el "Camino a Radiante" y una celebración al subir. El médico y el nutricionista ven los rangos y récords del atleta.

### Clasificación
Tablas entre los atletas de su **equipo** (o, sin equipo, de todo su **deporte**; fuera del equipo solo se ve el nombre y la inicial del apellido):
- **Constancia** (semana o 30 días): premia cumplir el plan, no el talento. Registrar la salud 10 puntos al día; sesión del plan completa 30 (a medias o apuntada a mano 15; una por día); cada comida apuntada 5 (hasta 4 al día).
- **Marcas**: tests de su deporte y levantamientos, ordenados con la escala de los rangos, que ya tiene en cuenta el sexo y el peso corporal. Por eso solo compite quien indicó su sexo (y su peso, en fuerza); si le falta, la app se lo dice.

Nunca se muestran datos de salud ni lesiones, y cada atleta puede elegir no aparecer.

### Entrenador y marcas verificadas (anti-trampas)
El **entrenador** ve a los atletas de sus equipos, **registra sus tests físicos** y **verifica los récords de fuerza** que vio. Lo que registra o verifica un profesional queda marcado como **verificado**.
- En un equipo, el atleta **no registra sus propios tests** (los mide el entrenador) ni puede verificar sus series; tampoco borrar una marca verificada.
- En la clasificación del **equipo** solo cuentan las marcas verificadas.
- En la de **todo el deporte** (atletas sin equipo) entran también las propias, salvo las sospechosas sin verificar: de nivel Diamante o más, o una mejora de golpe de más de un 15 % en un test (en 60 días) o un 25 % en fuerza (en 30 días). Al atleta se le explica por qué su marca quedó fuera.

### Logros
30 insignias en 5 grupos (primeros pasos, constancia, entrenamiento, progreso y resiliencia): rachas de 3 a 30 días, sesiones, comidas, series, récords, tests en meses distintos, marca verificada, rangos de Oro a Radiante, semana completa del plan, sesiones con el reloj y volver de una lesión. Muestran el progreso de las que faltan, se celebran al conseguirse y **un logro ganado no se pierde**.

### Notificaciones en el celular
Con **Web Push**: el atleta (o cualquier rol) las activa en Mi cuenta y le llegan los mensajes nuevos, los avisos de su médico, las alertas de salud y de carga, y —si lo deja activado— un **recordatorio cada mañana** ("¿Cómo amaneciste?") cuando aún no registró su salud. Ese recordatorio lo dispara una tarea programada de GitHub Actions (7:00 de Colombia) con el secreto `CRON_SECRET`. **Los lunes**, además, avisa de los **tests de la semana**: al atleta sin equipo cuyo último test fue hace 7 días o más ("¿Te sientes preparado?") y a cada entrenador con cuántos atletas de su equipo les toca. El servidor genera sus claves de firma (VAPID) la primera vez. En iPhone funcionan con la app instalada. La app **las ofrece sola**: al terminar el perfil médico y unos segundos después de entrar, con un aviso "¿Te avisamos al celular?" (si se responde "Ahora no", no insiste en 14 días).

### Reloj y pulsómetro
Dos formas de guardar una sesión con pulso, desde **Mi reloj** (en el menú del atleta, con la lista de sus sesiones y el reparto de zonas):
- **Importar el archivo del reloj** (.tcx o .gpx): Garmin, Polar, Coros, Suunto, Amazfit, Strava y Apple Watch (con apps como HealthFit) exportan en esos formatos. El navegador lee el archivo (`interfaz/js/reloj-archivos.js`) y manda al servidor el resumen y la curva de pulso cada 5 s; si la misma sesión se importa dos veces, se rechaza.
- **Pulso en vivo** por **Bluetooth** (Chrome en Android o computador): bandas de pecho o relojes que *transmiten la frecuencia cardiaca*. Muestra el pulso, la zona y el tiempo, y al terminar guarda la sesión.

El servidor calcula la **FC máxima** (Tanaka: 208 − 0,7 × edad, o la más alta vista en la sesión), los **minutos en cada zona** (Z1 50-60 % … Z5 90 % o más), la carga **TRIMP** y un **esfuerzo estimado** (zona media × 2, de 1 a 10). La sesión entra en `rutinas` con ese esfuerzo, así que cuenta en la **carga aguda/crónica**, la alerta de carga alta, la clasificación y los logros. Al abrirla se ve la gráfica del pulso y el tiempo en cada zona. Los archivos `.fit` aún no se leen (se exporta TCX o GPX).

### Escáner de código de barras
En **Historial → Comidas**, "📷 Escanear código de barras" abre la cámara: usa el lector del navegador (BarcodeDetector, Chrome en Android) o, si no existe (iPhone), **ZXing**, que se descarga solo la primera vez desde jsDelivr con su huella SRI. También se puede escribir el número. El servidor valida el dígito de control y busca el producto primero en `alimentos_codigos` y luego en **Open Food Facts** (base abierta y gratuita; se guarda y se refresca al mes). El atleta indica cuántos gramos comió y se rellenan las calorías y la proteína de la comida. Si el producto no existe en ninguna base, se escriben una vez los datos de la etiqueta y **quedan para todo el club** (solo los corrige quien los escribió, un nutricionista o el admin).

### Mi cuenta
Desde el avatar, cualquier rol puede cambiar su contraseña (pide la actual), **descargar todos sus datos** en un **PDF** para leerlos o imprimirlos (portada, ficha y una tabla por sección), o en JSON para llevarlos a otra app; nunca incluye contraseñas ni notas clínicas privadas y **borrar su cuenta** con todos sus datos (pide la contraseña y escribir BORRAR; un administrador no puede borrarse a sí mismo). Son los derechos de acceso y supresión de la ley de datos personales.

### Vita, el asistente
- **Sin coste**: un **modelo de machine learning propio** (TF-IDF por trozos de letras + regresión logística, entrenado con scikit-learn sobre 782 frases) clasifica cada mensaje en 17 intenciones con un **81 % de precisión**. Con confianza ≥ 0,35 responde con los datos reales del atleta; si duda, pregunta. El servidor no necesita Python: el modelo se exporta a JSON y Node.js repite las cuentas (un test comprueba que da lo mismo). Detalles en [ml/README.md](ml/README.md).
- **Con `ANTHROPIC_API_KEY`**: conversa con Claude, que recibe el contexto del atleta (rutina, comidas, salud, lesiones). Si Claude falla, responde el modo básico.

### Correos (Brevo)
Bienvenida, recuperar contraseña, alertas de salud y de carga al médico. Nunca rompen la acción que los provoca: si el correo falla, la app sigue.

---

## 7. API REST

Todas las rutas, salvo `/api/auth/*` y `/api/estado`, piden `Authorization: Bearer <token>`. En las rutas `/:userId` entra el propio atleta y, según la ruta, el admin y los profesionales de su equipo.

| Módulo | Rutas principales |
|---|---|
| Auth | `POST /api/auth/login` · `/google` · `/registro` (modo `solo`, `unirse` con `codigoEquipo` o `crear` con `equipoNombre`) · `/olvide` · `/restablecer` · `GET /config` · `GET /equipo/:codigo` |
| Cuenta y fotos | `GET /api/cuenta/yo` · `PUT/DELETE /api/cuenta/foto` · `PUT /api/cuenta/password` · `GET /api/cuenta/datos` · `DELETE /api/cuenta` · `GET /api/fotos/:userId` |
| Logros | `GET /api/logros/:userId` |
| Reloj | `POST/GET /api/reloj/:userId/sesiones` · `GET /sesiones/:id` (con la curva de pulso) |
| Alimentos | `GET /api/alimentos/codigo/:codigo` · `POST` (producto escrito desde la etiqueta) |
| Notificaciones | `GET /api/notificaciones/clave` · `GET /estado` · `POST/DELETE /suscribir` · `POST /prueba` · `POST /recordatorios` (sin sesión, con `X-Cron-Secreto`) |
| Clasificación (atletas) | `GET /api/clasificacion/opciones` · `GET /constancia?ambito=&periodo=` · `GET /marcas?ambito=&clave=` · `PUT /visible` |
| Usuarios (admin) | `GET/POST /api/usuarios` · `PUT/DELETE /api/usuarios/:id` · `DELETE /:id/foto` |
| Panel | `GET/PUT /api/panel/:userId/perfil` · `GET /dashboard` · historial de comidas, rutinas y alertas · `POST/DELETE` comidas y rutinas · `GET/POST /cumplimiento` |
| Salud | `GET/POST /api/salud/:userId` |
| Perfil médico | `GET /api/perfil-medico/catalogos` · `GET /atletas` (médico) · `GET/POST /:userId` |
| Rendimiento | `GET /api/rendimiento/:userId` · `GET /:userId/hoy` · `GET /equipo` (profesionales) |
| Lesiones | `GET /api/lesiones/:userId` · `POST` lesión (médico) · `PUT /:id` · `POST /:id/alta` · `DELETE /:id` · `POST/DELETE /notas` |
| Equipos | `GET /api/equipos/mios` · `POST /unirse` · admin: `GET/POST /` · `PUT/DELETE /:id` · `POST /:id/codigo` · `POST/DELETE /:id/miembros` |
| Series | `GET /api/series/:userId/ejercicio?nombre=` · `GET /hoy` · `GET /records` · `POST` (atleta) · `DELETE /:id` |
| Rangos | `GET /api/rangos/:userId` |
| Tests físicos | `GET/POST /api/evaluaciones/:userId` · `DELETE /:id` |
| Nutricionista | `GET /api/nutricionista/futbolistas` · `GET /:userId` · `POST` notas, comidas y rutinas |
| Mensajes | `GET /api/mensajes/contactos` · `GET /no-leidos` · `GET/POST /:otroId` |
| Soporte | `GET/POST /api/incidencias` · `PUT /:id/estado` · `POST /:id/comentarios` |
| Vita | `GET/POST/DELETE /api/ia/:userId/chat` · `GET /consulta` |
| Reportes (admin) | `GET /api/reportes` |
| Estado | `GET /api/estado` (lo usa el hosting para saber si la app está viva) |

---

## 8. Pruebas y calidad

- **482 pruebas con Jest**, cobertura de ~94 % de líneas en servicios y cálculos.
- **Unitarias** para los cálculos puros (calorías, carga, rangos, series, "Hoy te toca"…).
- **De integración** con **pg-mem**: los servicios corren contra una base PostgreSQL en memoria con el `schema.sql` real, sin simular consultas. Las rutas críticas (permisos por rol y por equipo) se prueban también por HTTP.
- **GitHub Actions** pasa los tests, construye la imagen de Docker y la arranca en cada subida.
- **SonarQube Cloud** analiza fallos, seguridad y mantenibilidad.

---

## 9. Despliegue

Render construye la imagen con el `Dockerfile` desde la rama `main` (**Manual Deploy**) y la conecta a Neon con `DATABASE_URL`. Paso a paso en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md); mapa y guion para presentar en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Las variables de entorno están en el [README](README.md#variables-de-entorno).

**Club de demostración** (`scripts/club-demo.js`): un equipo de fútbol con entrenador, nutricionista, médico y 5 atletas con 4 semanas de historia (racha, récords verificados, sesiones del reloj, comidas escaneadas, un lesionado, uno con carga alta y una que volvió de lesión). En local: `npm run club-demo` (y `-- --borrar` para quitarlo). En Render se crea al arrancar si existe `CLUB_DEMO_PASSWORD`, y se vuelve a crear si sus datos tienen más de un día, para que la racha y "Hoy te toca" se vean al día. Sus correos usan el dominio reservado `.example`: la app nunca les envía correos.

---

## 10. Reglas del negocio

1. Un atleta registra **una entrada de salud por día** (`UNIQUE(user_id, fecha)`); fatiga ≥ 8, recuperación ≤ 3 o sueño ≤ 4 generan una alerta y avisan al médico por correo.
2. La rutina y el plan de comidas **se recalculan solos** cuando cambian el perfil, el peso, la posición, el deporte o el día de partido.
3. **Las alergias y la dieta nunca se saltan**: si no queda un plato seguro, la comida queda "sin opción segura" en vez de recomendar algo peligroso.
4. **Un atleta no ve datos de otro**, y un profesional solo ve a los atletas de sus equipos.
5. **Solo el médico** registra lesiones y da el alta. Las notas clínicas no las ve el nutricionista; las privadas, tampoco el atleta.
6. **De baja médica** no se entrena: rutina en pausa, rangos congelados y sugerencias sin subir carga.
7. **Nunca se baja de rango** y los días lesionado no cuentan como sesiones falladas: la app no castiga.
8. Un atleta está en **un solo equipo**; a los profesionales los añade solo el admin.
9. Los tickets de nutrición y salud van al nutricionista; el resto, a la bandeja común de administración.
10. **Al borrar un usuario se borran todos sus datos** (`ON DELETE CASCADE`), y las cuentas inactivas no pueden entrar.

---

## 11. Preguntas frecuentes

**¿Por qué un monolito modular y no microservicios?**
Para un equipo pequeño y un hosting gratuito, los microservicios añadirían red, varios despliegues y bases separadas. El monolito modular da un solo despliegue y mantiene fronteras claras: cada módulo es dueño de sus tablas y solo se habla con él por su `index.js`. Si un módulo creciera mucho, se podría sacar como servicio sin reescribir el resto.

**¿Por qué el plan de comidas y la rutina se guardan como JSONB?**
Son estructuras anidadas (día → comidas → macros; día → ejercicios) que siempre se leen completas. En tablas serían 4 o 5 tablas más y lecturas con muchos JOIN. La desventaja es que no se puede buscar dentro de ellas eficientemente, cosa que la app no necesita.

**¿Cómo funciona el JWT y qué pasa si lo roban?**
Tiene tres partes: cabecera, datos (id, rol) y firma con la clave secreta. Si alguien cambia los datos, la firma no coincide. Si lo roban, sirve como máximo 8 horas. Como el servidor revisa en la base que la cuenta siga activa, el admin puede cortarlo desactivando la cuenta. Además se guarda en `sessionStorage` y todo va por HTTPS.

**¿Cómo se controla quién ve qué?**
En tres capas: el rol (`requireRol`), el acceso al atleta según el equipo (`accesoAtleta`) y las reglas de cada servicio. El rol se vuelve a comprobar contra la base, no solo se lee del token.

**¿Cómo evitan la inyección SQL y el XSS?**
SQL: consultas parametrizadas en todo el código; nunca se concatena texto del usuario en una consulta. XSS: todo lo que viene del usuario pasa por `escapeHtml()` antes de pintarse, y la política de contenido (CSP) bloquea scripts de otros orígenes.

**¿Vita es inteligencia artificial de verdad?**
Sí, en dos niveles. El modo gratuito usa un **modelo de machine learning entrenado por nosotros** (clasificación de texto supervisada: TF-IDF + regresión logística, 81 % de precisión en frases que no vio al entrenar), y responde con los cálculos de la app sobre los datos reales del atleta. Con una clave de pago conversa con Claude. Cómo se entrenó y evaluó está en [ml/README.md](ml/README.md).

**¿Las pruebas usan la base de datos real?**
Usan **PostgreSQL en memoria (pg-mem)** con el mismo `schema.sql`: prueban consultas reales sin tocar los datos de nadie y sin internet. Solo algunas pruebas antiguas simulan la base para casos concretos.

**¿Las fórmulas tienen respaldo?**
Sí: Mifflin-St Jeor para el gasto en reposo, ACSM 2016 y UEFA para los macros, relación de carga aguda/crónica para el riesgo de lesión, Epley para el máximo estimado y doble progresión para subir peso. Las referencias de los rangos son orientativas y la app lo dice.

**¿Qué hace Helmet?**
Configura cabeceras de seguridad: la política de contenido (qué scripts e imágenes puede cargar la página), que no se pueda meter la app en un iframe ajeno, que el navegador no adivine tipos de archivo y que se use HTTPS.

**¿Por qué una SPA sin React?**
Es una app de un proceso: el mismo servidor publica la interfaz y la API, sin compilación ni servidor de frontend aparte. Los archivos están separados por rol para que el código siga ordenado.

---

## 12. Límites conocidos

- **Render gratis se duerme** a los 15 minutos sin visitas; la primera visita tarda cerca de un minuto.
- **Neon gratis** solo permite volver atrás unas horas: no hay copias de seguridad propias.
- **Reloj:** no hay conexión automática con Garmin, Apple Salud o Google Health (piden apps nativas o convenios); se importa el archivo o se usa el pulsómetro Bluetooth, que no funciona en iPhone.
- Las **referencias de los rangos** son orientativas y no se ajustan por edad.
