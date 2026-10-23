const nutri = require('../servidor/api/perfilMedico/nutricion');
const { generarRutina } = require('../servidor/api/perfilMedico/rutinas');
const { generarPlanAlimenticio } = require('../servidor/api/perfilMedico/perfilMedico.service');

const CARLOS = { peso: 74, altura: 181, edad: 23, sexo: 'Hombre', deporte: 'Fútbol', posicion: 'Delantero', objetivo: 'Mejorar rendimiento deportivo' };
const SIN_RESTRICCIONES = { condiciones: [], alergias: [], preferencias: 'Sin restricciones' };

describe('gasto en reposo (Mifflin-St Jeor)', () => {
  test('hombre y mujer según la fórmula', () => {
    expect(nutri.gastoEnReposo({ peso: 70, altura: 175, edad: 25, sexo: 'Hombre' })).toBe(1673.75);
    expect(nutri.gastoEnReposo({ peso: 70, altura: 175, edad: 25, sexo: 'Mujer' })).toBe(1507.75);
  });

  test('sin sexo usa el punto medio', () => {
    expect(nutri.gastoEnReposo({ peso: 70, altura: 175, edad: 25, sexo: null })).toBe(1590.75);
  });
});

describe('datosBase', () => {
  test('marca como estimados los datos que faltan y usa valores de referencia', () => {
    const b = nutri.datosBase({ peso: 0, altura: null });
    expect(b).toMatchObject({ peso: 70, altura: 175, edad: 22, sexo: null });
    expect(b.estimados).toEqual(['peso', 'altura', 'edad', 'sexo']);
  });

  test('con todos los datos no hay estimados', () => {
    expect(nutri.datosBase(CARLOS).estimados).toEqual([]);
  });
});

describe('tiposDeDia', () => {
  test('lee la rutina y marca la víspera del partido', () => {
    const rutina = generarRutina({ condiciones: [] }, 'Delantero', 'Fútbol');
    expect(nutri.tiposDeDia(rutina)).toEqual(
      ['entreno', 'entreno', 'recuperacion', 'entreno', 'precompetencia', 'partido', 'descanso']
    );
  });
});

describe('objetivosDelDia', () => {
  const base = nutri.datosBase(CARLOS);

  test('los carbohidratos siguen la carga: descanso < entreno < víspera de partido', () => {
    const d = nutri.objetivosDelDia(base, 'descanso');
    const e = nutri.objetivosDelDia(base, 'entreno');
    const v = nutri.objetivosDelDia(base, 'precompetencia');
    // En descanso la grasa toca su tope y los carbohidratos completan la energía (rango 3-5 g/kg)
    expect(d.carbs).toBeGreaterThanOrEqual(Math.round(3.5 * 74));
    expect(d.carbs).toBeLessThanOrEqual(5 * 74);
    expect(e.carbs).toBe(Math.round(5.5 * 74));
    expect(v.carbs).toBe(Math.round(7 * 74)); // consenso UEFA: 6-8 g/kg la víspera
    expect(d.kcal).toBeLessThan(e.kcal);
  });

  test('proteína 1,6 g/kg y grasa entre el 20 % y el 35 % de la energía', () => {
    for (const tipo of ['descanso', 'recuperacion', 'entreno', 'precompetencia', 'partido']) {
      const o = nutri.objetivosDelDia(base, tipo);
      expect(o.proteina).toBe(Math.round(1.6 * 74));
      const pctGrasa = (9 * o.grasa) / o.kcal;
      expect(pctGrasa).toBeGreaterThanOrEqual(0.19);
      expect(pctGrasa).toBeLessThanOrEqual(0.36);
    }
  });

  test('las posiciones que más corren reciben más carbohidrato al entrenar', () => {
    const medio = nutri.datosBase({ ...CARLOS, posicion: 'Mediocampista' });
    expect(nutri.objetivosDelDia(medio, 'entreno').carbs).toBe(Math.round(6 * 74));
  });

  test('perder peso recorta energía en días suaves pero no la víspera ni el partido', () => {
    const perder = nutri.datosBase({ ...CARLOS, objetivo: 'Perder peso' });
    expect(nutri.objetivosDelDia(perder, 'entreno').kcal).toBeLessThan(nutri.objetivosDelDia(base, 'entreno').kcal);
    expect(nutri.objetivosDelDia(perder, 'entreno').proteina).toBe(Math.round(2 * 74));
    expect(nutri.objetivosDelDia(perder, 'precompetencia').carbs).toBe(nutri.objetivosDelDia(base, 'precompetencia').carbs);
  });

  test('ganar masa muscular sube energía y proteína', () => {
    const ganar = nutri.datosBase({ ...CARLOS, objetivo: 'Ganar masa muscular' });
    const o = nutri.objetivosDelDia(ganar, 'entreno');
    expect(o.proteina).toBe(Math.round(1.8 * 74));
    expect(o.kcal).toBeGreaterThan(nutri.objetivosDelDia(base, 'entreno').kcal);
  });

  test('más agua los días de entreno', () => {
    expect(nutri.objetivosDelDia(base, 'partido').aguaLitros).toBeGreaterThan(nutri.objetivosDelDia(base, 'descanso').aguaLitros);
  });
});

