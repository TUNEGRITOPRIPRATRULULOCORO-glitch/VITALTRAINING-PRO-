/**
 * Rutinas semanales por deporte y posición.
 *
 * Cada posición entrena lo que su juego le exige, según estudios de demandas físicas:
 *
 * FÚTBOL — GPS en partidos de liga profesional (Bortnik et al., Biology of Sport 2024):
 *   - Laterales: los que más distancia en sprint recorren.
 *   - Extremos: los que más aceleran y frenan en las transiciones.
 *   - Mediocampistas: los que más distancia total cubren por minuto.
 *   - Delanteros: los de mayor esfuerzo en la presión alta.
 *   - Defensas centrales: menor carga de carrera, pero aceleraciones/frenadas en transición
 *     defensiva y juego aéreo.
 *   - Porteros (estudios en la Premier League y revisión sistemática): poca distancia
 *     (~98 % del tiempo a baja intensidad) pero saltos, estiradas y esfuerzos explosivos.
 *   - Prevención para todos: el ejercicio Nórdico reduce lesiones de isquiotibiales y el
 *     Copenhague de aductores fortalece la ingle (consenso Ishøi et al., BJSM 2020;
 *     Harøy et al., AJSM 2017).
 *
 * BALONCESTO — revisión sistemática de 47 estudios (PMC12121883) y datos de partidos:
 *   - Bases y escoltas: más distancia, aceleraciones y frenadas.
 *   - Aleros: más carrera a alta velocidad.
 *   - Pívots: más saltos y contacto; frecuencia cardíaca más alta.
 *   - Prevención: equilibrio y aterrizaje reducen esguinces de tobillo; los programas
 *     neuromusculares (fuerza + core + agilidad) protegen la rodilla (revisión 2023).
 *
 * TENIS — individuales es más exigente que dobles en distancia, velocidad y pulso;
 *   el juego es intermitente con cambios de dirección. La debilidad en rotación externa
 *   del hombro dominante se asocia a historial de dolor (Moreno-Pérez, Fernandez-Fernandez
 *   et al., 2018), por eso todas las rutinas de tenis trabajan el manguito rotador.
 *
 * Los ejercicios con "evitar" se quitan si el atleta tiene esa condición en su perfil médico.
 */

// Series por defecto según el impacto; un ejercicio puede definir las suyas
const SERIES_DEFAULT = {
  bajo:  { series: 3, repeticiones: null, tiempo: '30-40 seg' },
  medio: { series: 3, repeticiones: 12,   tiempo: null },
  alto:  { series: 4, repeticiones: 10,   tiempo: null },
};

const RODILLA  = ['Condromalacia rotuliana', 'Lesión de menisco'];
const PIE      = ['Fascitis plantar', 'Tendinitis de Aquiles', 'Periostitis tibial (shin splints)'];
const TOBILLO  = ['Esguince de tobillo recurrente'];
const ESPALDA  = ['Hernia discal', 'Dolor lumbar crónico', 'Escoliosis'];
const CORAZON  = ['Arritmia cardíaca leve', 'Hipertensión arterial'];

