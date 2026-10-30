const { query } = require('../../../base-de-datos/db');
const panel = require('../panel');
const { generarRutina } = require('./rutinas');
const nutricion = require('./nutricion');
const { competicionDe } = require('../../compartido/deportes');

// ═══════════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════════
const CONDICIONES = {
  musculoesqueleticas: [
    'Tendinitis crónica','Tendinitis de Aquiles','Fascitis plantar',
    'Dolor lumbar crónico','Hernia discal','Escoliosis',
    'Condromalacia rotuliana (rodilla del corredor)','Lesión de menisco',
    'Esguince de tobillo recurrente','Síndrome de la banda iliotibial',
    'Pubalgia deportiva','Periostitis tibial (shin splints)',
    'Bursitis de cadera','Epicondilitis (codo de tenista)','Artritis temprana'
  ],
  cardiorrespiratorias: [
    'Asma inducida por ejercicio','Asma alérgica','Hipertensión arterial',
    'Hipotensión arterial','Arritmia cardíaca leve','Soplo cardíaco',
    'Anemia ferropénica','Anemia por déficit de vitamina B12'
  ],
  metabolicas: [
    'Diabetes tipo 1','Diabetes tipo 2','Hipoglucemia reactiva',
    'Hipotiroidismo','Hipertiroidismo','Sobrepeso / Obesidad',
    'Colesterol alto (hipercolesterolemia)','Triglicéridos elevados'
  ],
  digestivas: [
    'Síndrome de intestino irritable (SII)','Enfermedad de Crohn',
    'Colitis ulcerosa','Reflujo gastroesofágico (ERGE)',
    'Gastritis crónica','Intolerancia a la lactosa',
    'Enfermedad celíaca / Intolerancia al gluten','Estreñimiento crónico'
  ],
  neurologicasMentales: [
    'Migraña crónica','Epilepsia','Ansiedad generalizada',
    'Depresión','Insomnio crónico','Apnea del sueño','TDAH'
  ],
  otras: [
    'Psoriasis','Dermatitis atópica','Rinitis alérgica crónica',
    'Alergia al polvo / ácaros','Acné hormonal','Déficit de vitamina D'
  ]
};

const ALERGIAS = [
  'Gluten (trigo, cebada, centeno)','Lácteos / Lactosa','Huevo',
  'Mariscos','Pescado','Frutos secos (nueces, almendras, etc.)',
  'Cacahuetes / Maní','Soya / Soja','Maíz','Cítricos (naranja, limón)',
  'Fresas / Frutos rojos','Chocolate / Cacao','Sulfitos (conservas, vino)',
  'Sésamo / Ajonjolí','Mostaza','Apio'
];

const PREFERENCIAS = [
  'Sin restricciones','Vegetariano (sin carne ni pescado)',
  'Vegano (sin productos animales)','Pescetariano (pescado sí, carne no)','Bajo en carbohidratos',
  'Alto en proteína','Dieta mediterránea'
];

// ═══════════════════════════════════════════════════════════════
// FILTRO DE COMIDAS (el catálogo está en comidas.catalogo.js)
// ═══════════════════════════════════════════════════════════════
const { DESAYUNOS, ALMUERZOS, CENAS, MERIENDAS, ALERGENOS, DIETAS } = require('./comidas.catalogo');

// Con menos opciones que esto, las condiciones médicas dejan de descartar platos (las alergias y la dieta, nunca)
const MINIMO_OPCIONES = 3;

/** Clave de la preferencia elegida en el formulario. */
function claveDePreferencia(preferencia = '') {
  const p = preferencia.toLowerCase();
  if (p.includes('vegano')) return 'vegano';
  if (p.includes('vegetariano')) return 'vegetariano';
  if (p.includes('pescetariano')) return 'pescetariano';
  if (p.includes('bajo en carbohidratos')) return 'bajo-carbohidratos';
  if (p.includes('alto en proteína')) return 'alto-proteina';
  if (p.includes('mediterránea')) return 'mediterranea';
  return 'ninguna';
}

/** Ingredientes que esta persona no puede comer: alergias, intolerancias (también si vienen como condición) y dieta. */
function ingredientesProhibidos(alergias, condiciones, prefKey) {
  const prohibidos = new Set(DIETAS[prefKey] || []);
  for (const texto of [...alergias, ...condiciones]) {
    for (const [patron, ingrediente] of ALERGENOS) if (patron.test(texto)) prohibidos.add(ingrediente);
  }
  return prohibidos;
}

