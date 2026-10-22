const calc = require('../servidor/api/rendimiento/rendimiento.calculos');

const HOY = '2026-10-22'; // jueves

// ─── fechas ───────────────────────────────────────────────────────────────────
describe('aFechaISO', () => {
  test('acepta texto, Date en medianoche UTC y null', () => {
    expect(calc.aFechaISO('2026-10-22')).toBe('2026-10-22');
    expect(calc.aFechaISO('2026-10-22T00:00:00.000Z')).toBe('2026-10-22');
    expect(calc.aFechaISO(new Date('2026-10-22T00:00:00Z'))).toBe('2026-10-22');
    expect(calc.aFechaISO(null)).toBeNull();
  });

  test('nombreDia y sumarDias', () => {
    expect(calc.nombreDia(HOY)).toBe('Jueves');
    expect(calc.sumarDias(HOY, -22)).toBe('2026-09-30');
  });
});

// ─── listo para entrenar ──────────────────────────────────────────────────────
describe('calcularListo', () => {
  test('sin registro de salud hoy pide registrarlo', () => {
    const r = calc.calcularListo(null, 'optimo');
    expect(r.puntaje).toBeNull();
    expect(r.nivel).toBe('sin-datos');
  });

  test('estado ideal da 100 y nivel alto', () => {
    expect(calc.calcularListo({ fatiga: 1, sueno: 10, recuperacion: 10 })).toMatchObject({ puntaje: 100, nivel: 'alto' });
  });

  test('peor estado da 10 y nivel bajo', () => {
    expect(calc.calcularListo({ fatiga: 10, sueno: 1, recuperacion: 1 })).toMatchObject({ puntaje: 10, nivel: 'bajo' });
  });

  test('estado intermedio da nivel medio', () => {
    expect(calc.calcularListo({ fatiga: 6, sueno: 7, recuperacion: 6 })).toMatchObject({ puntaje: 60, nivel: 'medio' });
  });

  test('una carga en riesgo alto resta 10 puntos', () => {
    const salud = { fatiga: 3, sueno: 8, recuperacion: 8 }; // 80
    expect(calc.calcularListo(salud, 'optimo').puntaje).toBe(80);
    expect(calc.calcularListo(salud, 'alto')).toMatchObject({ puntaje: 70, nivel: 'medio' });
  });
});

// ─── carga ────────────────────────────────────────────────────────────────────
describe('cargaSesion', () => {
  test('usa minutos × RPE', () => {
    expect(calc.cargaSesion({ minutos: 90, rpe: 8 })).toBe(720);
  });

  test('sin RPE lo estima por intensidad', () => {
    expect(calc.cargaSesion({ minutos: 60, intensidad: 'Alta' })).toBe(420);
    expect(calc.cargaSesion({ minutos: 60, intensidad: 'baja' })).toBe(180);
  });

  test('sin datos usa 60 minutos y RPE 5', () => {
    expect(calc.cargaSesion({})).toBe(300);
  });
});

