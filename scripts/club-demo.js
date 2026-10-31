/**
 * Club de demostración: un equipo de fútbol completo con 4 semanas de historia, para enseñar
 * la app (al profesor, en clase o a un club interesado) sin depender de datos reales.
 *
 *   npm run club-demo                crea el club (si ya existe, no hace nada)
 *   npm run club-demo -- --borrar    borra el club y todas sus cuentas
 *
 * Contraseña de todas las cuentas del club: CLUB_DEMO_PASSWORD (obligatoria en producción,
 * mínimo 10 caracteres; en local, si no está, "demo12345").
 * En el hosting (sin consola) se crea solo al arrancar si CLUB_DEMO_PASSWORD está definida.
 * Los datos van relativos a hoy: si al arrancar tienen más de un día, el club se vuelve a crear
 * (Render gratis se reinicia al despertar, así que el día de la demo siempre está al día).
 *
 * Los correos usan el dominio reservado .example: la app nunca les envía correos reales.
 *
 * Quién es quién (para el guion de la demo):
 * - Santiago (delantero): la estrella. Racha de 28 días, récords, marcas verificadas, sesiones
 *   del reloj con pulso, comidas escaneadas y muchos logros.
 * - Valeria (mediocampista): muy constante; compite con Santiago en la clasificación.
 * - Juan Pablo (defensa): subió mucho la carga esta semana → alerta de riesgo.
 * - Mateo (portero): lesionado (isquiotibiales), de baja; el médico lo sigue.
 * - Camila (lateral): volvió de un esguince de tobillo → logro "De vuelta".
 * - Profe Andrés (entrenador), Laura (nutricionista) y Dr. Felipe (médico).
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('../base-de-datos/db');
const { hoyISO, sumarDias, aFechaISO } = require('../servidor/compartido/fechas');

const DOMINIO = 'club-demo.example';
const EQUIPO = 'Club Demo · Sub-20';
const correoDe = alias => `${alias}@${DOMINIO}`;
const PRODUCCION = process.env.NODE_ENV === 'production';

const STAFF = [
  { alias: 'profe',     nombre: 'Andrés Gómez',  rol: 'Entrenador' },
  { alias: 'nutricion', nombre: 'Laura Méndez',  rol: 'Nutricionista' },
  { alias: 'medico',    nombre: 'Felipe Rojas',  rol: 'Medico' },
];

// salud: [días registrados de los últimos 28, fatiga, sueño, recuperación]; fuerza: kg de partida
const ATLETAS = [
  { alias: 'santiago', nombre: 'Santiago Torres', posicion: 'Delantero', sexo: 'Hombre', peso: 76, altura: 179, nacimiento: '2005-05-10', pie: 'Derecho',
    objetivo: 'Mejorar rendimiento deportivo', salud: [28, 3, 8, 8], comidasDias: 14, fuerza: { sentadilla: 85, banca: 62, rumano: 70 },
    tests: { cmj: [40.5, 42.1, 44.6], sprint10: [1.81, 1.78, 1.74], sprint30: [4.26, 4.19, 4.11], yoyo1: [1760, 1880, 2000] } },
  { alias: 'valeria', nombre: 'Valeria Castro', posicion: 'Mediocampista', sexo: 'Mujer', peso: 58, altura: 165, nacimiento: '2006-02-21', pie: 'Izquierdo',
    objetivo: 'Mejorar resistencia', salud: [26, 3, 8, 7], comidasDias: 12, fuerza: { sentadilla: 55, banca: 30, rumano: 45 },
    tests: { cmj: [33.2, 34.0, 35.8], sprint10: [1.98, 1.95, 1.93], yoyo1: [1440, 1560, 1640] } },
  { alias: 'juanpablo', nombre: 'Juan Pablo Díaz', posicion: 'Defensa', sexo: 'Hombre', peso: 82, altura: 186, nacimiento: '2005-09-03', pie: 'Derecho',
    objetivo: 'Ganar masa muscular', salud: [19, 7, 5, 4], comidasDias: 6, cargaAlta: true, fuerza: { sentadilla: 95, banca: 75, rumano: 85 },
    tests: { cmj: [41.0, 41.6], sprint10: [1.86, 1.85], yoyo1: [1600, 1640] } },
  { alias: 'mateo', nombre: 'Mateo Rincón', posicion: 'Portero', sexo: 'Hombre', peso: 85, altura: 190, nacimiento: '2004-12-12', pie: 'Derecho',
    objetivo: 'Volver a jugar tras la lesión', salud: [20, 4, 7, 6], comidasDias: 5, lesionadoDesde: 6, fuerza: { sentadilla: 90, banca: 70, rumano: 80 },
    tests: { cmj: [39.8], sprint10: [1.90] } },
  { alias: 'camila', nombre: 'Camila Ortiz', posicion: 'Lateral', sexo: 'Mujer', peso: 55, altura: 160, nacimiento: '2006-07-30', pie: 'Derecho',
    objetivo: 'Mejorar velocidad', salud: [15, 4, 7, 7], comidasDias: 4, lesionPasada: { desde: 26, alta: 12 }, vueltaSuave: true, fuerza: { sentadilla: 45, banca: 25, rumano: 40 },
    tests: { cmj: [31.0, 33.4], sprint10: [1.99, 1.94] } },
];

const COMIDAS = [
  ['Desayuno', 'Huevos pericos con arepa y chocolate', 520, 24],
  ['Desayuno', 'Calentado con huevo y jugo de naranja', 610, 26],
  ['Merienda mañana', 'Banano con mantequilla de maní', 280, 8],
  ['Almuerzo', 'Pollo a la plancha con arroz, fríjoles y ensalada', 720, 48],
  ['Almuerzo', 'Pescado con patacón, arroz y ensalada', 680, 42],
  ['Almuerzo', 'Pasta con carne molida y verduras', 750, 40],
  ['Merienda tarde', 'Batido de banano con avena y leche', 390, 18],
  ['Cena', 'Sándwich de pavo con queso y fruta', 450, 30],
  ['Cena', 'Tortilla de verduras con arepa', 430, 22],
];

// Productos "escaneados" (los escribió la nutricionista para el club); el código se completa con su dígito de control
const PRODUCTOS = [
  { base: '770200100001', nombre: 'Avena en hojuelas', marca: 'Quaker', kcal: 380, prot: 13, carb: 66, grasa: 7, porcion: 40, tipo: 'Desayuno' },
  { base: '770200100002', nombre: 'Kumis', marca: 'Alpina', kcal: 90, prot: 3.2, carb: 13.5, grasa: 2.6, porcion: 200, tipo: 'Merienda tarde' },
  { base: '770200100003', nombre: 'Yogur griego natural', marca: 'Alpina', kcal: 97, prot: 9, carb: 4, grasa: 5, porcion: 150, tipo: 'Merienda mañana' },
  { base: '770200100004', nombre: 'Atún en agua', marca: "Van Camp's", kcal: 116, prot: 26, carb: 0, grasa: 1, porcion: 80, tipo: 'Almuerzo' },
];

const MENSAJES = [
  ['profe', 'santiago', 'Santi, gran partido el sábado. Esta semana trabajamos definición y sprints cortos.', 2900],
  ['santiago', 'profe', '¡Gracias profe! ¿Repito el test de salto el jueves?', 2880],
  ['profe', 'santiago', 'Sí, el jueves lo medimos antes del entreno. Llega descansado.', 2870],
  ['nutricion', 'valeria', 'Valeria, vi tus comidas de la semana: muy bien. Sube un poco la proteína en la cena.', 1500],
  ['valeria', 'nutricion', 'Listo, ¿te sirve yogur griego o atún?', 1480],
  ['nutricion', 'valeria', 'Las dos opciones son perfectas. El yogur ya está en la app: escanéalo y te calcula todo.', 1470],
  ['medico', 'mateo', 'Mateo, esta semana solo movilidad y bicicleta suave. Nada de sprints hasta la revisión.', 900],
  ['mateo', 'medico', 'Entendido doctor. Ya no me duele al caminar.', 860],
  ['medico', 'profe', 'Profe, Juan Pablo tiene la carga muy alta: bajémosle la intensidad dos o tres días.', 300],
  ['profe', 'medico', 'De acuerdo, mañana hace recuperación activa.', 280],
];

/** Generador de números pseudoaleatorios con semilla: el club sale igual cada vez. */
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dia = n => sumarDias(hoyISO(), -n);
const entre = (rnd, a, b) => a + Math.round(rnd() * (b - a));
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const nombreDia = fecha => DIAS[new Date(`${fecha}T00:00:00Z`).getUTCDay()];

