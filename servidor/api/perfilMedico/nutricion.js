/**
 * Objetivos nutricionales diarios del atleta (funciones puras).
 *
 * Base científica:
 * - Gasto en reposo: ecuación de Mifflin-St Jeor, la de menor error entre las fórmulas
 *   habituales en deportistas (sin calorimetría hay que tomarla como estimación).
 * - Carbohidratos según la carga del día (posicionamiento conjunto ACSM / Academy of
 *   Nutrition and Dietetics / Dietitians of Canada, 2016): ligera 3-5 g/kg, moderada 5-7.
 * - Fútbol (consenso UEFA): 3-8 g/kg según el día; 6-8 g/kg la víspera del partido.
 * - Proteína 1,2-2,0 g/kg/día; grasa 20-35 % de la energía.
 */

const MACROS_POR_DIA = {
  //               factor de actividad · carbohidratos g/kg
  descanso:        { factor: 1.40, carbs: 3.5 },
  recuperacion:    { factor: 1.50, carbs: 4.0 },
  entreno:         { factor: 1.70, carbs: 5.5 },
  precompetencia:  { factor: 1.60, carbs: 7.0 }, // víspera del partido: recargar glucógeno
  partido:         { factor: 1.85, carbs: 6.0 },
};

const ETIQUETA_DIA = {
  descanso: 'Descanso', recuperacion: 'Recuperación', entreno: 'Entreno',
  precompetencia: 'Víspera de partido', partido: 'Partido',
};

// Posiciones que más distancia recorren: un poco más de carbohidrato los días de entreno
const ALTO_VOLUMEN = ['Mediocampista', 'Lateral', 'Extremo', 'Base', 'Escolta', 'Alero', 'Individuales', 'Right-handed', 'Left-handed',
  'Medio fondo', '5K - 10K', 'Media maratón', 'Maratón', 'Fondista', 'Jardinero', 'Competición'];

// Valores de referencia cuando faltan datos del atleta (se avisa en el plan)
const POR_DEFECTO = { peso: 70, altura: 175, edad: 22 };

const MINUTOS_ENTRENO = { descanso: 0, recuperacion: 30, entreno: 75, precompetencia: 45, partido: 90 };

function redondear(valor, paso = 1) {
  return Math.round(valor / paso) * paso;
}

/** Datos con los que se calcula, marcando cuáles son estimados. */
function datosBase(ficha = {}) {
  const estimados = [];
  const tomar = campo => {
    const v = Number(ficha[campo]);
    if (v > 0) return v;
    estimados.push(campo);
    return POR_DEFECTO[campo];
  };
  const peso = tomar('peso'), altura = tomar('altura'), edad = tomar('edad');
  const sexo = ['Hombre', 'Mujer'].includes(ficha.sexo) ? ficha.sexo : null;
  if (!sexo) estimados.push('sexo');
  return {
    peso, altura, edad, sexo, estimados,
    deporte: ficha.deporte || 'Fútbol',
    posicion: ficha.posicion || null,
    objetivo: ficha.objetivo || null,
  };
}

/** Gasto energético en reposo (kcal/día). Sin sexo indicado se usa el punto medio. */
function gastoEnReposo({ peso, altura, edad, sexo }) {
  const ajusteSexo = sexo === 'Hombre' ? 5 : sexo === 'Mujer' ? -161 : -78;
  return 10 * peso + 6.25 * altura - 5 * edad + ajusteSexo;
}

/** Tipo de cada día de la semana a partir de la rutina (lunes a domingo). */
function tiposDeDia(rutinaSemanal) {
  const semana = rutinaSemanal?.semana || [];
  const tipos = semana.map(d => {
    const tipo = String(d.tipo || '');
    if (/partido|competici|torneo|scrimmage|combate/i.test(tipo)) return 'partido';
    if (d.descanso || !d.ejercicios?.length) return 'descanso';
    if (/recuperaci/i.test(tipo)) return 'recuperacion';
    return 'entreno';
  });
  // El día anterior a un partido es de recarga (si no es también partido)
  return tipos.map((t, i) => (t !== 'partido' && tipos[i + 1] === 'partido' ? 'precompetencia' : t));
}

/**
 * Calorías, macros y agua para un tipo de día.
 * lesion: con una lesión activa la proteína sube a 2,0 g/kg (ayuda a reparar el tejido y a no
 * perder músculo con la inactividad) y no se aplica déficit para perder peso.
 */