const sinAcentos = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Alergias escritas a mano (las que no están en el catálogo): se descarta cualquier plato que las
 * nombre. "Aguacates" o "alergia al aguacate" descartan los platos con aguacate.
 */
function palabrasProhibidas(alergias) {
  return alergias
    .filter(a => !ALERGIAS.includes(a))
    .map(a => sinAcentos(a).replace(/^(alergia|intolerancia)\s+(a la|al|a)\s+/, '').trim())
    .map(p => (p.length > 4 ? p.replace(/e?s$/, '') : p))
    .filter(p => p.length >= 3);
}

function puntajeMediterraneo(comida) {
  const texto = `${comida.nombre} ${comida.desc}`.toLowerCase();
  const positivos = (texto.match(/aceite de oliva|salmón|pescado|quinoa|garbanzos|lentejas|verduras|vegetales|espinaca|tomate|aguacate|nueces|almendra/g) || []).length;
  const negativos = (texto.match(/res |carne|chorizo|embutido|jamón/g) || []).length;
  return positivos - negativos;
}

/**
 * Comidas que puede comer la persona, ordenadas según su preferencia.
 * Nunca incluye un ingrediente prohibido; si no hay ninguna opción segura devuelve [].
 */
function filtrarComidas(pool, alergias, preferencia, condiciones) {
  const prefKey = claveDePreferencia(preferencia);
  const prohibidos = ingredientesProhibidos(alergias, condiciones, prefKey);
  const palabras = palabrasProhibidas(alergias);
  let opciones = pool.filter(comida => !comida.contiene.some(i => prohibidos.has(i))
    && !palabras.some(p => sinAcentos(`${comida.nombre} ${comida.desc}`).includes(p)));

  // Preferencias suaves: se aplican solo si dejan opciones suficientes
  const suave = filtro => { const quedan = opciones.filter(filtro); if (quedan.length >= MINIMO_OPCIONES) opciones = quedan; };
  suave(comida => !comida.evitarCon.some(cond => condiciones.includes(cond)));
  if (prefKey === 'bajo-carbohidratos') suave(comida => (comida.carbs * 4) / comida.kcal <= 0.4);

  if (prefKey === 'alto-proteina') return [...opciones].sort((a, b) => b.proteina / b.kcal - a.proteina / a.kcal);
  if (prefKey === 'mediterranea') return [...opciones].sort((a, b) => puntajeMediterraneo(b) - puntajeMediterraneo(a));
  return opciones;
}

const NOMBRES_ESTIMADOS = { peso: 'peso', altura: 'altura', edad: 'edad', sexo: 'sexo' };

/**
 * Plan semanal de comidas con calorías y macros calculados para el atleta.
 * @param perfilMedico  condiciones, alergias y preferencias
 * @param opciones      { ficha, rutina, lesion } — ficha deportiva, rutina semanal (para saber qué día
 *                      es de entreno, descanso o partido) y estado médico ('no_apto' | 'adaptado' | 'apto').
 *                      Acepta una posición suelta por compatibilidad.
 */
