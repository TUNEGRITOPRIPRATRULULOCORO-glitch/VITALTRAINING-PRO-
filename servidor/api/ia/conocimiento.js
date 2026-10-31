/**
 * Lo que Vita sabe sin Claude (funciones puras):
 * - Técnica de cada deporte: cómo lanzar más duro, pegar más fuerte, saltar más, nadar mejor…
 * - Cómo usar la app: escanear, conectar el reloj, unirse a un equipo, cambiar el día de competencia…
 *
 * Se mira antes que el clasificador de intenciones (clasificador.js): estas preguntas son muy
 * concretas y aquí tienen una respuesta mejor que "no te entendí".
 */

const normalizar = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Errores de escritura frecuentes en el celular ("lanar" por "lanzar")
const TYPOS = [[/\blan(?:s|)ar\b/g, 'lanzar'], [/\blan(?:s|)o\b/g, 'lanzo'], [/\bpatiar\b/g, 'patear']];
const limpiar = t => TYPOS.reduce((s, [re, bien]) => s.replace(re, bien), normalizar(t));

// ── Técnica por deporte ──────────────────────────────────────────────────────

/** Palabras que dicen de qué deporte se habla (si no, se usa el deporte del atleta). */
const PALABRAS_DEPORTE = [
  ['Béisbol',    /\b(beisbol|receptor|catcher|pitcher|lanzador|batear|bateo|jonron|jardinero)\b/],
  ['Boxeo',      /\b(boxeo|boxear|boxeador|sparring|jab|uppercut|asaltos?)\b/],
  ['Baloncesto', /\b(baloncesto|basket|basquet|canasta|encestar|clavar|tiro libre|triple|rebote)\b/],
  ['Tenis',      /\b(tenis|raqueta|saque|revés|reves|volea)\b/],
  ['Natación',   /\b(natacion|nadar|piscina|crol|brazada|viraje)\b/],
  ['Running',    /\b(running|maraton|media maraton|5 ?k|10 ?k|trotar|correr mas tiempo)\b/],
  ['Atletismo',  /\b(atletismo|100 ?m|200 ?m|400 ?m|vallas|salto largo|salto alto|jabalina|tacos de salida)\b/],
  ['Gimnasio',   /\b(gimnasio|gym|pesas|sentadilla|press de banca|peso muerto|hipertrofia)\b/],
  ['Fútbol',     /\b(futbol|balon|portero|arquero|cabecear|regatear|gambeta|chutar|patear)\b/],
];

const CUIDADO = '\n\nSi algo duele (no es cansancio, es dolor), para y coméntalo con tu médico desde Mensajes.';