const EJERCICIOS = {
  // ── Comunes ────────────────────────────────────────────────────────────────
  fuerzaTren: [
    { nombre: 'Sentadilla goblet', impacto: 'medio', evitar: [...RODILLA, 'Hernia discal'] },
    { nombre: 'Peso muerto rumano', impacto: 'alto', evitar: ESPALDA },
    { nombre: 'Zancada búlgara', impacto: 'medio', evitar: [...RODILLA, 'Tendinitis de Aquiles'] },
    { nombre: 'Hip thrust', impacto: 'bajo', evitar: [] },
    { nombre: 'Elevaciones de talón a una pierna', impacto: 'bajo', evitar: ['Tendinitis de Aquiles', 'Fascitis plantar'] },
    { nombre: 'Puente de glúteos', impacto: 'bajo', evitar: [] },
  ],
  fuerzaTronco: [
    { nombre: 'Plancha frontal', impacto: 'bajo', evitar: ['Hernia discal'] },
    { nombre: 'Plancha lateral', impacto: 'bajo', evitar: ['Escoliosis'] },
    { nombre: 'Dead bug', impacto: 'bajo', evitar: [] },
    { nombre: 'Pallof press con banda', impacto: 'bajo', evitar: [] },
    { nombre: 'Rollout con rueda abdominal', impacto: 'medio', evitar: ESPALDA },
  ],
  fuerzaSuperior: [
    { nombre: 'Flexiones de pecho', impacto: 'medio', evitar: [] },
    { nombre: 'Remo con mancuerna', impacto: 'medio', evitar: ['Hernia discal'] },
    { nombre: 'Press militar con mancuernas', impacto: 'medio', evitar: [] },
    { nombre: 'Dominadas asistidas', impacto: 'medio', evitar: [] },
  ],
  potencia: [
    { nombre: 'Salto con contramovimiento', impacto: 'alto', evitar: [...RODILLA, ...PIE], series: 4, repeticiones: 5 },
    { nombre: 'Saltos laterales (skater)', impacto: 'alto', evitar: [...TOBILLO, ...RODILLA], series: 3, repeticiones: 8 },
    { nombre: 'Saltos al cajón con aterrizaje suave', impacto: 'alto', evitar: [...RODILLA, ...PIE, 'Bursitis de cadera'], series: 4, repeticiones: 5 },
    { nombre: 'Lanzamiento de balón medicinal al frente', impacto: 'medio', evitar: ['Hernia discal'], series: 3, repeticiones: 8 },
  ],
  aerobico: [
    { nombre: 'Carrera continua 25 min', impacto: 'alto', evitar: [...PIE, 'Condromalacia rotuliana'], series: 1, repeticiones: null, tiempo: '25 min' },
    { nombre: 'Bicicleta estática 30 min', impacto: 'bajo', evitar: [], series: 1, tiempo: '30 min' },
    { nombre: 'Intervalos 4 × 4 min al 85-90 % (descanso 3 min)', impacto: 'alto', evitar: [...CORAZON, ...PIE], series: 4, repeticiones: null, tiempo: '4 min' },
    { nombre: 'Natación o elíptica 25 min', impacto: 'bajo', evitar: [], series: 1, tiempo: '25 min' },
  ],
  recuperacion: [
    { nombre: 'Movilidad de cadera y tobillo', impacto: 'bajo', evitar: [], series: 2, tiempo: '5 min' },
    { nombre: 'Foam roller en piernas', impacto: 'bajo', evitar: [], series: 1, tiempo: '8 min' },
    { nombre: 'Estiramiento de isquiotibiales y cuádriceps', impacto: 'bajo', evitar: [] },
    { nombre: 'Caminata o bici suave 20 min', impacto: 'bajo', evitar: [], series: 1, tiempo: '20 min' },
    { nombre: 'Respiración diafragmática', impacto: 'bajo', evitar: [], series: 1, tiempo: '5 min' },
  ],

  // ── Fútbol ─────────────────────────────────────────────────────────────────
  futPrevencion: [
    { nombre: 'Nórdico de isquiotibiales', impacto: 'medio', evitar: ['Tendinitis crónica'], series: 3, repeticiones: 6 },
    { nombre: 'Copenhague de aductores', impacto: 'medio', evitar: ['Pubalgia deportiva'], series: 3, repeticiones: 8 },
    { nombre: 'Equilibrio a una pierna con pase', impacto: 'bajo', evitar: [] },
    { nombre: 'Aterrizaje controlado tras salto', impacto: 'medio', evitar: [...RODILLA, ...TOBILLO], series: 3, repeticiones: 6 },
  ],
  futSprint: [
    { nombre: 'Sprints repetidos 6 × 30 m', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 6, repeticiones: 1 },
    { nombre: 'Aceleraciones 5-10 m', impacto: 'alto', evitar: ['Tendinitis de Aquiles', 'Fascitis plantar'], series: 6, repeticiones: 1 },
    { nombre: 'Sprint con cambio de dirección 5-10-5', impacto: 'alto', evitar: [...TOBILLO, ...RODILLA], series: 5, repeticiones: 1 },
    { nombre: 'Frenadas en 3 pasos desde carrera', impacto: 'medio', evitar: RODILLA, series: 4, repeticiones: 4 },
  ],
  futTecnica: [
    { nombre: 'Rondo 4 contra 2', impacto: 'bajo', evitar: [], series: 4, tiempo: '3 min' },
    { nombre: 'Pases al primer toque en triángulo', impacto: 'bajo', evitar: [] },
    { nombre: 'Conducción con cambio de dirección', impacto: 'medio', evitar: TOBILLO },
    { nombre: 'Juego reducido 4 contra 4', impacto: 'alto', evitar: CORAZON, series: 4, tiempo: '4 min' },
  ],
  futDefensa: [
    { nombre: 'Duelos 1 contra 1 defensivos', impacto: 'medio', evitar: TOBILLO },
    { nombre: 'Remate de cabeza tras salto', impacto: 'alto', evitar: [...RODILLA, 'Migraña crónica'], series: 3, repeticiones: 8 },
    { nombre: 'Despejes largos con ambas piernas', impacto: 'medio', evitar: ['Pubalgia deportiva'] },
    { nombre: 'Repliegue y basculación en línea', impacto: 'medio', evitar: [] },
  ],
  futBanda: [
    { nombre: 'Centros desde la banda tras carrera', impacto: 'medio', evitar: ['Pubalgia deportiva'] },
    { nombre: 'Desborde 1 contra 1 en banda', impacto: 'medio', evitar: TOBILLO },
    { nombre: 'Subida y bajada por la banda (ida y vuelta)', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 6, repeticiones: 1 },
    { nombre: 'Pase filtrado al espacio', impacto: 'bajo', evitar: [] },
  ],
  futAtaque: [
    { nombre: 'Definición tras desmarque', impacto: 'medio', evitar: ['Pubalgia deportiva'] },
    { nombre: 'Remate de primera', impacto: 'medio', evitar: ['Pubalgia deportiva'] },
    { nombre: 'Presión tras pérdida (6 seg)', impacto: 'alto', evitar: CORAZON, series: 6, repeticiones: 1 },
    { nombre: 'Tiro con pierna no dominante', impacto: 'medio', evitar: ['Pubalgia deportiva'] },
  ],
  futPortero: [
    { nombre: 'Estiradas laterales sobre colchoneta', impacto: 'alto', evitar: ['Hernia discal', 'Bursitis de cadera'], series: 3, repeticiones: 6 },
    { nombre: 'Reacción a balón rebotado en pared', impacto: 'medio', evitar: [] },
    { nombre: 'Salto vertical y blocaje alto', impacto: 'alto', evitar: [...RODILLA, ...PIE], series: 4, repeticiones: 5 },
    { nombre: 'Desplazamiento lateral y estirada', impacto: 'alto', evitar: TOBILLO, series: 4, repeticiones: 6 },
    { nombre: 'Saques con mano y con pie', impacto: 'bajo', evitar: [] },
  ],

  // ── Baloncesto ─────────────────────────────────────────────────────────────
  basPrevencion: [
    { nombre: 'Equilibrio a una pierna sobre cojín', impacto: 'bajo', evitar: [] },
    { nombre: 'Aterrizaje a dos y a una pierna', impacto: 'medio', evitar: [...RODILLA, ...TOBILLO], series: 3, repeticiones: 6 },
    { nombre: 'Sentadilla a una pierna al banco', impacto: 'medio', evitar: RODILLA },
    { nombre: 'Movilidad y fuerza de tobillo con banda', impacto: 'bajo', evitar: [] },
  ],
  basAgilidad: [
    { nombre: 'Desplazamiento defensivo lateral', impacto: 'medio', evitar: TOBILLO, series: 4, tiempo: '20 seg' },
    { nombre: 'Arranques y frenadas en media cancha', impacto: 'alto', evitar: [...RODILLA, ...PIE], series: 6, repeticiones: 1 },
    { nombre: 'Carrera de lado a lado de la cancha', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 5, repeticiones: 1 },
    { nombre: 'Cambios de dirección con reacción', impacto: 'alto', evitar: [...TOBILLO, ...RODILLA], series: 5, repeticiones: 1 },
  ],
  basExteriores: [
    { nombre: 'Dribbling con ambas manos en zigzag', impacto: 'medio', evitar: TOBILLO },
    { nombre: 'Tiro tras bote (pull-up)', impacto: 'medio', evitar: [], series: 4, repeticiones: 10 },
    { nombre: 'Pick and roll — lectura y pase', impacto: 'bajo', evitar: [] },
    { nombre: 'Tiro de tres en 5 posiciones', impacto: 'bajo', evitar: [], series: 5, repeticiones: 10 },
  ],
  basAlero: [
    { nombre: 'Penetración y finalización con ambas manos', impacto: 'medio', evitar: TOBILLO },
    { nombre: 'Tiro tras salida de bloqueo', impacto: 'medio', evitar: [], series: 4, repeticiones: 10 },
    { nombre: 'Transición rápida 3 contra 2', impacto: 'alto', evitar: CORAZON, series: 5, repeticiones: 1 },
    { nombre: 'Rebote ofensivo y segunda opción', impacto: 'alto', evitar: RODILLA },
  ],
  basPivot: [
    { nombre: 'Juego de pies en el poste bajo', impacto: 'medio', evitar: TOBILLO },
    { nombre: 'Gancho con ambas manos', impacto: 'bajo', evitar: [], series: 4, repeticiones: 10 },
    { nombre: 'Rebote con contacto y bloqueo', impacto: 'alto', evitar: [...RODILLA, 'Hernia discal'] },
    { nombre: 'Saltos repetidos al aro (tip drill)', impacto: 'alto', evitar: [...RODILLA, ...PIE], series: 4, repeticiones: 8 },
  ],

  // ── Tenis ──────────────────────────────────────────────────────────────────
  tenHombro: [
    { nombre: 'Rotación externa de hombro con banda', impacto: 'bajo', evitar: [], series: 3, repeticiones: 15 },
    { nombre: 'Rotación interna de hombro con banda', impacto: 'bajo', evitar: [], series: 3, repeticiones: 15 },
    { nombre: 'Y-T-W escapular boca abajo', impacto: 'bajo', evitar: [], series: 2, repeticiones: 10 },
    { nombre: 'Extensión excéntrica de muñeca', impacto: 'bajo', evitar: [], series: 3, repeticiones: 15 },
  ],
  tenRotacion: [
    { nombre: 'Lanzamiento rotacional de balón medicinal', impacto: 'medio', evitar: ['Hernia discal'], series: 3, repeticiones: 8 },
    { nombre: 'Leñador con banda (diagonal)', impacto: 'bajo', evitar: ['Hernia discal'] },
    { nombre: 'Plancha lateral con rotación', impacto: 'bajo', evitar: ['Escoliosis'] },
  ],
  tenDesplazamiento: [
    { nombre: 'Split-step y salida a las esquinas', impacto: 'alto', evitar: [...TOBILLO, ...PIE], series: 6, repeticiones: 1 },
    { nombre: 'Spider drill (5 conos)', impacto: 'alto', evitar: [...TOBILLO, ...RODILLA], series: 4, repeticiones: 1 },
    { nombre: 'Sprints repetidos 10 × 10 m', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 10, repeticiones: 1 },
    { nombre: 'Desplazamiento lateral con recuperación al centro', impacto: 'medio', evitar: TOBILLO, series: 4, tiempo: '30 seg' },
  ],
  tenIndividual: [
    { nombre: 'Peloteo cruzado de fondo', impacto: 'medio', evitar: ['Epicondilitis (codo de tenista)'], series: 4, tiempo: '5 min' },
    { nombre: 'Saque — 40 pelotas a zonas', impacto: 'medio', evitar: [], series: 1, repeticiones: 40 },
    { nombre: 'Resto de saque', impacto: 'medio', evitar: [], series: 3, repeticiones: 10 },
    { nombre: 'Puntos de 2 golpes + defensa', impacto: 'alto', evitar: CORAZON, series: 6, tiempo: '1 min' },
  ],
  tenDobles: [
    { nombre: 'Voleas rápidas en la red', impacto: 'medio', evitar: ['Epicondilitis (codo de tenista)'], series: 4, repeticiones: 15 },
    { nombre: 'Smash tras globo', impacto: 'medio', evitar: [], series: 3, repeticiones: 8 },
    { nombre: 'Saque y subida a la red', impacto: 'medio', evitar: [], series: 4, repeticiones: 6 },
    { nombre: 'Reacción en la red (pelotas lanzadas)', impacto: 'bajo', evitar: [], series: 3, tiempo: '45 seg' },
  ],
};