function conDigitoDeControl(base) {
  const suma = base.split('').reverse().reduce((t, d, i) => t + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return base + ((10 - (suma % 10)) % 10);
}

/** Curva de pulso de una sesión (un valor cada 5 s). */
function curvaPulso(minutos, tipo, rnd) {
  const n = Math.round((minutos * 60) / 5);
  let nivel = 0.6;
  return Array.from({ length: n }, (_, i) => {
    const t = i / n;
    let intensidad;
    if (tipo === 'intervalos') intensidad = (i * 5) % 300 < 180 ? 0.93 : 0.62;            // 3 min fuerte, 2 suave
    else if (tipo === 'carrera') intensidad = 0.72 + 0.08 * t;                            // ritmo constante que sube
    else { nivel = Math.min(1, Math.max(0.5, nivel + (rnd() - 0.5) * 0.08)); intensidad = nivel; } // partido: a ratos
    if (t < 0.1) intensidad = 0.45 + (intensidad - 0.45) * (t / 0.1);                    // calentamiento
    if (t > 0.94) intensidad *= 0.85;                                                     // vuelta a la calma
    return Math.round(95 + intensidad * 95 + (rnd() - 0.5) * 6);
  });
}

/** null si no existe; si existe, el último día con salud registrada de la estrella. */
async function ultimoDia() {
  const { rows } = await query('SELECT id FROM usuarios WHERE email = $1', [correoDe('santiago')]);
  if (!rows.length) return null;
  const { rows: [r] } = await query('SELECT MAX(fecha) AS ultimo FROM salud WHERE user_id = $1', [rows[0].id]);
  return aFechaISO(r?.ultimo) || '';
}

async function crearUsuario(datos, hash) {
  const { rows } = await query(
    `INSERT INTO usuarios (nombre, email, password, rol, estado, deporte_principal, posicion, peso, altura, fecha_nacimiento, pie, objetivo, fecha_registro, created_at)
     VALUES ($1, $2, $3, $4, 'Activo', 'Fútbol', $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [datos.nombre, correoDe(datos.alias), hash, datos.rol || 'Atleta', datos.posicion || null, datos.peso || null, datos.altura || null,
      datos.nacimiento || null, datos.pie || null, datos.objetivo || null, new Date(Date.now() - 30 * 86400000).toLocaleDateString('es-CO'),
      new Date(Date.now() - 30 * 86400000).toISOString()]
  );
  return Number(rows[0].id);
}

async function crearClubDemo({ password = process.env.CLUB_DEMO_PASSWORD } = {}) {
  if (!password && !PRODUCCION) password = 'demo12345'; // NOSONAR: solo en local, para probar el club
  if (!password || password.length < (PRODUCCION ? 10 : 8)) {
    console.log('ℹ️  Club demo: define CLUB_DEMO_PASSWORD (mínimo 10 caracteres en producción).');
    return { creado: false };
  }
  // Si ya existe y está al día, no se toca; si sus datos son de hace más de un día (la racha se
  // vería rota), se vuelve a crear: así el día de la presentación siempre está fresco.
  const ultimo = await ultimoDia();
  if (ultimo !== null && ultimo >= dia(1)) {
    console.log('ℹ️  El club de demostración ya existe y está al día.');
    return { creado: false };
  }
  if (ultimo !== null) await borrarClubDemo();
  console.log('🏟  Creando el club de demostración…');
  const perfilMedico = require('../servidor/api/perfilMedico/perfilMedico.service');
  const equipos = require('../servidor/api/equipos/equipos.service');
  const series = require('../servidor/api/series/series.service');
  const evaluaciones = require('../servidor/api/evaluaciones/evaluaciones.service');
  const lesiones = require('../servidor/api/lesiones/lesiones.service');
  const reloj = require('../servidor/api/reloj/reloj.service');
  const rnd = aleatorio(2026);

  const hash = await bcrypt.hash(password, 10);
  const id = {};
  for (const s of STAFF) id[s.alias] = await crearUsuario(s, hash);
  const autor = alias => ({ id: id[alias], nombre: STAFF.find(s => s.alias === alias).nombre, rol: STAFF.find(s => s.alias === alias).rol });

  const equipo = await equipos.crear({ nombre: EQUIPO, deporte: 'Fútbol' });
  for (const s of STAFF) await equipos.agregarMiembro(equipo.id, id[s.alias]);

  // Productos escaneables del club
  const productos = PRODUCTOS.map(p => ({ ...p, codigo: conDigitoDeControl(p.base) }));
  for (const p of productos) {
    await query(
      `INSERT INTO alimentos_codigos (codigo, nombre, marca, kcal_100, proteina_100, carbohidratos_100, grasa_100, porcion_g, fuente, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'club', $9)`,
      [p.codigo, p.nombre, p.marca, p.kcal, p.prot, p.carb, p.grasa, p.porcion, id.nutricion]);
  }

  for (const a of ATLETAS) {
    const uid = id[a.alias] = await crearUsuario(a, hash);
    await equipos.agregarMiembro(equipo.id, uid);
    const edad = new Date().getUTCFullYear() - Number(a.nacimiento.slice(0, 4));
    await query('INSERT INTO perfiles (user_id, nombre, edad, peso, altura, posicion, sexo, dia_partido) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [uid, a.nombre, edad, a.peso, a.altura, a.posicion, a.sexo, 'Sábado']);
    const plan = await perfilMedico.guardar(uid, { condiciones: [], alergias: [], preferencia: 'Sin restricciones' }, a.posicion, 'Fútbol');
    await query('UPDATE perfiles_medicos SET creado_en = $1 WHERE user_id = $2', [`${dia(28)}T10:00:00Z`, uid]);

    const diasEntreno = plan.rutinaSemanal.semana.filter(d => d.ejercicios.length).map(d => d.dia);
    const lesionado = n => (a.lesionadoDesde && n <= a.lesionadoDesde) || (a.lesionPasada && n <= a.lesionPasada.desde && n > a.lesionPasada.alta);
    const [diasSalud, fatiga, sueno, recuperacion] = a.salud;
    let sesionFuerza = 0;

    for (let n = 27; n >= 0; n--) {
      const fecha = dia(n);
      const ultimaSemana = n <= 6;
      // Salud: los días más recientes siempre (así se ve la racha); antes, con huecos
      if (n < diasSalud && (n <= 7 || rnd() < 0.85 || a.alias === 'santiago')) {
        const peor = a.cargaAlta && ultimaSemana ? 2 : 0;
        await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1, $2, $3, $4, $5)',
          [uid, fecha, Math.min(10, fatiga + peor + entre(rnd, -1, 1)), Math.max(1, sueno - peor + entre(rnd, -1, 1)),
            Math.max(1, recuperacion - peor + entre(rnd, -1, 1))]);
      }
      if (lesionado(n) || n === 0) continue;

      // Sesiones del plan
      const nombre = nombreDia(fecha);
      if (diasEntreno.includes(nombre) && rnd() > 0.12) {
        const alta = a.cargaAlta && ultimaSemana;
        const suave = a.vueltaSuave && ultimaSemana; // vuelta progresiva tras la lesión
        await query('INSERT INTO cumplimiento (user_id, fecha, dia_semana, tipo, estado, rpe, duracion_minutos) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [uid, fecha, nombre, 'Plan', rnd() < 0.15 ? 'parcial' : 'completo', alta ? 9 : suave ? 4 : entre(rnd, 5, 7), alta ? 105 : suave ? 40 : entre(rnd, 55, 75)]);
      }

      // Fuerza dos veces por semana, subiendo de peso poco a poco
      if (['Lunes', 'Jueves'].includes(nombre)) {
        const sube = 1 + 0.025 * sesionFuerza++;
        const redondo = kg => Math.round(kg * sube / 2.5) * 2.5;
        for (const [ejercicio, kg, reps, num] of [
          ['Sentadilla con barra', a.fuerza.sentadilla, 5, 4], ['Press de banca con barra', a.fuerza.banca, 6, 4], ['Peso muerto rumano', a.fuerza.rumano, 8, 3]]) {
          for (let k = 0; k < num; k++) {
            const { serie } = await series.registrar(uid, { ejercicio, peso: redondo(kg), repeticiones: reps, fecha });
            // Las del último mes de la estrella las vio el entrenador
            if (a.alias === 'santiago' && n <= 10 && k === num - 1) await series.verificar(uid, serie.id, autor('profe'));
          }
        }
      }

      // Comidas
      if (n <= a.comidasDias) {
        const delDia = [COMIDAS[entre(rnd, 0, 1)], COMIDAS[entre(rnd, 3, 5)], COMIDAS[entre(rnd, 7, 8)]];
        for (const [tipo, nombreComida, kcal, prot] of delDia) {
          await query('INSERT INTO comidas (user_id, nombre, tipo, calorias, proteina, notas, fecha) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [uid, nombreComida, tipo, kcal + entre(rnd, -40, 40), prot, '', fecha]);
        }
        if (['santiago', 'valeria'].includes(a.alias) && n % 2 === 0) {
          const p = productos[n % productos.length];
          await query('INSERT INTO comidas (user_id, nombre, tipo, calorias, proteina, notas, fecha) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [uid, `${p.nombre} (${p.marca})`, p.tipo, Math.round((p.kcal * p.porcion) / 100), Math.round((p.prot * p.porcion) / 10) / 10,
              `${p.porcion} g · código ${p.codigo}`, fecha]);
        }
      }
    }

    // Tests físicos medidos por el entrenador (verificados), repartidos en el mes
    for (const [prueba, valores] of Object.entries(a.tests)) {
      const fechas = valores.length === 3 ? [27, 14, 2] : valores.length === 2 ? [27, 6] : [27];
      for (let k = 0; k < valores.length; k++) {
        if (lesionado(fechas[k])) continue;
        await evaluaciones.registrar(uid, { prueba, valor: valores[k], fecha: dia(fechas[k]) }, autor('profe'));
      }
    }
  }

  // Sesiones con reloj (pulso, zonas y carga): la estrella, Valeria y Juan Pablo
  const sesionesReloj = [
    ['santiago', 3, 'partido', 'Partido vs. Atlético Sur', 'Resistencia', 92, 8900, 'archivo'],
    ['santiago', 8, 'intervalos', 'Intervalos 3×3 min', 'Velocidad', 38, 6200, 'archivo'],
    ['santiago', 12, 'carrera', 'Carrera (reloj)', 'Cardio', 45, 8100, 'archivo'],
    ['santiago', 1, 'intervalos', 'Entrenamiento con pulsómetro', 'Velocidad', 30, null, 'bluetooth'],
    ['valeria', 3, 'partido', 'Partido vs. Atlético Sur', 'Resistencia', 90, 9600, 'archivo'],
    ['valeria', 9, 'carrera', 'Carrera (reloj)', 'Cardio', 40, 6900, 'archivo'],
    ['juanpablo', 2, 'intervalos', 'Doble sesión: intervalos', 'Velocidad', 55, 7800, 'archivo'],
    ['juanpablo', 3, 'partido', 'Partido vs. Atlético Sur', 'Resistencia', 95, 8400, 'archivo'],
  ];
  for (const [alias, n, tipoCurva, nombre, tipo, minutos, distanciaM, origen] of sesionesReloj) {
    const pulsos = curvaPulso(minutos, tipoCurva, rnd);
    await reloj.registrar(id[alias], {
      origen, inicio: `${dia(n)}T22:30:00.000Z`, fecha: dia(n), duracionSeg: minutos * 60, intervaloSeg: 5,
      pulsos, nombre, tipo, distanciaM, calorias: Math.round(minutos * 11),
    });
  }

  // Lesiones: Mateo de baja ahora; Camila ya recibió el alta
  const mateo = ATLETAS.find(a => a.alias === 'mateo');
  await lesiones.registrar(id.mateo, {
    zona: 'Isquiotibiales', tipo: 'Muscular', gravedad: 'moderada', restriccion: 'no_apto',
    fechaInicio: dia(mateo.lesionadoDesde), altaEstimada: dia(-15),
    indicaciones: 'Rotura fibrilar grado I. Hielo 15 min tres veces al día, movilidad suave y bicicleta sin resistencia. Revisión en 10 días.',
  }, autor('medico'));
  await lesiones.agregarNota(id.mateo, { texto: 'Evoluciona bien: sin dolor al caminar. Mantener reposo deportivo hasta la revisión.' }, autor('medico'));
  await lesiones.agregarNota(id.mateo, { texto: 'Valorar ecografía si persiste la molestia al estirar.', visibleAtleta: false }, autor('medico'));
  const camila = ATLETAS.find(a => a.alias === 'camila').lesionPasada;
  const esguince = await lesiones.registrar(id.camila, {
    zona: 'Tobillo', tipo: 'Ligamento o articulación', gravedad: 'leve', restriccion: 'no_apto',
    fechaInicio: dia(camila.desde), altaEstimada: dia(camila.alta), indicaciones: 'Esguince grado I. Reposo, hielo y vendaje funcional.',
  }, autor('medico'));
  await lesiones.darAlta(id.camila, esguince.id, dia(camila.alta));

  // Mensajes y notas de la nutricionista
  for (const [de, para, texto, minutosAtras] of MENSAJES) {
    await query('INSERT INTO mensajes (remitente_id, destinatario_id, texto, leido, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id[de], id[para], texto, minutosAtras > 400, new Date(Date.now() - minutosAtras * 60000).toISOString()]);
  }
  await query('INSERT INTO notas_nutricionista (user_id, nutricionista_id, nutricionista_nombre, texto, fecha) VALUES ($1, $2, $3, $4, $5)',
    [id.juanpablo, id.nutricion, 'Laura Méndez', 'Con la carga de esta semana necesitas más carbohidratos: añade arroz o pasta en el almuerzo y una fruta antes de entrenar.', new Date().toLocaleDateString('es-CO')]);

  // Citas: una pendiente para el médico (para confirmarla en la demo), una confirmada y una ya realizada
  const CITAS = [
    ['juanpablo', 'medico', -2, '09:00', 'presencial', 'Me molesta el gemelo después de los entrenos dobles.', 'pendiente', ''],
    ['mateo', 'medico', -6, '10:30', 'presencial', 'Revisión de la lesión de isquiotibiales.', 'confirmada', 'Trae la ecografía si te la hiciste.'],
    ['valeria', 'nutricion', -3, '16:00', 'virtual', 'Ajustar mis comidas para el torneo.', 'confirmada', ''],
    ['santiago', 'nutricion', 9, '17:30', 'virtual', 'Revisar mi plan de comidas.', 'realizada', ''],
  ];
  for (const [atleta, prof, dias, hora, modalidad, motivo, estado, respuesta] of CITAS) {
    await query('INSERT INTO citas (atleta_id, profesional_id, fecha, hora, modalidad, motivo, estado, respuesta) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id[atleta], id[prof], dia(dias), hora, modalidad, motivo, estado, respuesta]);
  }

  // Alerta de carga alta de Juan Pablo, y rangos y logros ya guardados (sin celebraciones pendientes)
  await require('../servidor/api/panel').revisarCargaAlta(id.juanpablo);
  for (const a of ATLETAS) {
    const lector = { id: id[a.alias], rol: 'Atleta' };
    await require('../servidor/api/rangos/rangos.service').obtener(id[a.alias], lector);
    await require('../servidor/api/logros/logros.service').obtener(id[a.alias], lector);
  }

  console.log(`✅ Club de demostración listo: ${STAFF.length + ATLETAS.length} cuentas @${DOMINIO} en "${EQUIPO}".`);
  return { creado: true, cuentas: [...STAFF, ...ATLETAS].map(c => correoDe(c.alias)) };
}

async function borrarClubDemo() {
  const { rows } = await query(`SELECT id FROM usuarios WHERE email LIKE '%@${DOMINIO}'`);
  const ids = rows.map(r => Number(r.id));
  if (ids.length) {
    const lista = ids.map((_, i) => `$${i + 1}`).join(', ');
    await query(`DELETE FROM alimentos_codigos WHERE creado_por IN (${lista})`, ids);
    await query(`DELETE FROM usuarios WHERE id IN (${lista})`, ids);
  }
  await query('DELETE FROM equipos WHERE nombre = $1', [EQUIPO]);
  console.log(`🗑  Club de demostración borrado (${ids.length} cuentas).`);
  return { borradas: ids.length };
}

module.exports = { crearClubDemo, borrarClubDemo, DOMINIO, EQUIPO };

// Ejecutado directamente: npm run club-demo [-- --borrar]
if (require.main === module) {
  const { setupDatabase } = require('../base-de-datos/setup');
  setupDatabase()
    .then(() => (process.argv.includes('--borrar') ? borrarClubDemo() : crearClubDemo()))
    .then(() => process.exit(0))
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