/** Consejos de técnica: deporte + qué quiere mejorar (+ un detalle opcional, como la posición). */
const TECNICA = [
  { deporte: 'Béisbol', claves: /(lanz|tirar (la pelota|a segunda|a las bases|mas)|brazo|a segunda|pop time)/, amplias: /(mas duro|mas fuerte|mas rapido)/, detalle: /(receptor|catcher)/,
    respuesta: `⚾ Para un receptor, lanzar más duro (y más rápido a segunda) depende más de la técnica que del brazo:
1. Pies primero: paso corto y rápido con el pie de atrás hacia segunda; hombros alineados con el objetivo.
2. Transferencia rápida del guante a la mano, buscando el agarre de cuatro costuras.
3. La fuerza nace en las piernas y la cadera: empuja con la pierna de atrás y rota la cadera antes que el brazo.
4. Brazo corto y por encima del hombro (no lo bajes de lado), y termina el movimiento hacia el objetivo.

Para entrenarlo: lanzamientos largos (long toss) progresivos 2-3 veces por semana, banda elástica para el manguito rotador (rotación interna y externa), lanzamientos rotacionales de balón medicinal y practicar tu "pop time" con cronómetro (en amateur, 2,0-2,2 s es muy bueno). Calienta siempre el brazo y deja días de descanso de lanzamientos.` + CUIDADO },
  { deporte: 'Béisbol', claves: /(lanz|tirar (la pelota|mas)|brazo|pitche)/, amplias: /(mas duro|mas fuerte)/,
    respuesta: `⚾ Para lanzar más duro, la velocidad sale de toda la cadena, no solo del brazo:
1. Zancada larga y firme hacia el home, con la cadera abriendo antes que los hombros.
2. Piernas y core fuertes: la pierna de atrás empuja y el tronco rota.
3. Brazo relajado que "látigo": suelta la pelota por delante, no al lado de la cabeza.
4. Termina el movimiento con el brazo cruzando el cuerpo (protege el hombro).

Trabajo semanal: long toss progresivo, banda elástica para el manguito rotador, balón medicinal rotacional y fuerza de piernas (sentadilla, zancadas). Respeta los conteos de lanzamientos y los días de descanso.` + CUIDADO },
  { deporte: 'Béisbol', claves: /(batea|bateo|swing|el bate)/,
    respuesta: `⚾ Para batear con más potencia:
1. Postura atlética, rodillas flexionadas y peso en la pierna de atrás al cargar.
2. La cadera rota primero y arrastra los hombros y las manos: el bate llega "tarde" y rápido.
3. Manos dentro de la pelota (camino corto) y extensión completa después del contacto.
4. Ojos en la pelota hasta el contacto.

Para entrenarlo: tee y soft toss con pocas repeticiones de calidad, lanzamientos rotacionales de balón medicinal y fuerza de piernas y core.` },
  { deporte: 'Boxeo', claves: /(peg(ar|o|ue)|golpe|pegada|nocaut)/, amplias: /(mas duro|mas fuerte)/,
    respuesta: `🥊 La potencia del golpe viene del suelo, no del brazo:
1. Empuja con el pie (el de atrás en el directo) y rota la cadera y el hombro juntos.
2. Brazo relajado hasta el impacto; cierra el puño justo al golpear y vuelve rápido a la guardia.
3. Golpea "a través" del objetivo, no a la superficie.
4. Exhala con fuerza en cada golpe.

Entrénalo con golpes de potencia en el saco pesado (uno a uno, con intención), lanzamientos rotacionales de balón medicinal y saltos. Tu rutina de la app ya incluye trabajo según tu estilo de pelea.` + CUIDADO },
  { deporte: 'Boxeo', claves: /(resistencia|aguantar (los asaltos|la pelea|el combate)|asaltos)/,
    respuesta: `🥊 Para aguantar todos los asaltos, entrena con la misma estructura: 3 min de trabajo y 1 min de pausa.
- Comba y saco por asaltos, subiendo uno por semana.
- Intervalos de 30 s fuerte / 30 s suave.
- Respira por la nariz en la guardia y exhala en cada golpe: aguantar la respiración agota.
- Relaja los hombros entre golpes: la tensión gasta energía.` },
  { deporte: 'Boxeo', claves: /(defensa|esquiv|bloque|jab|guardia)/,
    respuesta: `🥊 Para mejorar la defensa y el jab:
1. Guardia: mentón abajo, manos a la altura de las mejillas, codos cerrados.
2. Jab rápido y que vuelva por el mismo camino; úsalo para medir la distancia.
3. Esquivas cortas (lo justo para que no te toque) y responde enseguida.
4. Practica con la cuerda tensa y con un compañero, lento y técnico.` },
  { deporte: 'Baloncesto', claves: /(saltar mas|salto|clavar|vertical|rebote)/,
    respuesta: `🏀 Para saltar más:
1. Fuerza de piernas 2 veces por semana: sentadilla, zancadas y peso muerto rumano.
2. Pliometría con descanso completo: saltos al cajón, saltos con contramovimiento y saltos en profundidad (pocos y de calidad, 20-40 contactos por sesión).
3. Técnica: brazos que empujan hacia arriba y últimos dos pasos rápidos y largos antes del salto.
4. Mídelo cada semana con el test de salto en Tests físicos.` + CUIDADO },
  { deporte: 'Baloncesto', claves: /(tiro|tirar|encestar|lanz|triple|punteria)/,
    respuesta: `🏀 Para tirar mejor:
1. Pies a la anchura de los hombros, apuntando al aro.
2. Codo bajo el balón, alineado con el aro.
3. El impulso sale de las piernas: sube en un solo movimiento.
4. Termina con la muñeca relajada hacia abajo ("mano en la galleta") y mantén la posición.

Practica cerca del aro y aléjate poco a poco; mejor 50 tiros bien hechos que 200 cansado.` },
  { deporte: 'Fútbol', claves: /(tiro|disparo|chut|pate[ao]|pegarle al balon|golpear el balon)/, amplias: /(mas duro|mas fuerte)/,
    respuesta: `⚽ Para patear con más potencia:
1. Pie de apoyo al lado del balón, apuntando al objetivo.
2. Golpea con el empeine (los cordones) y el tobillo firme, con la punta hacia abajo.
3. Cuerpo ligeramente encima del balón para que no se eleve.
4. Sigue el movimiento con la pierna después del golpe.

Fuerza de glúteos, cuádriceps y core (sentadilla, zancadas, plancha) y practicar con los dos perfiles.` },
  { deporte: 'Fútbol', claves: /(mas rapido|velocidad|sprint|acelera|correr mas)/,
    respuesta: `⚽ Para ser más rápido:
1. Sprints cortos de 10-30 m al máximo, con descanso completo (1-2 min): la velocidad se entrena fresco.
2. Arrancadas desde distintas posiciones (de espaldas, de lado, tras un giro).
3. Fuerza de piernas y saltos 2 veces por semana.
4. Técnica: brazos que acompañan, inclinación hacia delante en los primeros pasos.

Mídelo con el sprint de 10 m en Tests físicos y mira cómo sube tu rango.` },
  { deporte: 'Fútbol', claves: /(resistencia|aguantar el partido|90 minutos)/,
    respuesta: `⚽ Para aguantar el partido entero:
1. Intervalos tipo 4 × 4 min fuerte con 3 min suaves, 1-2 veces por semana.
2. Juegos reducidos (3 contra 3, 4 contra 4): mejoran la resistencia y la técnica a la vez.
3. Duerme bien y come carbohidratos la víspera del partido.
4. Mídelo con el Yo-Yo en Tests físicos.` },
  { deporte: 'Fútbol', claves: /(cabece|cabeza)/,
    respuesta: `⚽ Para cabecear mejor: golpea con la frente (no con la parte de arriba de la cabeza), ojos abiertos, cuello firme y el impulso del tronco hacia delante. Salta con los brazos para ganar altura. En menores, mejor pocas repeticiones de cabeceo en los entrenamientos.` },
  { deporte: 'Fútbol', claves: /(regate|gambeta|conduc|driblar|control)/,
    respuesta: `⚽ Para regatear mejor: balón cerca del pie, toques cortos con las dos piernas y cambios de ritmo (lento-rápido) más que trucos. Practica slalom con conos, primero despacio y con la cabeza arriba, luego más rápido.` },
  { deporte: 'Tenis', claves: /(saque|servicio|sacar)/,
    respuesta: `🎾 Para un saque más potente: lanzamiento de la pelota siempre al mismo sitio (un poco delante), flexión de rodillas, y la fuerza sale de piernas y tronco; golpea arriba con el brazo extendido y deja que la muñeca "suelte". Trabajo de hombro con banda elástica para protegerlo.` },
  { deporte: 'Tenis', claves: /(derecha|reves|golpe de fondo)/,
    respuesta: `🎾 Para golpear más fuerte de fondo: prepara pronto la raqueta, pies colocados de lado, rota la cadera y los hombros, golpea delante del cuerpo y termina el movimiento por encima del hombro contrario.` },
  { deporte: 'Natación', claves: /(crol|braz|nadar mas rapido|nadar mejor|tecnica)/,
    respuesta: `🏊 Para nadar más rápido en crol:
1. Cuerpo horizontal: mirada abajo y caderas arriba.
2. Brazada larga: entra la mano lejos y empuja el agua hasta el muslo.
3. Rota el cuerpo con cada brazada (hombro y cadera juntos).
4. Patada desde la cadera, corta y continua.

Ejercicios técnicos (con aletas o pull-buoy) y series cortas rápidas con descanso.` },
  { deporte: 'Natación', claves: /(respir|ahogo)/,
    respuesta: `🏊 Para respirar mejor: exhala bajo el agua todo el tiempo (por nariz y boca) y gira la cabeza junto con el cuerpo para tomar aire, sin levantarla. Practica respirar cada 3 brazadas para hacerlo a los dos lados.` },
  { deporte: 'Running', claves: /(mas rapido|ritmo|5 ?k|10 ?k|marca personal|bajar (mi )?tiempo)/,
    respuesta: `👟 Para correr más rápido: la mayor parte de los días, suave (puedes hablar); 1-2 días de calidad (series o tempo); una tirada larga a la semana; y 2 días de fuerza (pantorrilla, glúteo, core). Sube el volumen poco a poco (no más del 10 % por semana).` },
  { deporte: 'Running', claves: /(tecnica|zancada|postura|pisada)/,
    respuesta: `👟 Técnica de carrera: tronco erguido y un poco inclinado hacia delante, pisada debajo del cuerpo (no muy por delante), cadencia rápida (pasos cortos y frecuentes) y brazos relajados a 90°.` },
  { deporte: 'Atletismo', claves: /(salida|tacos|acelera|velocidad|mas rapido)/,
    respuesta: `🏃 Para mejorar la salida y la aceleración: empuja fuerte con las dos piernas desde los tacos, mantén el cuerpo inclinado los primeros pasos y endereza poco a poco; brazos potentes. Practica salidas de 10-20 m con descanso completo y trabajo de fuerza y saltos.` },
  { deporte: 'Gimnasio', claves: /(sentadilla)/,
    respuesta: `🏋️ Sentadilla: pies a la anchura de los hombros, pecho arriba, rodillas en la dirección de las puntas, baja hasta donde mantengas la espalda neutra y sube empujando el suelo. Empieza con poco peso y apunta tus series en la app para ver tu récord.` },
  { deporte: 'Gimnasio', claves: /(press de banca|banca|pecho)/,
    respuesta: `🏋️ Press de banca: escápulas juntas y abajo, pies firmes, barra baja hacia la parte baja del pecho con los codos a unos 45° y empuja en línea recta. Usa siempre un compañero o seguros con peso alto.` },
  { deporte: 'Gimnasio', claves: /(peso muerto)/,
    respuesta: `🏋️ Peso muerto: barra pegada a las piernas, espalda neutra, cadera atrás y empuja el suelo con las piernas; la barra sube rozando el cuerpo. Si se te curva la espalda, baja el peso.` },
  // Saltar más en cualquier deporte
  { deporte: '*', claves: /(saltar mas|salto vertical|saltar alto)/,
    respuesta: `💪 Para saltar más: fuerza de piernas 2 veces por semana (sentadilla, zancadas), pliometría con descanso completo (saltos al cajón, pocos y de calidad) y técnica de brazos. Mide tu salto en Tests físicos cada semana.` + CUIDADO },
];