function objetivosDelDia(base, tipoDia, preferencias = '', { lesion = false } = {}) {
  const cfg = MACROS_POR_DIA[tipoDia] || MACROS_POR_DIA.entreno;
  const { peso, objetivo, posicion } = base;

  let carbsGkg = cfg.carbs;
  if (tipoDia === 'entreno' && ALTO_VOLUMEN.includes(posicion)) carbsGkg += 0.5;

  let proteinaGkg = 1.6;
  if (objetivo === 'Ganar masa muscular') proteinaGkg = 1.8;
  if (objetivo === 'Perder peso' || /alto en prote/i.test(preferencias) || lesion) proteinaGkg = 2.0;

  let energia = gastoEnReposo(base) * cfg.factor;
  const diaClave = tipoDia === 'partido' || tipoDia === 'precompetencia';
  if (objetivo === 'Perder peso' && !diaClave && !lesion) {
    energia *= 0.85;
    carbsGkg = Math.max(3, carbsGkg - 1); // el déficit sale sobre todo de carbohidratos en días suaves
  }
  if (objetivo === 'Ganar masa muscular') energia *= 1.10;
  if (/bajo en carbohidratos/i.test(preferencias) && !diaClave) carbsGkg = Math.max(3, carbsGkg - 1.5);

  const proteina = redondear(proteinaGkg * peso);
  let carbs = redondear(carbsGkg * peso);
  // La grasa completa la energía, entre el 20 % y el 35 %. Si llega al tope, lo que
  // falta de energía se completa con carbohidratos.
  const minimo = (0.20 * energia) / 9, maximo = (0.35 * energia) / 9;
  let grasa = (energia - 4 * proteina - 4 * carbs) / 9;
  if (grasa > maximo) {
    carbs = redondear(carbs + ((grasa - maximo) * 9) / 4);
    grasa = maximo;
  }
  // Si proteína y carbohidratos ya ocupan casi toda la energía (víspera de partido), se mantienen
  // y la grasa sube hasta el 20 % del total resultante
  if (grasa < minimo) grasa = (0.20 * (4 * proteina + 4 * carbs)) / (9 * 0.80);
  grasa = redondear(grasa);
  const kcal = redondear(4 * proteina + 4 * carbs + 9 * grasa, 10);

  const agua = redondear((35 * peso + (MINUTOS_ENTRENO[tipoDia] / 60) * 750) / 1000, 0.1);

  return { tipoDia, etiqueta: ETIQUETA_DIA[tipoDia], kcal, proteina, carbs, grasa, aguaLitros: Number(agua.toFixed(1)) };
}

// Reparto de la energía del día entre las comidas
const REPARTO = { desayuno: 0.25, meriendaMañana: 0.10, almuerzo: 0.30, meriendaTarde: 0.10, cena: 0.25 };

/**
 * Elige la comida del catálogo que mejor encaja con la toma (rotando entre 3 candidatas
 * para que la semana sea variada) y calcula la porción para llegar al objetivo.
 * Con respetarOrden (dieta mediterránea, alta en proteína) las candidatas son las primeras
 * de la lista, que ya viene ordenada por la preferencia; si no, las más cercanas en calorías.
 */
function elegirComida(opciones, objetivoKcal, indiceDia, { respetarOrden = false } = {}) {
  if (!opciones.length) return null;
  const validas = opciones.filter(c => c.kcal > 0);
  if (!validas.length) return { ...opciones[0], porcion: 1 };
  const cercanas = respetarOrden
    ? validas.slice(0, 3)
    : [...validas].sort((a, b) => Math.abs(a.kcal - objetivoKcal) - Math.abs(b.kcal - objetivoKcal)).slice(0, 3);
  const comida = cercanas[indiceDia % cercanas.length];
  const porcion = Math.min(2.5, Math.max(0.5, redondear(objetivoKcal / comida.kcal, 0.25)));
  const escala = v => redondear((Number(v) || 0) * porcion);
  return {
    ...comida,
    porcion,
    kcal: escala(comida.kcal),
    proteina: escala(comida.proteina),
    carbs: escala(comida.carbs),
    grasa: escala(comida.grasa),
  };
}

module.exports = {
  datosBase, gastoEnReposo, tiposDeDia, objetivosDelDia, elegirComida,
  REPARTO, ETIQUETA_DIA, POR_DEFECTO,
};
