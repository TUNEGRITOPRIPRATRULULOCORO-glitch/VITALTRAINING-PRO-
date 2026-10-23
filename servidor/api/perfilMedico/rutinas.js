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
 * BÉISBOL — el lanzamiento es el gesto más exigente para hombro y codo: el programa
 *   "Thrower's Ten" (Wilk et al.) fortalece manguito rotador y escápula, y las guías Pitch Smart
 *   (MLB / USA Baseball) limitan lanzamientos y fijan descansos. El receptor pasa el partido en
 *   cuclillas (cadera y rodilla); cuadro interior: reacción y primer paso; jardineros: sprint y
 *   lanzamiento largo. Todos: sprint de 27 m (de base a base) y potencia rotacional para batear.
 *
 * ATLETISMO — velocistas: la lesión más frecuente es la de isquiotibiales, por eso el Nórdico;
 *   medio fondo: series aeróbicas + fuerza, que mejora la economía de carrera (revisión
 *   sistemática de Blagrove et al., Sports Medicine 2018); saltos: pliometría y técnica de batida;
 *   lanzamientos: potencia rotacional y de cadera (lanzamientos de balón medicinal, cargadas).
 *
 * RUNNING — distribución de la intensidad ~80 % suave / 20 % intenso (Seiler, 2010) y 2 días de
 *   fuerza (Blagrove 2018). La fuerza de pantorrilla y cadera protege de las lesiones típicas del
 *   corredor; el volumen sube poco a poco.
 *
 * NATACIÓN — el "hombro del nadador" es la lesión más común: el trabajo en seco del manguito
 *   rotador y la escápula es parte fija. Velocistas (50-100 m): potencia, salidas y virajes;
 *   fondistas (400 m o más): volumen aeróbico y técnica de respiración.
 *
 * BOXEO — los asaltos son de 3 min con 1 min de pausa, así que el acondicionamiento usa esa misma
 *   estructura. La potencia del golpe nace de piernas y tronco (trabajo rotacional), y el cuello
 *   fuerte ayuda a absorber impactos. Recreativo: misma base, sin sparring.
 *
 * ESTAR EN FORMA — guías de la OMS (2020): 150-300 min de actividad aeróbica moderada a la
 *   semana y fuerza de los grandes grupos musculares al menos 2 días. El principiante empieza
 *   con ejercicios de bajo impacto.
 *
 * DÍA DE PARTIDO — la semana se ordena alrededor del día de competición que elige el atleta:
 *   la víspera es suave (y de recarga de carbohidratos en el plan de comidas) y el día siguiente
 *   es de descanso. Dormir más los días previos mejora el rendimiento (Mah et al., Sleep 2011).
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

  // ── Béisbol ────────────────────────────────────────────────────────────────
  beiHombro: [
    { nombre: 'Rotación externa de hombro con banda', impacto: 'bajo', evitar: [], series: 3, repeticiones: 15 },
    { nombre: 'Y-T-W escapular boca abajo', impacto: 'bajo', evitar: [], series: 2, repeticiones: 10 },
    { nombre: 'Flexiones escapulares (plus)', impacto: 'bajo', evitar: [], series: 2, repeticiones: 12 },
    { nombre: 'Flexión y extensión de muñeca con mancuerna', impacto: 'bajo', evitar: [], series: 2, repeticiones: 15 },
  ],
  beiLanzador: [
    { nombre: 'Lanzamiento progresivo (long toss) hasta 40 m', impacto: 'medio', evitar: ['Epicondilitis (codo de tenista)'], series: 1, tiempo: '15 min' },
    { nombre: 'Bullpen controlado (máx. 25 lanzamientos)', impacto: 'alto', evitar: ['Epicondilitis (codo de tenista)'], series: 1, repeticiones: 25 },
    { nombre: 'Drill de separación cadera-hombro con toalla', impacto: 'bajo', evitar: [] },
    { nombre: 'Fildeo del lanzador y cobertura de primera', impacto: 'medio', evitar: TOBILLO },
  ],
  beiReceptor: [
    { nombre: 'Bloqueos de pelota en el suelo', impacto: 'medio', evitar: RODILLA },
    { nombre: 'Tiro rápido a segunda desde cuclillas', impacto: 'medio', evitar: [...RODILLA, 'Epicondilitis (codo de tenista)'], series: 3, repeticiones: 8 },
    { nombre: 'Movilidad de cadera en cuclillas profundas', impacto: 'bajo', evitar: ['Bursitis de cadera'] },
    { nombre: 'Recepción y enmarcado de lanzamientos', impacto: 'bajo', evitar: [] },
  ],
  beiDefensa: [
    { nombre: 'Rodados a ambos lados y tiro a primera', impacto: 'medio', evitar: TOBILLO, series: 4, repeticiones: 8 },
    { nombre: 'Doble play: recepción y transferencia rápida', impacto: 'medio', evitar: [] },
    { nombre: 'Elevados con desplazamiento hacia atrás', impacto: 'medio', evitar: TOBILLO, series: 3, repeticiones: 8 },
    { nombre: 'Tiro largo del jardín al cuadro', impacto: 'medio', evitar: ['Epicondilitis (codo de tenista)'], series: 3, repeticiones: 6 },
  ],
  beiBateo: [
    { nombre: 'Bateo en tee por zonas', impacto: 'bajo', evitar: [], series: 4, repeticiones: 10 },
    { nombre: 'Soft toss frontal y lateral', impacto: 'bajo', evitar: [], series: 3, repeticiones: 10 },
    { nombre: 'Lanzamiento rotacional de balón medicinal', impacto: 'medio', evitar: ['Hernia discal'], series: 3, repeticiones: 8 },
    { nombre: 'Toque de bola (bunt) a ambas bandas', impacto: 'bajo', evitar: [] },
  ],
  beiCarrera: [
    { nombre: 'Sprint de base a base (27 m)', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 6, repeticiones: 1 },
    { nombre: 'Salida de robo de base', impacto: 'alto', evitar: ['Tendinitis de Aquiles', 'Fascitis plantar'], series: 6, repeticiones: 1 },
    { nombre: 'Giro en la base y aceleración', impacto: 'medio', evitar: TOBILLO, series: 4, repeticiones: 1 },
  ],

  // ── Atletismo ──────────────────────────────────────────────────────────────
  atlTecnica: [
    { nombre: 'Skipping A y B', impacto: 'medio', evitar: PIE, series: 3, tiempo: '20 m' },
    { nombre: 'Talones al glúteo y carrera con piernas rectas', impacto: 'medio', evitar: PIE, series: 3, tiempo: '20 m' },
    { nombre: 'Progresivos 4 × 80 m', impacto: 'medio', evitar: PIE, series: 4, repeticiones: 1 },
  ],
  atlVelocidad: [
    { nombre: 'Salidas de tacos o de pie 6 × 20 m', impacto: 'alto', evitar: ['Tendinitis de Aquiles', 'Fascitis plantar'], series: 6, repeticiones: 1 },
    { nombre: 'Sprint lanzado 4 × 30 m', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 4, repeticiones: 1 },
    { nombre: 'Resistencia a la velocidad 3 × 150 m', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 3, repeticiones: 1 },
    { nombre: 'Nórdico de isquiotibiales', impacto: 'medio', evitar: ['Tendinitis crónica'], series: 3, repeticiones: 6 },
  ],
  atlFondo: [
    { nombre: 'Series 6 × 800 m a ritmo de 5K (pausa 2 min)', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 6, repeticiones: 1 },
    { nombre: 'Fartlek 30 min', impacto: 'medio', evitar: PIE, series: 1, tiempo: '30 min' },
    { nombre: 'Rodaje suave 40 min', impacto: 'medio', evitar: [...PIE, 'Condromalacia rotuliana'], series: 1, tiempo: '40 min' },
  ],
  atlSaltos: [
    { nombre: 'Multisaltos horizontales (bounding)', impacto: 'alto', evitar: [...RODILLA, ...PIE], series: 4, repeticiones: 6 },
    { nombre: 'Técnica de batida con carrera corta', impacto: 'alto', evitar: [...RODILLA, ...TOBILLO], series: 6, repeticiones: 1 },
    { nombre: 'Saltos al cajón con aterrizaje suave', impacto: 'alto', evitar: [...RODILLA, ...PIE, 'Bursitis de cadera'], series: 4, repeticiones: 5 },
    { nombre: 'Sentadilla isométrica en pared', impacto: 'bajo', evitar: [], series: 3, tiempo: '40 seg' },
  ],
  atlLanzamientos: [
    { nombre: 'Lanzamiento de balón medicinal por encima de la cabeza', impacto: 'medio', evitar: ['Hernia discal'], series: 4, repeticiones: 6 },
    { nombre: 'Lanzamiento rotacional de balón medicinal', impacto: 'medio', evitar: ['Hernia discal'], series: 3, repeticiones: 8 },
    { nombre: 'Cargada de potencia (técnica con barra ligera)', impacto: 'alto', evitar: ESPALDA, series: 4, repeticiones: 4 },
    { nombre: 'Técnica de giro o desplazamiento sin implemento', impacto: 'bajo', evitar: [] },
  ],

  // ── Running ────────────────────────────────────────────────────────────────
  runSuave: [
    { nombre: 'Rodaje suave (puedes hablar mientras corres)', impacto: 'medio', evitar: [...PIE, 'Condromalacia rotuliana'], series: 1, tiempo: '35-45 min' },
    { nombre: 'Rectas progresivas 6 × 20 seg', impacto: 'medio', evitar: PIE, series: 6, tiempo: '20 seg' },
  ],
  runCalidad: [
    { nombre: 'Intervalos 5 × 1 km a ritmo de 10K (pausa 2 min)', impacto: 'alto', evitar: [...PIE, ...CORAZON], series: 5, repeticiones: 1 },
    { nombre: 'Cuestas 8 × 60 seg', impacto: 'alto', evitar: ['Tendinitis de Aquiles', ...CORAZON], series: 8, tiempo: '60 seg' },
    { nombre: 'Tempo 20 min a ritmo cómodamente duro', impacto: 'alto', evitar: CORAZON, series: 1, tiempo: '20 min' },
  ],
  runFuerza: [
    { nombre: 'Elevaciones de talón a una pierna', impacto: 'bajo', evitar: ['Tendinitis de Aquiles', 'Fascitis plantar'], series: 3, repeticiones: 15 },
    { nombre: 'Subida al cajón (step-up)', impacto: 'medio', evitar: RODILLA },
    { nombre: 'Peso muerto a una pierna', impacto: 'medio', evitar: ESPALDA },
    { nombre: 'Abducción de cadera con banda (monster walk)', impacto: 'bajo', evitar: [], series: 3, tiempo: '30 seg' },
  ],
  runLargo: [
    { nombre: 'Tirada larga a ritmo suave', impacto: 'alto', evitar: [...PIE, 'Condromalacia rotuliana'], series: 1, tiempo: '60-120 min' },
    { nombre: 'Bicicleta suave 60 min (si no puedes correr)', impacto: 'bajo', evitar: [], series: 1, tiempo: '60 min' },
  ],

  // ── Natación ───────────────────────────────────────────────────────────────
  natSeco: [
    { nombre: 'Rotación externa de hombro con banda', impacto: 'bajo', evitar: [], series: 3, repeticiones: 15 },
    { nombre: 'Jalón al pecho o dominadas asistidas', impacto: 'medio', evitar: [] },
    { nombre: 'Y-T-W escapular boca abajo', impacto: 'bajo', evitar: [], series: 2, repeticiones: 10 },
    { nombre: 'Plancha en posición de flecha (streamline)', impacto: 'bajo', evitar: ['Hernia discal'], series: 3, tiempo: '30 seg' },
  ],
  natVelocidad: [
    { nombre: 'Sprints 8 × 25 m (pausa 45 seg)', impacto: 'alto', evitar: CORAZON, series: 8, repeticiones: 1 },
    { nombre: 'Salidas desde el poyete', impacto: 'medio', evitar: ['Hernia discal'], series: 6, repeticiones: 1 },
    { nombre: 'Virajes rápidos', impacto: 'medio', evitar: [], series: 6, repeticiones: 1 },
    { nombre: 'Patada con tabla 6 × 25 m rápido', impacto: 'medio', evitar: [], series: 6, repeticiones: 1 },
  ],
  natFondo: [
    { nombre: 'Series 10 × 100 m aeróbico (pausa 15 seg)', impacto: 'medio', evitar: [], series: 10, repeticiones: 1 },
    { nombre: '400 m continuos con respiración cada 3 brazadas', impacto: 'medio', evitar: [], series: 2, repeticiones: 1 },
    { nombre: 'Pull buoy 4 × 200 m', impacto: 'medio', evitar: [], series: 4, repeticiones: 1 },
  ],
  natTecnica: [
    { nombre: 'Técnica: brazada con puño cerrado', impacto: 'bajo', evitar: [], series: 4, tiempo: '50 m' },
    { nombre: 'Técnica: punto muerto (catch-up)', impacto: 'bajo', evitar: [], series: 4, tiempo: '50 m' },
    { nombre: 'Nado suave de recuperación', impacto: 'bajo', evitar: [], series: 1, tiempo: '10 min' },
  ],

  // ── Boxeo ──────────────────────────────────────────────────────────────────
  boxTecnica: [
    { nombre: 'Sombra (shadow boxing)', impacto: 'medio', evitar: [], series: 3, tiempo: '3 min' },
    { nombre: 'Saco: combinaciones de 3-4 golpes', impacto: 'alto', evitar: CORAZON, series: 4, tiempo: '3 min' },
    { nombre: 'Manoplas con el entrenador', impacto: 'alto', evitar: CORAZON, series: 3, tiempo: '3 min' },
    { nombre: 'Defensa: esquivas y bloqueos', impacto: 'medio', evitar: [], series: 3, tiempo: '2 min' },
  ],
  boxAcondicionamiento: [
    { nombre: 'Comba (saltar la cuerda)', impacto: 'medio', evitar: [...PIE, ...TOBILLO], series: 3, tiempo: '3 min' },
    { nombre: 'Intervalos 30 seg fuerte / 30 seg suave', impacto: 'alto', evitar: CORAZON, series: 6, tiempo: '1 min' },
    { nombre: 'Burpees', impacto: 'alto', evitar: [...RODILLA, ...ESPALDA], series: 3, repeticiones: 10 },
    { nombre: 'Bicicleta estática por asaltos (3 min / 1 min)', impacto: 'bajo', evitar: [], series: 4, tiempo: '3 min' },
  ],
  boxFuerza: [
    { nombre: 'Lanzamiento rotacional de balón medicinal', impacto: 'medio', evitar: ['Hernia discal'], series: 3, repeticiones: 8 },
    { nombre: 'Press de hombro a un brazo con mina (landmine)', impacto: 'medio', evitar: [] },
    { nombre: 'Isométricos de cuello con la mano', impacto: 'bajo', evitar: [], series: 2, tiempo: '15 seg' },
    { nombre: 'Flexiones explosivas', impacto: 'alto', evitar: [], series: 3, repeticiones: 6 },
  ],
  boxSparring: [
    { nombre: 'Sparring técnico controlado', impacto: 'alto', evitar: [...CORAZON, 'Migraña crónica'], series: 4, tiempo: '3 min' },
    { nombre: 'Trabajo de distancia con compañero (sin golpes a la cabeza)', impacto: 'medio', evitar: [], series: 3, tiempo: '3 min' },
  ],

  // ── Estar en forma ─────────────────────────────────────────────────────────
  fitBase: [
    { nombre: 'Sentarse y levantarse de una silla', impacto: 'bajo', evitar: [], series: 3, repeticiones: 12 },
    { nombre: 'Flexiones con las manos en la pared o una mesa', impacto: 'bajo', evitar: [], series: 3, repeticiones: 10 },
    { nombre: 'Remo con banda elástica', impacto: 'bajo', evitar: [], series: 3, repeticiones: 12 },
    { nombre: 'Puente de glúteos', impacto: 'bajo', evitar: [] },
  ],
  fitCardio: [
    { nombre: 'Caminata rápida', impacto: 'bajo', evitar: [], series: 1, tiempo: '30 min' },
    { nombre: 'Bicicleta (estática o al aire libre)', impacto: 'bajo', evitar: [], series: 1, tiempo: '30 min' },
    { nombre: 'Intervalos suaves: 1 min rápido / 2 min tranquilo', impacto: 'medio', evitar: CORAZON, series: 6, tiempo: '3 min' },
    { nombre: 'Subir escaleras a ritmo constante', impacto: 'medio', evitar: RODILLA, series: 1, tiempo: '10 min' },
  ],
  fitLibre: [
    { nombre: 'Actividad que te guste: caminar, bici, nadar, bailar o un deporte recreativo', impacto: 'bajo', evitar: [], series: 1, tiempo: '45-60 min' },
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
  'Béisbol': {
    Lanzador: {
      enfoque: 'Brazo sano y potencia: el lanzamiento exige al máximo hombro y codo, así que se cuentan los lanzamientos y el hombro se trabaja siempre.',
      semana: semana(
        ['Fuerza + Hombro', ['fuerzaTren', 'beiHombro']],
        ['Lanzamiento controlado', ['beiLanzador']],
        ['Potencia + Core', ['potencia', 'fuerzaTronco']],
        ['Hombro + Lanzamiento ligero', ['beiHombro', 'beiLanzador']],
        ['Partido / Juego', ['beiLanzador']]
      )
    },
    Receptor: {
      enfoque: 'Cadera, piernas y tiro rápido: el receptor pasa el partido en cuclillas y lanza a las bases desde ahí.',
      semana: semana(
        ['Fuerza + Hombro', ['fuerzaTren', 'beiHombro']],
        ['Receptor + Bateo', ['beiReceptor', 'beiBateo']],
        ['Core + Superior', ['fuerzaTronco', 'fuerzaSuperior']],
        ['Receptor + Carrera', ['beiReceptor', 'beiCarrera']],
        ['Partido / Juego', ['beiBateo']]
      )
    },
    'Cuadro interior': {
      enfoque: 'Reacción y primer paso: rodados, transferencia rápida y tiro preciso a primera.',
      semana: semana(
        ['Carrera + Hombro', ['beiCarrera', 'beiHombro']],
        ['Defensa + Bateo', ['beiDefensa', 'beiBateo']],
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Defensa + Core', ['beiDefensa', 'fuerzaTronco']],
        ['Partido / Juego', ['beiBateo']]
      )
    },
    Jardinero: {
      enfoque: 'Sprint y brazo largo: los jardineros cubren más terreno y hacen los tiros más largos.',
      semana: semana(
        ['Sprint + Hombro', ['beiCarrera', 'beiHombro']],
        ['Elevados + Bateo', ['beiDefensa', 'beiBateo']],
        ['Fuerza + Core', ['fuerzaTren', 'fuerzaTronco']],
        ['Sprint + Potencia', ['beiCarrera', 'potencia']],
        ['Partido / Juego', ['beiBateo']]
      )
    },
  },
  'Atletismo': {
    Velocidad: {
      enfoque: 'Velocidad máxima y técnica: sprints cortos con descanso completo e isquiotibiales fuertes.',
      semana: semana(
        ['Técnica + Aceleración', ['atlTecnica', 'atlVelocidad']],
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Velocidad + Core', ['atlVelocidad', 'fuerzaTronco']],
        ['Técnica + Fuerza', ['atlTecnica', 'fuerzaTren']],
        ['Competición', ['atlTecnica']]
      )
    },
    'Medio fondo': {
      enfoque: 'Resistencia aeróbica y ritmo: series a ritmo de carrera, rodajes suaves y fuerza para correr más económico.',
      semana: semana(
        ['Series + Técnica', ['atlFondo', 'atlTecnica']],
        ['Fuerza + Core', ['runFuerza', 'fuerzaTronco']],
        ['Fartlek', ['atlFondo']],
        ['Rodaje + Fuerza', ['runSuave', 'runFuerza']],
        ['Competición', ['atlTecnica']]
      )
    },
    Saltos: {
      enfoque: 'Potencia elástica: pliometría y técnica de batida, con rodillas y tendones bien preparados.',
      semana: semana(
        ['Técnica + Saltos', ['atlTecnica', 'atlSaltos']],
        ['Fuerza + Core', ['fuerzaTren', 'fuerzaTronco']],
        ['Velocidad + Saltos', ['atlVelocidad', 'atlSaltos']],
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Competición', ['atlTecnica']]
      )
    },
    Lanzamientos: {
      enfoque: 'Fuerza y potencia rotacional: la marca sale de piernas y cadera, transmitida por el tronco.',
      semana: semana(
        ['Técnica + Lanzamientos', ['atlLanzamientos', 'fuerzaTronco']],
        ['Fuerza + Superior', ['fuerzaTren', 'fuerzaSuperior']],
        ['Potencia + Lanzamientos', ['potencia', 'atlLanzamientos']],
        ['Fuerza + Core', ['fuerzaTren', 'fuerzaTronco']],
        ['Competición', ['atlLanzamientos']]
      )
    },
  },
  'Running': {
    '5K - 10K': {
      enfoque: 'Velocidad aeróbica: la mayoría de días suaves, una sesión de intervalos y fuerza dos veces por semana.',
      semana: semana(
        ['Rodaje suave', ['runSuave']],
        ['Intervalos + Fuerza', ['runCalidad', 'runFuerza']],
        ['Rodaje suave + Core', ['runSuave', 'fuerzaTronco']],
        ['Fuerza + Rectas', ['runFuerza', 'runSuave']],
        ['Competición / Tirada larga', ['runLargo']]
      )
    },
    'Media maratón': {
      enfoque: 'Resistencia: tirada larga semanal, un día de tempo y el resto suave para llegar descansado a la calidad.',
      semana: semana(
        ['Rodaje suave', ['runSuave']],
        ['Tempo + Fuerza', ['runCalidad', 'runFuerza']],
        ['Rodaje suave + Core', ['runSuave', 'fuerzaTronco']],
        ['Fuerza + Rectas', ['runFuerza', 'runSuave']],
        ['Competición / Tirada larga', ['runLargo']]
      )
    },
    'Maratón': {
      enfoque: 'Volumen y paciencia: tiradas largas progresivas, mucho rodaje suave y fuerza para aguantar los kilómetros.',
      semana: semana(
        ['Rodaje suave + Fuerza', ['runSuave', 'runFuerza']],
        ['Tempo', ['runCalidad']],
        ['Rodaje suave + Core', ['runSuave', 'fuerzaTronco']],
        ['Fuerza + Rectas', ['runFuerza', 'runSuave']],
        ['Competición / Tirada larga', ['runLargo']]
      )
    },
  },
  'Natación': {
    Velocista: {
      enfoque: 'Potencia en el agua: sprints cortos, salidas y virajes, con hombros fuertes fuera del agua.',
      semana: semana(
        ['Velocidad + Seco', ['natVelocidad', 'natSeco']],
        ['Técnica + Potencia', ['natTecnica', 'potencia']],
        ['Velocidad + Core', ['natVelocidad', 'fuerzaTronco']],
        ['Fuerza + Seco', ['fuerzaSuperior', 'natSeco']],
        ['Competición', ['natVelocidad']]
      )
    },
    Fondista: {
      enfoque: 'Resistencia aeróbica y técnica eficiente: mucho volumen a ritmo controlado y respiración bilateral.',
      semana: semana(
        ['Fondo + Seco', ['natFondo', 'natSeco']],
        ['Técnica + Fondo', ['natTecnica', 'natFondo']],
        ['Fuerza + Core', ['fuerzaSuperior', 'fuerzaTronco']],
        ['Fondo + Seco', ['natFondo', 'natSeco']],
        ['Competición', ['natFondo']]
      )
    },
  },
  'Boxeo': {
    'Competición': {
      enfoque: 'Por asaltos: técnica y acondicionamiento con trabajo de 3 min y pausa de 1 min, potencia de piernas y tronco.',
      semana: semana(
        ['Técnica + Acondicionamiento', ['boxTecnica', 'boxAcondicionamiento']],
        ['Fuerza + Potencia', ['fuerzaTren', 'boxFuerza']],
        ['Sparring + Técnica', ['boxSparring', 'boxTecnica']],
        ['Acondicionamiento + Core', ['boxAcondicionamiento', 'fuerzaTronco']],
        ['Combate / Competición', ['boxTecnica']]
      )
    },
    'Recreativo': {
      enfoque: 'Boxeo para estar en forma: técnica con sombra, saco y manoplas, sin golpes a la cabeza.',
      semana: semana(
        ['Técnica + Acondicionamiento', ['boxTecnica', 'boxAcondicionamiento']],
        ['Fuerza', ['fuerzaTren', 'boxFuerza']],
        ['Técnica + Core', ['boxTecnica', 'fuerzaTronco']],
        ['Acondicionamiento + Superior', ['boxAcondicionamiento', 'fuerzaSuperior']],
        ['Sesión libre de saco', ['boxTecnica']]
      )
    },
  },
  'Estar en forma': {
    Principiante: {
      enfoque: 'Empezar sin lesionarse: ejercicios de bajo impacto y caminar o pedalear casi todos los días.',
      semana: semana(
        ['Fuerza de todo el cuerpo', ['fitBase']],
        ['Cardio suave', ['fitCardio']],
        ['Fuerza de todo el cuerpo', ['fitBase', 'fuerzaTronco']],
        ['Cardio suave', ['fitCardio']],
        ['Actividad libre', ['fitLibre']],
        'Movilidad y estiramientos'
      )
    },
    Intermedio: {
      enfoque: 'Fuerza y resistencia: tres días de fuerza y cardio con algo de intensidad.',
      semana: semana(
        ['Fuerza tren inferior + Core', ['fuerzaTren', 'fuerzaTronco']],
        ['Cardio con intervalos', ['fitCardio']],
        ['Fuerza tren superior', ['fuerzaSuperior', 'fuerzaTronco']],
        ['Fuerza de todo el cuerpo', ['fuerzaTren', 'fuerzaSuperior']],
        ['Actividad libre', ['fitLibre']],
        'Movilidad y estiramientos'
      )
    },
    Avanzado: {
      enfoque: 'Rendimiento: fuerza con más carga, potencia e intervalos intensos.',
      semana: semana(
        ['Fuerza + Potencia', ['fuerzaTren', 'potencia']],
        ['Intervalos', ['aerobico']],
        ['Fuerza tren superior + Core', ['fuerzaSuperior', 'fuerzaTronco']],
        ['Fuerza + Intervalos', ['fuerzaTren', 'aerobico']],
        ['Actividad libre', ['fitLibre']],
        'Movilidad y estiramientos'
      )
    },
  },
};