// Plantilla de semana: lunes a domingo, con un día de recuperación y uno de descanso
function semana(lunes, martes, jueves, viernes, sabado = ['Partido / Competición', []], tipoMiercoles = 'Recuperación activa') {
  return [
    { dia: 'Lunes',     tipo: lunes[0],   grupos: lunes[1] },
    { dia: 'Martes',    tipo: martes[0],  grupos: martes[1] },
    { dia: 'Miércoles', tipo: tipoMiercoles, grupos: ['recuperacion'] },
    { dia: 'Jueves',    tipo: jueves[0],  grupos: jueves[1] },
    { dia: 'Viernes',   tipo: viernes[0], grupos: viernes[1] },
    { dia: 'Sábado',    tipo: sabado[0],  grupos: sabado[1] },
    { dia: 'Domingo',   tipo: 'Descanso completo', grupos: [] },
  ];
}

const RUTINAS = {
  'Fútbol': {
    Portero: {
      enfoque: 'Potencia y reacción: pocas carreras, pero saltos, estiradas y esfuerzos explosivos deciden el partido.',
      semana: semana(
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Técnica de portero', ['futPortero']],
        ['Reflejos + Core', ['futPortero', 'fuerzaTronco']],
        ['Prevención + Superior', ['futPrevencion', 'fuerzaSuperior']],
        ['Partido / Simulacro', ['futPortero']]
      )
    },
    'Defensa Central': {
      enfoque: 'Fuerza, juego aéreo y frenadas: menos kilómetros que el resto, pero duelos y transiciones defensivas.',
      semana: semana(
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Defensa + Juego aéreo', ['futDefensa', 'futTecnica']],
        ['Frenadas + Prevención', ['futSprint', 'futPrevencion']],
        ['Core + Superior', ['fuerzaTronco', 'fuerzaSuperior']],
        ['Partido / Simulacro', ['futTecnica']]
      )
    },
    Lateral: {
      enfoque: 'Sprint repetido: los laterales son los que más distancia recorren a máxima velocidad.',
      semana: semana(
        ['Sprint + Prevención', ['futSprint', 'futPrevencion']],
        ['Banda + Técnica', ['futBanda', 'futTecnica']],
        ['Aeróbico + Core', ['aerobico', 'fuerzaTronco']],
        ['Fuerza + Banda', ['fuerzaTren', 'futBanda']],
        ['Partido / Simulacro', ['futTecnica']]
      )
    },
    Mediocampista: {
      enfoque: 'Resistencia: el mediocampista es quien más distancia total cubre por minuto.',
      semana: semana(
        ['Aeróbico + Core', ['aerobico', 'fuerzaTronco']],
        ['Técnica + Juego reducido', ['futTecnica']],
        ['Fuerza + Prevención', ['fuerzaTren', 'futPrevencion']],
        ['Sprint + Técnica', ['futSprint', 'futTecnica']],
        ['Partido / Simulacro', ['futTecnica']]
      )
    },
    Extremo: {
      enfoque: 'Aceleración y cambio de ritmo: los extremos son los que más aceleran y frenan.',
      semana: semana(
        ['Aceleración + Prevención', ['futSprint', 'futPrevencion']],
        ['Regate + Centros', ['futBanda', 'futTecnica']],
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Sprint + Finalización', ['futSprint', 'futAtaque']],
        ['Partido / Simulacro', ['futTecnica']]
      )
    },
    Delantero: {
      enfoque: 'Explosividad y presión: el delantero lidera la presión alta y define en pocos metros.',
      semana: semana(
        ['Potencia + Fuerza', ['potencia', 'fuerzaTren']],
        ['Finalización', ['futAtaque', 'futTecnica']],
        ['Aceleración + Prevención', ['futSprint', 'futPrevencion']],
        ['Core + Superior', ['fuerzaTronco', 'fuerzaSuperior']],
        ['Partido / Simulacro', ['futAtaque']]
      )
    },
  },
  'Baloncesto': {
    Base: {
      enfoque: 'Agilidad y frenadas: los bases recorren más distancia y hacen más aceleraciones y frenadas.',
      semana: semana(
        ['Agilidad + Prevención', ['basAgilidad', 'basPrevencion']],
        ['Manejo + Tiro', ['basExteriores']],
        ['Fuerza + Core', ['fuerzaTren', 'fuerzaTronco']],
        ['Agilidad + Tiro', ['basAgilidad', 'basExteriores']],
        ['Partido / Scrimmage', ['basExteriores']]
      )
    },
    Escolta: {
      enfoque: 'Velocidad y tiro: como el base, mucho arranque y frenada, con más volumen de tiro.',
      semana: semana(
        ['Agilidad + Prevención', ['basAgilidad', 'basPrevencion']],
        ['Tiro exterior', ['basExteriores']],
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Transición + Tiro', ['basAlero', 'basExteriores']],
        ['Partido / Scrimmage', ['basExteriores']]
      )
    },
    Alero: {
      enfoque: 'Carrera a alta velocidad y versatilidad: los aleros acumulan más carrera rápida.',
      semana: semana(
        ['Potencia + Prevención', ['potencia', 'basPrevencion']],
        ['Juego de alero', ['basAlero']],
        ['Fuerza + Core', ['fuerzaTren', 'fuerzaTronco']],
        ['Intervalos + Transición', ['aerobico', 'basAlero']],
        ['Partido / Scrimmage', ['basAlero']]
      )
    },
    'Pívot': {
      enfoque: 'Fuerza y salto: el pívot salta más y juega con contacto; tobillo y rodilla bien protegidos.',
      semana: semana(
        ['Fuerza + Superior', ['fuerzaTren', 'fuerzaSuperior']],
        ['Juego interior', ['basPivot']],
        ['Saltos + Prevención', ['potencia', 'basPrevencion']],
        ['Core + Juego interior', ['fuerzaTronco', 'basPivot']],
        ['Partido / Scrimmage', ['basPivot']]
      )
    },
  },
  'Tenis': {
    Individuales: {
      enfoque: 'Sprints repetidos y resistencia: individuales exige más distancia, velocidad y pulso que dobles.',
      semana: semana(
        ['Desplazamiento + Hombro', ['tenDesplazamiento', 'tenHombro']],
        ['Técnica de fondo', ['tenIndividual']],
        ['Fuerza + Rotación', ['fuerzaTren', 'tenRotacion']],
        ['Intervalos + Hombro', ['aerobico', 'tenHombro']],
        ['Partido / Torneo', ['tenIndividual']]
      )
    },
    Dobles: {
      enfoque: 'Reacción y red: puntos más cortos, más voleas y primer paso explosivo.',
      semana: semana(
        ['Reacción + Hombro', ['tenDobles', 'tenHombro']],
        ['Desplazamiento corto', ['tenDesplazamiento']],
        ['Fuerza + Rotación', ['fuerzaTren', 'tenRotacion']],
        ['Red + Potencia', ['tenDobles', 'potencia']],
        ['Partido / Torneo', ['tenDobles']]
      )
    },
  },
};