/** Deporte del que habla el mensaje (o null). */
function deporteMencionado(texto) {
  const t = limpiar(texto);
  return PALABRAS_DEPORTE.find(([, re]) => re.test(t))?.[0] || null;
}

/**
 * Consejo de técnica para la pregunta, o null si no es una pregunta de técnica.
 * @param deporteAtleta el deporte del atleta (si no menciona otro)
 */
function respuestaTecnica(texto, deporteAtleta) {
  const t = limpiar(texto);
  const mencionado = deporteMencionado(texto);
  const deporte = mencionado || deporteAtleta;
  const coincide = e => e.claves.test(t) || Boolean(mencionado && e.amplias?.test(t));
  const candidatas = TECNICA.filter(e => (e.deporte === deporte || e.deporte === '*') && coincide(e));
  // Primero las que piden un detalle (por ejemplo, "receptor") que aparece en la pregunta
  const elegida = candidatas.find(e => e.detalle?.test(t)) || candidatas.find(e => !e.detalle);
  if (elegida) return elegida.respuesta;
  // Habla de un deporte pero no de algo que conozca: se le dice qué puede preguntar
  if (mencionado && /(como|mejor|tecnica|consejo|entren|mas )/.test(t)) {
    return `Sobre ${mencionado.toLowerCase()} puedo darte consejos de técnica y entrenamiento. Pregúntame algo concreto, por ejemplo: ${EJEMPLOS[mencionado] || 'cómo mejorar tu velocidad o tu resistencia'}.`;
  }
  return null;
}