// Opciones del formulario que no son una posición de juego, sino la mano dominante
RUTINAS['Tenis']['Right-handed'] = RUTINAS['Tenis'].Individuales;
RUTINAS['Tenis']['Left-handed']  = RUTINAS['Tenis'].Individuales;

const POR_DEFECTO = {
  'Fútbol': 'Mediocampista', 'Baloncesto': 'Alero', 'Tenis': 'Individuales', 'Béisbol': 'Cuadro interior',
  'Atletismo': 'Velocidad', 'Running': '5K - 10K', 'Natación': 'Fondista', 'Boxeo': 'Recreativo',
  'Estar en forma': 'Principiante',
};

const NOTAS_DEPORTE = {
  'Fútbol':     '⚽ Haz el Nórdico y el Copenhague todas las semanas: son los ejercicios con más evidencia para evitar lesiones de isquiotibiales e ingle.',
  'Baloncesto': '🏀 Aterriza siempre con rodillas flexionadas y alineadas; el trabajo de equilibrio reduce los esguinces de tobillo.',
  'Tenis':      '🎾 No te saltes el trabajo de hombro: la debilidad en rotación externa del brazo dominante se asocia a dolor de hombro.',
  'Béisbol':    '⚾ Si lanzas, respeta el límite de lanzamientos y los días de descanso; el dolor de codo u hombro al lanzar es motivo para parar.',
  'Atletismo':  '🏃 Calienta con técnica de carrera antes de cada sesión y descansa completo entre sprints: la velocidad se entrena fresco.',
  'Running':    '👟 Corre suave la mayoría de días (debes poder hablar). Sube el volumen poco a poco, no más de un 10 % por semana como guía.',
  'Natación':   '🏊 El trabajo de hombro fuera del agua no es opcional: protege del "hombro del nadador".',
  'Boxeo':      '🥊 Usa siempre vendas y guantes adecuados. Ante dolor de cabeza o mareo tras un golpe, para y consulta al médico.',
  'Estar en forma': '💪 La meta de la OMS: 150-300 min de actividad moderada a la semana y fuerza al menos 2 días. Lo importante es la constancia.',
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

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIA_PARTIDO_PLANTILLA = 5; // sábado
const ES_PARTIDO = /partido|competici|torneo|combate/i;

/**
 * Mueve la semana para que la competición caiga el día que juega el atleta. La víspera
 * (sesión corta) y el día siguiente (descanso) se mueven con ella.
 * Con "Ninguno" la competición se cambia por una sesión normal del deporte.
 */
function ordenarSemana(semanaBase, diaPartido) {
  if (diaPartido === 'Ninguno') {
    return semanaBase.map(s => (ES_PARTIDO.test(s.tipo) ? { ...s, tipo: 'Sesión de práctica' } : s));
  }
  const indice = DIAS.indexOf(diaPartido);
  const conCompeticion = semanaBase.some(s => ES_PARTIDO.test(s.tipo));
  if (!conCompeticion || indice < 0 || indice === DIA_PARTIDO_PLANTILLA) return semanaBase;
  const desplazamiento = (indice - DIA_PARTIDO_PLANTILLA + 7) % 7;
  return DIAS.map((dia, i) => ({ ...semanaBase[(i - desplazamiento + 7) % 7], dia }));
}

/** Consejos de la semana de competición: víspera, sueño y recuperación. */
function notasPartido(semana) {
  const i = semana.findIndex(s => ES_PARTIDO.test(s.tipo));
  if (i < 0) return [];
  const dia = semana[i].dia, vispera = DIAS[(i + 6) % 7], despues = DIAS[(i + 1) % 7];
  return [
    `🏆 Compites el ${dia.toLowerCase()}. El ${vispera.toLowerCase()} entrena suave y come más carbohidratos (arroz, pasta, papa, fruta).`,
    `😴 Duerme 8-9 h las dos noches antes del ${dia.toLowerCase()}: dormir más mejora la velocidad, la precisión y el tiempo de reacción.`,
    `🛌 El ${despues.toLowerCase()} es para recuperar: descanso o actividad muy suave, buena hidratación y proteína en cada comida.`,
  ];
}

/** Rutina semanal según deporte, posición, condiciones médicas y día de partido. */
function generarRutina(perfilMedico, posicion, deporte = 'Fútbol', diaPartido = null) {
  const { condiciones = [] } = perfilMedico;
  const deporteValido = RUTINAS[deporte] ? deporte : 'Fútbol';
  const plantillas = RUTINAS[deporteValido];
  const posicionValida = plantillas[posicion] ? posicion : POR_DEFECTO[deporteValido];
  const plantilla = plantillas[posicionValida];

  const semana = ordenarSemana(plantilla.semana, diaPartido);
  const porCondicion = notasPorCondicion(condiciones);
  const notas = [
    `🎯 ${plantilla.enfoque}`,
    NOTAS_DEPORTE[deporteValido],
    ...notasPartido(semana),
    ...(porCondicion.length ? porCondicion : ['✅ Sin restricciones especiales. Sigue el plan completo con buena técnica.']),
  ];
  const titulo = deporteValido === 'Estar en forma'
    ? `Rutina para estar en forma · nivel ${posicionValida.toLowerCase()}`
    : `Rutina de ${deporteValido.toLowerCase()} para ${posicionValida}`;

  return {
    descripcion: `${titulo}${condiciones.length ? ' · adaptada a condiciones' : ''}`,
    deporte: deporteValido,
    posicion: posicionValida,
    diaPartido: semana.find(s => ES_PARTIDO.test(s.tipo))?.dia || null,
    semana: semana.map(sesion => ({
      dia: sesion.dia,
      tipo: sesion.tipo,
      ejercicios: sesion.grupos.flatMap(g => filtrarEjercicios(g, condiciones)),
      descanso: sesion.grupos.length === 0
    })),
    notas
  };
}

module.exports = { generarRutina, RUTINAS, EJERCICIOS };