describe('calcularCarga', () => {
  // Una sesión diaria durante `dias` días, con `rpeUltimaSemana` en los últimos 7
  function sesiones(dias, rpe, rpeUltimaSemana = rpe) {
    return Array.from({ length: dias }, (_, i) => ({
      fecha: calc.sumarDias(HOY, -i), minutos: 60, rpe: i < 7 ? rpeUltimaSemana : rpe
    }));
  }

  test('devuelve una serie de 28 días terminando hoy', () => {
    const r = calc.calcularCarga([], HOY);
    expect(r.serie).toHaveLength(28);
    expect(r.serie[27].fecha).toBe(HOY);
  });

  test('con menos de 14 días de historial no calcula el ratio', () => {
    const r = calc.calcularCarga(sesiones(10, 5), HOY);
    expect(r.ratio).toBeNull();
    expect(r.riesgo).toBe('sin-datos');
  });

  test('carga estable da ratio 1 y zona óptima', () => {
    const r = calc.calcularCarga(sesiones(28, 5), HOY);
    expect(r.ratio).toBe(1);
    expect(r.riesgo).toBe('optimo');
  });

  test('duplicar la carga la última semana da riesgo alto', () => {
    const r = calc.calcularCarga(sesiones(28, 4, 9), HOY);
    expect(r.ratio).toBeGreaterThan(1.5);
    expect(r.riesgo).toBe('alto');
  });

  test('con 21 días de historial promedia sobre 3 semanas, no 4', () => {
    const r = calc.calcularCarga(sesiones(21, 5), HOY);
    expect(r.cronica).toBe(2100); // 7 × 300
    expect(r.ratio).toBe(1);
  });

  test('ignora sesiones fuera de la ventana de 28 días', () => {
    const viejas = [{ fecha: calc.sumarDias(HOY, -40), minutos: 600, rpe: 10 }];
    const r = calc.calcularCarga([...sesiones(28, 5), ...viejas], HOY);
    expect(r.ratio).toBe(1);
  });

  test('clasificarRatio cubre todas las zonas', () => {
    expect(calc.clasificarRatio(0.5).riesgo).toBe('bajo');
    expect(calc.clasificarRatio(1.0).riesgo).toBe('optimo');
    expect(calc.clasificarRatio(1.4).riesgo).toBe('precaucion');
    expect(calc.clasificarRatio(1.6).riesgo).toBe('alto');
  });
});

// ─── cumplimiento ─────────────────────────────────────────────────────────────
describe('calcularCumplimiento', () => {
  // Entrena lunes, miércoles y viernes
  const plan = { semana: [
    { dia: 'Lunes',     ejercicios: [{ nombre: 'Sentadilla' }] },
    { dia: 'Martes',    ejercicios: [] },
    { dia: 'Miércoles', ejercicios: [{ nombre: 'Sprint' }] },
    { dia: 'Viernes',   ejercicios: [{ nombre: 'Core' }] },
  ]};
  const estadoDe = (r, fecha) => r.dias.find(d => d.fecha === fecha).estado;

  test('marca completo, parcial, fallado y descanso', () => {
    const registros = [
      { fecha: '2026-10-19', estado: 'completo' }, // lunes
      { fecha: '2026-10-21', estado: 'parcial' },  // miércoles
    ];
    const r = calc.calcularCumplimiento(plan, registros, HOY, '2026-10-01');
    expect(estadoDe(r, '2026-10-19')).toBe('completo');
    expect(estadoDe(r, '2026-10-20')).toBe('descanso');  // martes
    expect(estadoDe(r, '2026-10-21')).toBe('parcial');
    expect(estadoDe(r, '2026-10-16')).toBe('fallado');   // viernes anterior
    expect(estadoDe(r, HOY)).toBe('descanso');           // jueves
  });

  test('hoy, si toca entrenar y no ha registrado, queda pendiente', () => {
    const r = calc.calcularCumplimiento(plan, [], '2026-10-21', '2026-10-01'); // miércoles
    expect(estadoDe(r, '2026-10-21')).toBe('pendiente');
  });

  test('los días antes de tener plan no cuentan como fallados', () => {
    const r = calc.calcularCumplimiento(plan, [], HOY, '2026-10-20');
    expect(estadoDe(r, '2026-10-19')).toBe('sin-plan');
    expect(estadoDe(r, '2026-10-21')).toBe('fallado');
    expect(r.fallados).toBe(1);
  });

  test('porcentaje: parcial vale medio', () => {
    const registros = [
      { fecha: '2026-10-19', estado: 'completo' },
      { fecha: '2026-10-21', estado: 'parcial' },
    ];
    const r = calc.calcularCumplimiento(plan, registros, HOY, '2026-10-19');
    expect(r).toMatchObject({ completos: 1, parciales: 1, fallados: 0, porcentaje: 75 });
  });

  test('sin plan ni registros el porcentaje es null', () => {
    expect(calc.calcularCumplimiento(null, [], HOY, null).porcentaje).toBeNull();
  });
});