function generarPlanAlimenticio(perfilMedico, opciones = {}) {
  const { condiciones = [], alergias = [], preferencias = 'Sin restricciones' } = perfilMedico;
  const { ficha = null, rutina = null, lesion = null } = typeof opciones === 'string' ? { ficha: { posicion: opciones } } : opciones;
  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

  const base = nutricion.datosBase(ficha || {});
  const tipos = rutina ? nutricion.tiposDeDia(rutina) : [];
  const tipoSegunRutina = i => tipos[i] || (i === 6 ? 'descanso' : 'entreno');
  // De baja no se entrena: toda la semana come como en descanso. En recuperación, los días de
  // entreno o partido pasan a ser de recuperación (sesiones suaves).
  const tipoDe = i => {
    const tipo = tipoSegunRutina(i);
    if (lesion === 'no_apto') return 'descanso';
    if (lesion === 'adaptado' && tipo !== 'descanso') return 'recuperacion';
    return tipo;
  };
  const conLesion = lesion === 'no_apto' || lesion === 'adaptado';

  const opcionesPorToma = {
    desayuno:       filtrarComidas(DESAYUNOS, alergias, preferencias, condiciones),
    meriendaMañana: filtrarComidas(MERIENDAS, alergias, preferencias, condiciones),
    almuerzo:       filtrarComidas(ALMUERZOS, alergias, preferencias, condiciones),
    meriendaTarde:  filtrarComidas(MERIENDAS, alergias, preferencias, condiciones),
    cena:           filtrarComidas(CENAS,     alergias, preferencias, condiciones),
  };
  const sinOpcionSegura = {
    nombre: 'Sin opción segura disponible en el catálogo',
    desc: 'Consulta con tu nutricionista para añadir una alternativa compatible con tus restricciones.',
    kcal: 0, proteina: 0, carbs: 0, grasa: 0, porcion: 1
  };

  // Estas preferencias ya ordenan el catálogo: hay que respetar ese orden al elegir
  const respetarOrden = /mediterr|alto en prote/i.test(preferencias);
  const competicion = competicionDe(ficha?.deporte); // "Partido", "Sparring o pelea", "Carrera"…

  const semana = dias.map((dia, i) => {
    const objetivo = nutricion.objetivosDelDia(base, tipoDe(i), preferencias, { lesion: conLesion });
    if (objetivo.tipoDia === 'partido') objetivo.etiqueta = competicion.corto;
    if (objetivo.tipoDia === 'precompetencia') objetivo.etiqueta = competicion.vispera;
    const comidas = {};
    for (const [toma, parte] of Object.entries(nutricion.REPARTO)) {
      // Las dos meriendas usan el mismo catálogo: se desplaza el índice para que no se repitan
      const indice = toma === 'meriendaTarde' ? i + 1 : i;
      comidas[toma] = nutricion.elegirComida(opcionesPorToma[toma], objetivo.kcal * parte, indice, { respetarOrden }) || sinOpcionSegura;
    }
    const total = Object.values(comidas).reduce((t, c) => ({
      kcal: t.kcal + c.kcal, proteina: t.proteina + c.proteina, carbs: t.carbs + c.carbs, grasa: t.grasa + c.grasa
    }), { kcal: 0, proteina: 0, carbs: 0, grasa: 0 });
    return { dia, tipoDia: objetivo.tipoDia, objetivo, total, ...comidas };
  });

  const entreno  = semana.find(d => d.tipoDia === 'entreno')?.objetivo || nutricion.objetivosDelDia(base, conLesion ? 'recuperacion' : 'entreno', preferencias, { lesion: conLesion });
  const descanso = semana.find(d => d.tipoDia === 'descanso')?.objetivo || nutricion.objetivosDelDia(base, 'descanso', preferencias, { lesion: conLesion });

  const notas = [];
  if (lesion === 'no_apto')
    notas.push('🩹 Estás de baja médica: el plan usa días de descanso (menos carbohidratos) y sube la proteína para ayudar a recuperar el tejido. Sin dietas estrictas mientras te recuperas.');
  else if (lesion === 'adaptado')
    notas.push('🩹 Estás en recuperación: los días de entreno son suaves, así que el plan baja algo los carbohidratos y mantiene la proteína alta.');
  if (base.estimados.length)
    notas.push(`📝 Faltan datos (${base.estimados.map(c => NOMBRES_ESTIMADOS[c]).join(', ')}): se usaron valores de referencia. Complétalos en Mi Perfil para afinar el cálculo.`);
  if (condiciones.includes('Diabetes tipo 1') || condiciones.includes('Diabetes tipo 2'))
    notas.push('⚠️ Controla la glucosa antes y después de entrenar. Consulta tu médico para ajustes de dosis.');
  if (condiciones.includes('Hipertensión arterial'))
    notas.push('⚠️ Reducir el sodio al máximo. Evitar alimentos procesados y embutidos.');
  if (condiciones.includes('Anemia ferropénica'))
    notas.push('💊 Acompaña las comidas ricas en hierro con vitamina C para mejorar absorción.');
  if (condiciones.includes('Asma inducida por ejercicio') || condiciones.includes('Asma alérgica'))
    notas.push('🫁 Mantén siempre hidratación adecuada. Come 2h antes del entrenamiento.');
  if (condiciones.some(c=>c.includes('intestino') || c.includes('Crohn') || c.includes('Colitis')))
    notas.push('🍽 Come despacio, mastica bien y evita comidas copiosas antes de entrenar.');
  const dieta = claveDePreferencia(preferencias);
  if (dieta === 'vegano')
    notas.push('🌱 Dieta vegana: toma un suplemento de vitamina B12 (no hay fuentes vegetales fiables), combina legumbres con cereales a lo largo del día para completar la proteína y acompaña las legumbres con vitamina C (pimiento, fruta) para absorber mejor el hierro. Revisa con tu nutricionista la vitamina D, el calcio y el omega-3.');
  else if (dieta === 'vegetariano')
    notas.push('🥚 Dieta vegetariana: huevo, lácteos y legumbres cubren la proteína. Si casi no tomas huevo ni lácteos, consulta por un suplemento de vitamina B12.');
  if (alergias.length)
    notas.push(`🚫 Alergias registradas: ${alergias.join(', ')}. Revisa siempre etiquetas de productos.`);
  if (Object.values(opcionesPorToma).some(o => !o.length))
    notas.push('⚠️ El catálogo no tiene opciones seguras para una o más comidas. Se dejaron sin asignar para evitar recomendar alimentos incompatibles; consulta a tu nutricionista.');
  if (semana.some(d => d.tipoDia === 'partido'))
    notas.push('🏆 Día de partido: comida principal 3-4 h antes (rica en carbohidratos y baja en grasa) y algo de carbohidrato rápido en el descanso.');
  const litros = l => String(l).replace('.', ',');
  notas.push(`💧 Agua: unos ${litros(descanso.aguaLitros)} L en días de descanso y ${litros(entreno.aguaLitros)} L en días de entreno.`);
  notas.push('🕐 Respeta los horarios de comida. Evita saltarte comidas antes de entrenar.');

  return {
    descripcion: `Plan personalizado · ${condiciones.length ? condiciones.slice(0,2).join(', ') : 'Sin condiciones'} · ${alergias.length ? alergias.length+' alergia(s)' : 'Sin alergias'} · ${preferencias}`,
    base: { peso: base.peso, altura: base.altura, edad: base.edad, sexo: base.sexo, deporte: base.deporte,
            posicion: base.posicion, objetivo: base.objetivo, estimados: base.estimados },
    objetivos: { entreno, descanso },
    semana,
    notas
  };
}