const EJEMPLOS = {
  'Béisbol': '"¿cómo lanzo más duro siendo receptor?" o "¿cómo bateo con más potencia?"',
  'Boxeo': '"¿cómo pego más fuerte?" o "¿cómo aguanto los asaltos?"',
  'Baloncesto': '"¿cómo salto más?" o "¿cómo tiro mejor?"',
  'Fútbol': '"¿cómo pateo más fuerte?" o "¿cómo soy más rápido?"',
  'Tenis': '"¿cómo mejoro mi saque?"',
  'Natación': '"¿cómo nado más rápido en crol?" o "¿cómo respiro mejor?"',
  'Running': '"¿cómo corro más rápido un 10K?"',
  'Atletismo': '"¿cómo mejoro mi salida?"',
  'Gimnasio': '"¿cómo hago bien la sentadilla?"',
};

// ── Cómo usar la app ─────────────────────────────────────────────────────────

const PREGUNTA = /(como|donde|que hago|se puede|puedo|quiero|necesito|ayuda|no se|no me deja|no puedo|para que sirve|que es)/;

/** Ayuda de la app: tema (palabras clave) → respuesta. "siempre": no hace falta que sea una pregunta. */
const AYUDA_APP = [
  { claves: /(escane|codigo de barras)/, siempre: true,
    respuesta: '📷 Para escanear un producto: Historial → Comidas → "📷 Escanear código de barras". Apunta la cámara al código (o escribe el número), pon cuántos gramos comiste y pulsa "Usar en mi comida": se llenan las calorías y la proteína. Si el producto no existe, escribe una vez los datos de la etiqueta y queda guardado para todo el club.' },
  { claves: /(reloj|pulsometro|banda de pecho|smartwatch|pulso en vivo|gpx|tcx|garmin|xiaomi|amazfit|strava)/, siempre: true,
    respuesta: '⌚ Todo está en "Mi reloj" (menú de la izquierda): puedes importar el archivo .tcx o .gpx de tu entrenamiento o medir el pulso en vivo por Bluetooth (en Chrome, Android o computador). Pulsa "📘 Guía para conectar tu reloj" y elige tu marca para ver los pasos. Si tu sesión llega sin pulso, ábrela y marca qué tan dura fue (1 a 10).' },
  { claves: /(codigo de(l)? equipo|unirme|unirse|entrar a (mi|un) equipo|mi equipo|crear (un |mi )?equipo)/,
    respuesta: '👥 Para entrar a tu equipo: Mi Perfil → "Mi equipo" → escribe el código de 6 letras que te dio tu entrenador. Si eres entrenador, al registrarte eliges "Voy a crear un equipo" y verás el código en tu panel para compartirlo.' },
  { claves: /(registr\w* (mi )?salud|como registro como amaneci|registrar como)/,
    respuesta: '🌅 Para registrar cómo amaneciste: en el Dashboard pulsa "+ Registrar salud" (o Mi Salud) y marca fatiga, sueño y recuperación. Son 10 segundos y con eso la app sabe si hoy toca apretar o bajar el ritmo.' },
  { claves: /(registr\w* (una |mi )?comida|apuntar (una )?comida|anotar (lo que )?com)/,
    respuesta: '🍽 Para registrar una comida: Historial → Comidas, o en "Hoy te toca" pulsa "✓ La comí". También puedes escanear el código de barras del producto.' },
  { claves: /(registr\w* (un |mi )?entren|apuntar (un )?entreno|apunt\w* (mis )?series|marcar (la )?sesion)/,
    respuesta: '🏋️ Para tus entrenamientos: en "Hoy te toca" pulsa "Marcar hecha" en tu sesión, o en Mi Plan abre la rutina y apunta tus series (peso y repeticiones) para ver tus récords. Las sesiones libres van en Historial → Entrenamientos o en Mi reloj.' },
  { claves: /(dia de (partido|competencia|pelea|sparring|carrera)|cambiar (el|mi) dia|cuando juego)/,
    respuesta: '📅 Tu día de competencia se cambia en Mi Plan (arriba) o en Mi Perfil. Tu rutina, tus comidas y los consejos de sueño se organizan solos alrededor de ese día.' },
  { claves: /(estilo de pelea|mi estilo|fajador|estilista|contragolpe)/,
    respuesta: '🥊 Tu estilo de pelea se cambia en Mi Perfil (aparece si tu deporte es boxeo). Tu rutina suma ejercicios propios de ese estilo en los días de técnica.' },
  { claves: /(cambiar (mi )?deporte|cambiar (mi )?posicion|(cambiar|actualizar) mi (peso|altura)|actualizar (mi )?perfil|mis datos personales)/,
    respuesta: '👤 Tus datos (deporte, posición, peso, altura, sexo, día de competencia) se cambian en Mi Perfil. Tu plan se recalcula solo con los datos nuevos.' },
  { claves: /(alergi|intoleran|condicion|perfil medico)/,
    respuesta: '🩺 Tus condiciones de salud y alergias se cambian en Mi Plan → "⚙️ Actualizar perfil". Si la tuya no aparece en la lista, escríbela en el campo "¿Tienes otra…?": se quita de tu plan de comidas y la ven tu nutricionista y tu médico.' },
  { claves: /(contrasena|password)/, siempre: true,
    respuesta: '🔐 Para cambiar tu contraseña: toca tu foto o tu nombre (abajo a la izquierda) → Mi cuenta → Contraseña. Si la olvidaste, en el inicio de sesión pulsa "¿Olvidaste tu contraseña?" y te llega un enlace al correo.' },
  { claves: /(notificaci|avisos? al celular|recordatorio)/,
    respuesta: '🔔 Para recibir avisos en el celular: Mi cuenta → Notificaciones → Activar. Te llegan los mensajes, los avisos de tu médico y un recordatorio cada mañana si aún no registraste tu salud.' },
  { claves: /(instalar|descargar la app|app en el celular|pantalla de inicio)/,
    respuesta: '📲 Para instalar la app: ábrela en Chrome y usa el aviso "Instalar VitalTraining" o el menú ⋮ → "Instalar app" (en iPhone: Safari → Compartir → "Agregar a inicio"). Se abre a pantalla completa como cualquier app.' },
  { claves: /(descargar mis datos|mis datos en pdf|borrar mi cuenta|eliminar mi cuenta)/, siempre: true,
    respuesta: '📄 En Mi cuenta puedes descargar todos tus datos (en PDF o en archivo) y, si quieres, borrar tu cuenta con todos sus datos.' },
  { claves: /\b(rangos?|bronce|platino|diamante|radiante)\b/,
    respuesta: '🏅 Los rangos van de Bronce a Radiante y salen de tus marcas: tests físicos y récords de fuerza, comparados con referencias según tu peso y sexo. Un rango conseguido no se pierde. Míralos en Rangos.' },
  { claves: /(logro|insignia)/,
    respuesta: '🎖 Los logros se ganan con lo que ya haces: rachas registrando tu salud, sesiones, comidas, récords, tests y volver de una lesión. Míralos en Logros, con el progreso de los que te faltan.' },
  { claves: /(clasificacion|ranking|tabla|puntos)/,
    respuesta: '🏆 En Clasificación compites con tu equipo o con todo tu deporte: por constancia (salud, sesiones y comidas registradas) o por marcas. En los equipos, solo cuentan las marcas que verificó tu entrenador.' },
  { claves: /(test(s)? fisico|evaluaci|medir mi salto|medir mi velocidad)/,
    respuesta: '⏱ Los tests físicos están en Tests físicos: salto, velocidad, resistencia… según tu deporte. Si estás en un equipo, los registra tu entrenador (así las marcas son reales). Lo ideal es repetirlos cada semana.' },
  { claves: /(hablar con|escribir(le)? a|mensaje|chat con) .*(entrenador|medico|nutricionista|doctor)|(mensajes)/,
    respuesta: '💬 En Mensajes puedes escribirle a tu entrenador, a tu nutricionista y a tu médico (los de tu equipo). Te llega un aviso cuando te responden.' },
  // Cuenta, perfil y soporte
  { claves: /(ticket|soporte|reportar (un )?(error|problema|fallo)|la app (no funciona|falla|tiene un error)|encontre un error|problema con la app)/, siempre: true,
    respuesta: '🛠️ Para abrir un ticket: menú de la izquierda → Mensajes → "Soporte técnico" → "+ Nuevo ticket". Escribe qué pasó (y en qué pantalla) y llega al equipo de administración. Ahí mismo ves cómo va tu ticket y sus respuestas.' },
  { claves: /(foto de perfil|mi foto|cambiar (la |mi )?foto|poner (una )?foto|subir (una )?foto|avatar)/, siempre: true,
    respuesta: '📷 Para cambiar tu foto: Mi Perfil → "📷 Cambiar foto" (o toca tu foto abajo a la izquierda → Mi cuenta). Sirve JPG, PNG o WebP de hasta 5 MB; puedes recortarla antes de guardar. Solo la ven las personas con sesión iniciada en la app.' },
  { claves: /(modo oscuro|modo claro|tema oscuro|fondo (negro|oscuro)|cambiar (los )?colores)/, siempre: true,
    respuesta: '🌙 Para el modo oscuro: toca el botón de la luna, abajo a la izquierda junto a tu nombre. Vuelve a tocarlo para el modo claro; la app lo recuerda.' },
  { claves: /(cerrar (la )?sesion|salir de (la app|mi cuenta)|desconectarme)/, siempre: true,
    respuesta: '🚪 Para cerrar sesión: el botón de salida, abajo a la izquierda junto a tu nombre. Hazlo siempre en computadores que no son tuyos.' },
  { claves: /(cambiar (mi )?nombre|corregir (mi )?nombre)/, siempre: true,
    respuesta: '✏️ Tu nombre se cambia en Mi Perfil → "Nombre completo" → Guardar cambios.' },
  { claves: /(cambiar (mi )?correo|cambiar (mi )?email|otro correo)/, siempre: true,
    respuesta: '✉️ El correo no se cambia desde tu perfil (es con el que entras). Abre un ticket en Mensajes → Soporte técnico y el administrador te ayuda.' },
  { claves: /(borr(ar|o|e)|elimin(ar|o|e)|quit(ar|o|e)) (una |la |esa |un |el )?(comida|sesion|entrenamiento|registro|serie)/, siempre: true,
    respuesta: '🗑️ Para borrar un registro: en Historial (Comidas o Entrenamientos) pulsa la ✕ a la derecha de ese registro. Las marcas que verificó tu entrenador solo las puede borrar él.' },
  { claves: /(video|como se hace (el|este|ese) ejercicio|no se hacer (el|un) ejercicio)/, siempre: true,
    respuesta: '▶️ Cada ejercicio de tu rutina tiene "▶ Ver video": Mi Plan → Rutina → el botón al lado del ejercicio. Te lleva a videos de cómo hacerlo bien.' },
  { claves: /(plan de comidas|que me toca comer|mi plan alimenticio|ver mi dieta)/,
    respuesta: '🥗 Tu plan de comidas está en Mi Plan → Plan alimenticio, día por día con calorías y macros. En "Hoy te toca" ves las comidas de hoy y marcas "✓ La comí".' },
  { claves: /(cambiar(me)? de equipo|salir(me)? del equipo|otro equipo|dejar (el|mi) equipo)/, siempre: true,
    respuesta: '👥 Para cambiarte de equipo, escribe el código del nuevo en Mi Perfil → "Mi equipo": quedas en el nuevo. Para salir de un equipo sin entrar a otro, pídeselo a tu entrenador o al administrador.' },
  { claves: /(quien (ve|puede ver) mis datos|privacidad|mis datos son privados|quien ve mi informacion)/, siempre: true,
    respuesta: '🔒 Tus datos los ven solo tú y los profesionales de tu equipo (entrenador, nutricionista y médico); el administrador gestiona las cuentas. Tu foto solo se ve con sesión iniciada y algunas notas del médico son privadas. En Mi cuenta puedes descargar o borrar todos tus datos.' },
  // Qué significa cada cosa de la app
  { claves: /(que (es|significa) (el )?listo para entrenar|que es el puntaje|por que (estoy|me sale) en descanso)/, siempre: true,
    respuesta: '✅ "Listo para entrenar" es un puntaje de 0 a 100 que sale de cómo amaneciste (fatiga, sueño, recuperación) y de tu carga reciente. Alto: entrena según tu plan. Medio: baja la intensidad. Bajo: hoy toca descansar o algo muy suave.' },
  { claves: /(que (es|significa) (la )?carga|riesgo (alto|de lesion) por carga|que es el acwr|por que (tengo|me sale) riesgo)/, siempre: true,
    respuesta: '📈 La carga de cada sesión es minutos × esfuerzo (1-10). La app compara tu última semana con tu promedio del mes: si de golpe entrenas mucho más de lo normal, sube el riesgo de lesión y te avisa. Subir poco a poco es la clave.' },
  { claves: /(que es (la )?racha|como (mantengo|no pierdo) (la|mi) racha|perdi (la|mi) racha)/, siempre: true,
    respuesta: '🔥 La racha son los días seguidos registrando cómo amaneciste. Si un día no registras, vuelve a empezar. Activa el recordatorio de cada mañana en Mi cuenta → Notificaciones para no perderla.' },
  { claves: /(que es (el )?cumplimiento|que significa el porcentaje del plan)/, siempre: true,
    respuesta: '📅 El cumplimiento es el porcentaje de sesiones de tu plan que marcaste como hechas en las últimas semanas (las parciales cuentan la mitad).' },
  { claves: /(que es (el )?(rpe|esfuerzo)|esfuerzo (del )?1 (a|al) 10|escala de esfuerzo)/, siempre: true,
    respuesta: '💪 El esfuerzo (RPE) es qué tan dura sentiste la sesión, de 1 (muy suave, podrías cantar) a 10 (máximo, no podías más). 5-6 es moderado: puedes hablar con frases cortas. Con él la app calcula tu carga.' },
  { claves: /(que son las zonas|zona [1-5]|zonas de (pulso|frecuencia))/, siempre: true,
    respuesta: '❤️ Las zonas de pulso salen de tu frecuencia máxima (208 − 0,7 × edad): Z1 50-60 % muy suave, Z2 60-70 % suave (base aeróbica), Z3 70-80 % moderada, Z4 80-90 % intensa y Z5 más del 90 %, máxima. Míralas en cada sesión de Mi reloj.' },
  { claves: /(que puedes hacer|para que sirves|quien eres|que sabes)/, siempre: true,
    respuesta: '👋 Soy Vita. Puedo decirte si hoy te conviene entrenar fuerte, cómo vas en la semana, qué comer, cómo dormir mejor, cómo prepararte para tu competencia, darte consejos de técnica de tu deporte (por ejemplo, "¿cómo lanzo más duro?") y explicarte cómo usar la app.' },
];