// Opciones del formulario que no son una posición de juego, sino la mano dominante
RUTINAS['Tenis']['Right-handed'] = RUTINAS['Tenis'].Individuales;
RUTINAS['Tenis']['Left-handed']  = RUTINAS['Tenis'].Individuales;

const POR_DEFECTO = { 'Fútbol': 'Mediocampista', 'Baloncesto': 'Alero', 'Tenis': 'Individuales' };

const NOTAS_DEPORTE = {
  'Fútbol':     '⚽ Haz el Nórdico y el Copenhague todas las semanas: son los ejercicios con más evidencia para evitar lesiones de isquiotibiales e ingle.',
  'Baloncesto': '🏀 Aterriza siempre con rodillas flexionadas y alineadas; el trabajo de equilibrio reduce los esguinces de tobillo.',
  'Tenis':      '🎾 No te saltes el trabajo de hombro: la debilidad en rotación externa del brazo dominante se asocia a dolor de hombro.',
};

function filtrarEjercicios(grupo, condiciones) {
  return (EJERCICIOS[grupo] || [])
    .filter(e => !e.evitar.some(ev => condiciones.some(c => c.includes(ev) || ev.includes(c.split(' ')[0]))))
    .slice(0, 4)
    .map(e => {
      const base = SERIES_DEFAULT[e.impacto];
      return {
        nombre: e.nombre,
        impacto: e.impacto,
        series: e.series ?? base.series,
        // Si el ejercicio se mide por tiempo, no hereda las repeticiones por defecto
        repeticiones: e.repeticiones !== undefined ? e.repeticiones : (e.tiempo !== undefined ? null : base.repeticiones),
        tiempo: e.tiempo !== undefined ? e.tiempo : base.tiempo,
      };
    });
}