// ═══════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════
/** Atletas activos que puede ver el médico (sus equipos), con el nombre del equipo. */
async function listarAtletas(usuario) {
  const equipos = require('../equipos');
  const { rows: todos } = await query(
    `SELECT u.id, u.nombre, u.email, pm.completado
       FROM usuarios u
       LEFT JOIN perfiles_medicos pm ON pm.user_id = u.id
      WHERE u.rol IN ('Atleta', 'Futbolista') AND u.estado = 'Activo'
      ORDER BY u.nombre`
  );
  const rows = await equipos.filtrarAtletas(usuario, todos);
  const nombres = await equipos.nombresDeEquipos(rows.map(r => Number(r.id)));
  return rows.map(r => ({ ...r, equipos: nombres[String(r.id)] || [] }));
}

/** Ficha deportiva (deporte, posición, peso, altura...) para el expediente del médico. */
async function obtenerFicha(userId) {
  const [{ rows: u }, { rows: p }] = await Promise.all([
    query('SELECT deporte_principal, posicion, peso, altura, fecha_nacimiento, pie, frecuencia, objetivo, estilo FROM usuarios WHERE id = $1', [userId]),
    query('SELECT posicion, edad, peso, altura, sexo, dia_partido FROM perfiles WHERE user_id = $1', [userId])
  ]);
  return u[0] ? panel.fichaDeportiva(u[0], p[0]) : null;
}

// Serialización con claves ordenadas: JSONB reordena las claves al guardar
function estable(valor) {
  if (Array.isArray(valor)) return `[${valor.map(estable).join(',')}]`;
  if (valor && typeof valor === 'object')
    return `{${Object.keys(valor).sort((a, b) => (a < b ? -1 : Number(a > b))).map(k => JSON.stringify(k) + ':' + estable(valor[k])).join(',')}}`;
  return JSON.stringify(valor);
}

/**
 * Regenera rutina y plan de comidas con la ficha actual del atleta (peso, posición, deporte...)
 * y los guarda si cambiaron. Así un cambio en Mi Perfil se refleja sin rehacer el perfil médico.
 */