// ── Lo básico que todo atleta debería saber ──────────────────────────────────

const BASICO = [
  { claves: /(calentar|calentamiento|como caliento)/,
    respuesta: '🔥 Un buen calentamiento (10-15 min): 5 min de trote o bici suave, movilidad dinámica (círculos de cadera y hombros, zancadas, balanceos de pierna), activación (sentadillas, saltos suaves) y 2-3 aceleraciones progresivas o gestos de tu deporte. Antes de entrenar, mejor movimiento que estiramientos largos.' },
  { claves: /(estirar|estiramiento|elongar|flexibilidad)/,
    respuesta: '🧘 Antes de entrenar: estiramientos dinámicos (en movimiento). Después: estáticos suaves, 20-30 s por músculo, sin dolor. Para ganar flexibilidad, estira 3-4 veces por semana; no estires fuerte un músculo lesionado.' },
  { claves: /(calambre)/,
    respuesta: '⚡ Ante un calambre: para, estira suave el músculo (en la pantorrilla, lleva la punta del pie hacia ti) y masajea. Suelen venir de fatiga y de entrenar deshidratado: bebe agua con sales en sesiones largas o con calor. Si son muy frecuentes, coméntalo con tu médico.' },
  { claves: /(cuanta agua|hidrat|tomar agua|beber agua|bebida isotonica|electrolito)/,
    respuesta: '💧 Como guía: unos 35 ml por kg de peso al día, más 0,4-0,8 L por cada hora de entrenamiento. Bebe antes de tener sed; la orina clara indica que vas bien. En sesiones de más de 60-90 min o con mucho calor, añade sales (bebida isotónica). Tu plan de comidas muestra tu meta de agua de cada día.' },
  { claves: /(antes de entrenar|antes del entreno|antes de (un )?partido|antes de competir|pre ?entreno)/,
    respuesta: '🍌 Antes de entrenar: una comida con carbohidratos y algo de proteína 2-3 h antes (arroz o pasta con pollo, arepa con huevo), con poca grasa y fibra. Si falta poco (30-60 min), algo ligero: un banano, pan con miel o un yogur. Y llega hidratado.' },
  { claves: /(despues de entrenar|despues del entreno|post ?entreno|al terminar de entrenar)/,
    respuesta: '🥛 Después de entrenar: en las 1-2 horas siguientes, proteína (20-40 g: huevos, pollo, atún, yogur o leche) con carbohidratos (arroz, papa, fruta, pan) para recuperar, y repón el agua que perdiste.' },
  { claves: /(golpe de calor|insolacion|mucho calor|me mareo con el calor)/,
    respuesta: '🌡️ Con calor: entrena temprano o al final de la tarde, bebe más y con sales, y usa ropa clara. Si hay mareo, dolor de cabeza fuerte, náuseas o piel muy caliente: para, ve a la sombra, refréscate y bebe. Si hay confusión o desmayo, es una emergencia: llama al 123.' },
  { claves: /(golpe en la cabeza|me golpee la cabeza|conmocion|me dieron en la cabeza|quede mareado)/,
    respuesta: '🚨 Tras un golpe en la cabeza con dolor, mareo, náuseas, visión borrosa o confusión: no sigas entrenando ese día, avisa a tu entrenador y que te vea un médico. Si hay vómitos, sueño excesivo o pérdida de conocimiento, ve a urgencias. Vuelve al deporte solo con el visto bueno médico.' },
  { claves: /(me torci|torcedura|esguince|me doble el (tobillo|pie)|me lesione)/,
    respuesta: '🩹 Ante una torcedura: para, protege la zona, ponla en alto y usa una venda que comprima suave; el frío puede aliviar el dolor. No masajees fuerte ni fuerces. Si no puedes apoyar, se hincha mucho o el dolor es fuerte, que te vea un médico; escríbele a tu médico desde Mensajes.' },
  { claves: /(diferencia entre (las )?agujetas|agujetas o lesion|es normal que me duela|dolor normal|dolor bueno)/,
    respuesta: '🤔 Las agujetas son un dolor muscular difuso que aparece 24-72 h después de entrenar y mejora moviéndote. Una lesión suele doler en un punto concreto, aparece de golpe, empeora con el movimiento o viene con hinchazón. Ante la duda, no entrenes esa zona y consúltalo con tu médico.' },
  { claves: /(ampolla)/,
    respuesta: '🦶 Para evitar ampollas: medias técnicas secas, calzado de tu talla ya usado antes de competir y vaselina en las zonas de roce. Si sale una, no la revientes: cúbrela con un apósito. Si se abre, lávala y tápala.' },
  { claves: /(zapatillas|tenis para correr|cambiar (los|las) (zapatos|zapatillas)|guayos)/,
    respuesta: '👟 Usa calzado de tu deporte y de tu talla. Las zapatillas de correr se cambian más o menos cada 600-800 km o cuando la suela está muy gastada o sientes molestias nuevas. Estrena el calzado en entrenamientos, nunca el día de la competencia.' },
  { claves: /(descanso entre series|cuanto descanso entre|cuanto tiempo descansar entre)/,
    respuesta: '⏱️ Entre series: fuerza máxima (pocas repeticiones, mucho peso) 2-3 min; ganar músculo 60-90 s; resistencia 30-60 s. Si la técnica empeora, descansa más.' },
  { claves: /(cuantos dias (debo )?descansar|dias de descanso|entrenar todos los dias|cuanto descanso a la semana)/,
    respuesta: '😌 Deja al menos 1-2 días de descanso (o muy suaves) por semana y no entrenes fuerte el mismo músculo dos días seguidos. El cuerpo mejora mientras descansa. Tu plan ya trae sus días de recuperación y descanso.' },
  { claves: /(cafeina|cafe antes)/,
    respuesta: '☕ La cafeína puede mejorar el rendimiento en adultos (unos 3 mg por kg, 60 min antes), pero quita sueño si la tomas tarde y no se recomienda en menores. Pruébala en entrenamientos, nunca por primera vez en una competencia.' },
  { claves: /(creatina|proteina en polvo|suplemento|whey|bcaa|quemador)/,
    respuesta: '💊 Primero la comida: con tu plan cubres casi todo. La proteína en polvo es comida práctica, y la creatina es de los pocos suplementos con buena evidencia en adultos, pero coméntalo antes con tu nutricionista (desde Mensajes). Evita "quemadores" y productos sin registro; si eres menor de edad, no tomes suplementos sin indicación médica.' },
  { claves: /(alcohol|cerveza|trago)/,
    respuesta: '🍺 El alcohol empeora la recuperación, el sueño y la hidratación, sobre todo en las 24-48 h después de entrenar o antes de competir. Si eres menor de edad, nada de alcohol.' },
  { claves: /(como (me )?(tomo|mido) el pulso|pulso en reposo|frecuencia cardiaca en reposo)/,
    respuesta: '❤️ Para medir tu pulso en reposo: al despertar, todavía acostado, pon dos dedos en la muñeca o el cuello y cuenta 30 segundos × 2. Si un día está 5-10 latidos más alto de lo normal, puede ser cansancio o que te estás enfermando: ese día, suave.' },
];

/** Consejo básico de deporte y salud, o null. */
function respuestaBasica(texto) {
  const t = limpiar(texto);
  return BASICO.find(b => b.claves.test(t))?.respuesta || null;
}

/** Respuesta de ayuda de la app, o null si no habla de la app. */
function respuestaAyudaApp(texto) {
  const t = normalizar(texto);
  const esPregunta = PREGUNTA.test(t) || /\b(app|aplicacion)\b/.test(t);
  return AYUDA_APP.find(a => a.claves.test(t) && (a.siempre || esPregunta))?.respuesta || null;
}

module.exports = { respuestaTecnica, respuestaAyudaApp, respuestaBasica, deporteMencionado, TECNICA, AYUDA_APP, BASICO, normalizar };