describe('elegirComida', () => {
  const opciones = [
    { nombre: 'A', kcal: 300, proteina: 20, carbs: 30, grasa: 10 },
    { nombre: 'B', kcal: 500, proteina: 30, carbs: 50, grasa: 15 },
    { nombre: 'C', kcal: 800, proteina: 40, carbs: 80, grasa: 30 },
  ];

  test('escala la porción para acercarse al objetivo', () => {
    const c = nutri.elegirComida(opciones, 750, 0);
    expect(c.nombre).toBe('C');
    expect(c.porcion).toBe(1);
    const grande = nutri.elegirComida([opciones[0]], 600, 0);
    expect(grande).toMatchObject({ porcion: 2, kcal: 600, proteina: 40 });
  });

  test('la porción queda entre 0,5 y 2,5', () => {
    expect(nutri.elegirComida([opciones[0]], 5000, 0).porcion).toBe(2.5);
    expect(nutri.elegirComida([opciones[2]], 50, 0).porcion).toBe(0.5);
  });

  test('sin opciones devuelve null', () => {
    expect(nutri.elegirComida([], 500, 0)).toBeNull();
  });
});

describe('generarPlanAlimenticio', () => {
  const rutina = generarRutina({ condiciones: [] }, 'Delantero', 'Fútbol');
  const plan = generarPlanAlimenticio(SIN_RESTRICCIONES, { ficha: CARLOS, rutina });

  test('cada día tiene su tipo, su objetivo y un menú cercano a ese objetivo', () => {
    expect(plan.semana).toHaveLength(7);
    for (const dia of plan.semana) {
      expect(dia.objetivo.kcal).toBeGreaterThan(0);
      expect(Math.abs(dia.total.kcal - dia.objetivo.kcal) / dia.objetivo.kcal).toBeLessThan(0.12);
    }
    expect(plan.semana[5].tipoDia).toBe('partido');
  });

  test('incluye objetivos de entreno y descanso y los datos usados', () => {
    expect(plan.objetivos.entreno.kcal).toBeGreaterThan(plan.objetivos.descanso.kcal);
    expect(plan.base).toMatchObject({ peso: 74, sexo: 'Hombre', posicion: 'Delantero', estimados: [] });
  });

  test('avisa cuando faltan datos', () => {
    const sinDatos = generarPlanAlimenticio(SIN_RESTRICCIONES, { ficha: { deporte: 'Tenis' } });
    expect(sinDatos.notas[0]).toMatch(/Faltan datos/);
  });

  test('sigue funcionando si solo se pasa la posición (formato antiguo)', () => {
    const viejo = generarPlanAlimenticio(SIN_RESTRICCIONES, 'Portero');
    expect(viejo.semana).toHaveLength(7);
    expect(viejo.base.posicion).toBe('Portero');
  });
});