// ─── racha ────────────────────────────────────────────────────────────────────
describe('calcularRacha', () => {
  test('cuenta días seguidos hasta hoy', () => {
    expect(calc.calcularRacha(['2026-10-22', '2026-10-21', '2026-10-20', '2026-10-18'], HOY)).toBe(3);
  });

  test('si hoy aún no registra, cuenta hasta ayer', () => {
    expect(calc.calcularRacha(['2026-10-21', '2026-10-20'], HOY)).toBe(2);
  });

  test('se rompe si faltó ayer y hoy', () => {
    expect(calc.calcularRacha(['2026-10-20'], HOY)).toBe(0);
  });
});

// ─── semanas de lunes a domingo ───────────────────────────────────────────────
describe('calendario de lunes a domingo', () => {
  const plan = { semana: [{ dia: 'Lunes', ejercicios: [{}] }, { dia: 'Sábado', ejercicios: [{}] }] };

  test('lunesDe devuelve el lunes de la semana (domingo pertenece a la semana anterior)', () => {
    expect(calc.lunesDe('2026-10-22')).toBe('2026-10-19'); // jueves
    expect(calc.lunesDe('2026-10-19')).toBe('2026-10-19'); // lunes
    expect(calc.lunesDe('2026-10-25')).toBe('2026-10-19'); // domingo
  });

  test('siempre empieza en lunes y termina en el domingo de esta semana', () => {
    for (const hoy of ['2026-10-19', '2026-10-22', '2026-10-25']) {
      const { dias } = calc.calcularCumplimiento(plan, [], hoy, '2026-09-01');
      expect(dias).toHaveLength(28);
      expect(dias[0].dia).toBe('Lunes');
      expect(dias[27].dia).toBe('Domingo');
      expect(dias[27].fecha).toBe('2026-10-25');
      expect(dias.filter(d => d.hoy).map(d => d.fecha)).toEqual([hoy]);
    }
  });

  test('los días de entreno que aún no llegan son "proximo" y no cuentan como fallados', () => {
    const r = calc.calcularCumplimiento(plan, [], '2026-10-22', '2026-09-01');
    expect(r.dias.find(d => d.fecha === '2026-10-24').estado).toBe('proximo');  // sábado
    expect(r.dias.find(d => d.fecha === '2026-10-25').estado).toBe('descanso'); // domingo
    expect(r.dias.find(d => d.fecha === '2026-10-19').estado).toBe('fallado');  // lunes pasado
    expect(r.dias.some(d => d.fecha > '2026-10-22' && d.estado === 'fallado')).toBe(false);
  });
});

// ─── textos de carga para el atleta ───────────────────────────────────────────
describe('textos de carga', () => {
  test('cada riesgo trae título, mensaje y consejo', () => {
    for (const ratio of [null, 0.5, 1, 1.4, 1.8]) {
      const r = calc.clasificarRatio(ratio);
      expect(r.titulo).toBeTruthy();
      expect(r.mensaje).toBeTruthy();
      expect(r.consejo).toBeTruthy();
    }
  });

  test('cambioPorcentaje compara esta semana con la semana normal', () => {
    const sesiones = Array.from({ length: 28 }, (_, i) => ({
      fecha: calc.sumarDias(HOY, -i), minutos: 60, rpe: i < 7 ? 6 : 5
    }));
    const r = calc.calcularCarga(sesiones, HOY);
    expect(r.cambioPorcentaje).toBe(Math.round((r.ratio - 1) * 100));
    expect(r.cambioPorcentaje).toBeGreaterThan(0);
  });

  test('sin historial suficiente no hay comparación', () => {
    expect(calc.calcularCarga([], HOY)).toMatchObject({ cambioPorcentaje: null, titulo: 'Aún sin datos' });
  });
});