function notasPorCondicion(condiciones) {
  const notas = [];
  const tiene = texto => condiciones.some(c => c.includes(texto));
  if (tiene('Asma'))
    notas.push('🫁 Calentamiento prolongado de 15 min antes de cualquier actividad intensa. Lleva inhalador.');
  if (tiene('rodilla') || tiene('menisco') || tiene('Condromalacia'))
    notas.push('🦵 Evita impacto directo en rodilla. Prioriza bicicleta y elíptica sobre correr.');
  if (tiene('lumbar') || tiene('Hernia discal') || tiene('Escoliosis'))
    notas.push('🔙 Sin pesos muertos ni movimientos que hiperextiendan la columna.');
  if (tiene('Aquiles') || tiene('plantar') || tiene('tibial'))
    notas.push('🦶 Usa calzado con soporte. Evita superficies duras. Estira siempre pantorrillas.');
  if (tiene('Arritmia') || tiene('cardíaco') || tiene('Hipertensión'))
    notas.push('❤️ Monitorea frecuencia cardíaca. No superar 75% FC máxima sin autorización médica.');
  if (tiene('Diabetes'))
    notas.push('🩸 Mide glucosa antes de entrenar. Ten snack rápido disponible (glucosa, jugo).');
  if (tiene('Epicondilitis'))
    notas.push('💪 Codo de tenista: la extensión excéntrica de muñeca ayuda, pero sin dolor por encima de 3/10.');
  return notas;
}