async function refrescarPlanes(userId, perfil, ficha) {
  if (!perfil || !ficha) return perfil;
  const datos = {
    condiciones:  perfil.condiciones  || [],
    alergias:     perfil.alergias     || [],
    preferencias: perfil.preferencias || 'Sin restricciones'
  };
  const rutinaSemanal   = generarRutina(datos, ficha.posicion, ficha.deporte, ficha.diaPartido, ficha.estilo);
  // El estado médico (módulo lesiones) cambia las comidas: de baja se come como en descanso
  const estado = await require('../lesiones').estadoDe(userId).catch(() => null);
  const planAlimenticio = generarPlanAlimenticio(datos, { ficha, rutina: rutinaSemanal, lesion: estado?.estado || null });
  const cambio = estable(rutinaSemanal) !== estable(perfil.rutinaSemanal) || estable(planAlimenticio) !== estable(perfil.planAlimenticio);
  if (cambio) {
    await query(
      'UPDATE perfiles_medicos SET rutina_semanal = $1, plan_alimenticio = $2 WHERE user_id = $3',
      [JSON.stringify(rutinaSemanal), JSON.stringify(planAlimenticio), userId]
    );
  }
  return { ...perfil, rutinaSemanal, planAlimenticio };
}

async function obtener(userId) {
  const { rows } = await query(
    'SELECT * FROM perfiles_medicos WHERE user_id = $1',
    [userId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    userId:          r.user_id,
    condiciones:     r.condiciones,
    alergias:        r.alergias,
    preferencias:    r.preferencias,
    completado:      r.completado,
    planAlimenticio: r.plan_alimenticio,
    rutinaSemanal:   r.rutina_semanal,
    creadoEn:        r.creado_en
  };
}

const MAX_ELEGIDAS = 40;
const MAX_TEXTO_ELEGIDA = 60;

/** Condiciones o alergias: las del catálogo y las que la persona escribió (limpias, sin repetir). */
function listaLimpia(lista) {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set();
  const salida = [];
  for (const valor of lista) {
    const texto = String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO_ELEGIDA);
    if (texto.length < 2 || vistas.has(texto.toLowerCase())) continue;
    vistas.add(texto.toLowerCase());
    salida.push(texto);
    if (salida.length >= MAX_ELEGIDAS) break;
  }
  return salida;
}

async function guardar(userId, datos, posicion, deporte = 'Fútbol', ficha = null) {
  const preferencia = datos.preferencia || datos.preferencias;
  const datosNorm = {
    condiciones:  listaLimpia(datos.condiciones),
    alergias:     listaLimpia(datos.alergias),
    preferencias: PREFERENCIAS.includes(preferencia) ? preferencia : 'Sin restricciones'
  };

  const rutinaSemanal   = generarRutina(datosNorm, posicion, deporte, ficha?.diaPartido, ficha?.estilo);
  const planAlimenticio = generarPlanAlimenticio(datosNorm, { ficha: { ...(ficha || {}), posicion, deporte }, rutina: rutinaSemanal });

  await query(
    `INSERT INTO perfiles_medicos (user_id, condiciones, alergias, preferencias, completado, plan_alimenticio, rutina_semanal)
     VALUES ($1,$2,$3,$4,true,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET
       condiciones      = EXCLUDED.condiciones,
       alergias         = EXCLUDED.alergias,
       preferencias     = EXCLUDED.preferencias,
       plan_alimenticio = EXCLUDED.plan_alimenticio,
       rutina_semanal   = EXCLUDED.rutina_semanal,
       completado       = true`,
    [
      userId,
      JSON.stringify(datosNorm.condiciones),
      JSON.stringify(datosNorm.alergias),
      datosNorm.preferencias,
      JSON.stringify(planAlimenticio),
      JSON.stringify(rutinaSemanal)
    ]
  );

  return {
    userId,
    condiciones:     datosNorm.condiciones,
    alergias:        datosNorm.alergias,
    preferencias:    datosNorm.preferencias,
    completado:      true,
    planAlimenticio,
    rutinaSemanal,
    creadoEn:        new Date().toISOString()
  };
}

module.exports = { listarAtletas, obtener, guardar, CONDICIONES, ALERGIAS, PREFERENCIAS, obtenerFicha, refrescarPlanes, generarPlanAlimenticio };