/** Rutina semanal según deporte, posición y condiciones médicas. */
function generarRutina(perfilMedico, posicion, deporte = 'Fútbol') {
  const { condiciones = [] } = perfilMedico;
  const deporteValido = RUTINAS[deporte] ? deporte : 'Fútbol';
  const plantillas = RUTINAS[deporteValido];
  const posicionValida = plantillas[posicion] ? posicion : POR_DEFECTO[deporteValido];
  const plantilla = plantillas[posicionValida];

  const porCondicion = notasPorCondicion(condiciones);
  const notas = [
    `🎯 ${plantilla.enfoque}`,
    NOTAS_DEPORTE[deporteValido],
    ...(porCondicion.length ? porCondicion : ['✅ Sin restricciones especiales. Sigue el plan completo con buena técnica.']),
  ];

  return {
    descripcion: `Rutina de ${deporteValido.toLowerCase()} para ${posicionValida}${condiciones.length ? ' · adaptada a condiciones' : ''}`,
    deporte: deporteValido,
    posicion: posicionValida,
    semana: plantilla.semana.map(sesion => ({
      dia: sesion.dia,
      tipo: sesion.tipo,
      ejercicios: sesion.grupos.flatMap(g => filtrarEjercicios(g, condiciones)),
      descanso: sesion.grupos.length === 0
    })),
    notas
  };
}

module.exports = { generarRutina, RUTINAS, EJERCICIOS };
