// Catálogo: unitario. Servicio: integración con la base pg-mem real (sin mocks).
const cat = require('../servidor/api/evaluaciones/evaluaciones.catalogo');
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/evaluaciones/evaluaciones.service');

const HOY = '2026-10-22';

describe('catálogo de pruebas', () => {
  test('cada deporte de la app tiene entre 3 y 5 pruebas y todas existen', () => {
    const { DEPORTES } = require('../servidor/compartido/deportes');
    expect(Object.keys(cat.BATERIAS).sort()).toEqual([...DEPORTES].sort());
    for (const [deporte, ids] of Object.entries(cat.BATERIAS)) {
      expect(ids.length).toBeGreaterThanOrEqual(3);
      expect(ids.length).toBeLessThanOrEqual(5);
      expect(ids.every(id => id in cat.PRUEBAS)).toBe(true);
      expect(cat.pruebasDe(deporte).every(p => p.nombre && p.unidad && p.instrucciones)).toBe(true);
    }
  });

  test('deporte desconocido usa la batería de fútbol', () => {
    expect(cat.pruebasDe('Curling').map(p => p.id)).toEqual(cat.BATERIAS['Fútbol']);
  });

  test('validarValor rechaza resultados imposibles', () => {
    expect(cat.validarValor('sprint10', 1.8)).toBeNull();
    expect(cat.validarValor('sprint10', 0.5)).toMatch(/entre 1.3 y 3.5 s/);
    expect(cat.validarValor('cmj', 'mucho')).toMatch(/número/);
    expect(cat.validarValor('inventada', 3)).toMatch(/desconocida/);
  });
});

describe('compararCon', () => {
  const salto = cat.PRUEBAS.cmj;          // más es mejor, margen 4 %
  const sprint = cat.PRUEBAS.sprint10;    // menos es mejor, margen 2 %

  test('en pruebas de "más es mejor", subir es mejora', () => {
    expect(cat.compararCon(salto, 42, 38)).toMatchObject({ tendencia: 'mejora', cambioPct: 10.5 });
  });

  test('en pruebas de tiempo, bajar es mejora', () => {
    expect(cat.compararCon(sprint, 1.70, 1.80)).toMatchObject({ tendencia: 'mejora', cambioPct: 5.6 });
    expect(cat.compararCon(sprint, 1.90, 1.80).tendencia).toBe('empeora');
  });

  test('un cambio dentro del margen de error no se cuenta como mejora', () => {
    expect(cat.compararCon(salto, 39, 38)).toMatchObject({ tendencia: 'estable' }); // +2,6 % < 4 %
    expect(cat.compararCon(sprint, 1.79, 1.80).tendencia).toBe('estable');
  });

  test('la primera medición no tiene con qué compararse', () => {
    expect(cat.compararCon(salto, 40, null)).toEqual({ cambioPct: null, tendencia: 'primera' });
  });
});

describe('resumir', () => {
  const r = (id, prueba, valor, fecha) => ({ id, prueba, valor, fecha });

  test('ordena el historial y calcula última, anterior y mejor marca', () => {
    const res = cat.resumir('Fútbol', [
      r(2, 'sprint10', 1.76, '2026-10-12'), r(1, 'sprint10', 1.82, '2026-08-03'), r(3, 'sprint10', 1.79, '2026-09-07'),
    ], HOY);
    const s = res.pruebas.find(p => p.id === 'sprint10');
    expect(s.historial.map(h => h.valor)).toEqual([1.82, 1.79, 1.76]);
    expect(s.ultimo.valor).toBe(1.76);
    expect(s.anterior.valor).toBe(1.79);
    expect(s.mejorMarca.valor).toBe(1.76);
    expect(s.mejor).toBe('menor'); // la dirección de la prueba no se pisa
    expect(s.tendencia).toBe('estable'); // -1,7 % está dentro del margen del 2 %
  });

  test('avisa cuando toca repetir los tests', () => {
    expect(cat.resumir('Fútbol', [], HOY).proxima).toBe('sin-datos');
    expect(cat.resumir('Fútbol', [r(1, 'cmj', 40, '2026-10-12')], HOY).proxima).toBe('al-dia');
    expect(cat.resumir('Fútbol', [r(1, 'cmj', 40, '2026-09-20')], HOY).proxima).toBe('toca');
    expect(cat.resumir('Fútbol', [r(1, 'cmj', 40, '2026-08-01')], HOY)).toMatchObject({ proxima: 'atrasada', diasDesde: 82 });
  });
});

describe('servicio de evaluaciones (integración)', () => {
  const ids = {};

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    const { rows } = await query('SELECT id, email FROM usuarios');
    for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('usa la batería del deporte del atleta', async () => {
    const res = await svc.obtener(ids.diego); // baloncesto
    expect(res.deporte).toBe('Baloncesto');
    expect(res.pruebas.map(p => p.id)).toContain('laneAgility');
  });

  test('registra resultados, los devuelve como números y calcula la tendencia', async () => {
    await svc.registrar(ids.carlos, { prueba: 'cmj', valor: '38', fecha: '2026-08-01' }, { nombre: 'Dr. Vital' });
    const nuevo = await svc.registrar(ids.carlos, { prueba: 'cmj', valor: 42.5, fecha: '2026-09-15', notas: 'Buen día' }, { nombre: 'Dr. Vital' });
    expect(nuevo).toMatchObject({ prueba: 'cmj', valor: 42.5, fecha: '2026-09-15', registradoPor: 'Dr. Vital' });

    const cmj = (await svc.obtener(ids.carlos)).pruebas.find(p => p.id === 'cmj');
    expect(cmj.historial).toHaveLength(2);
    expect(cmj.tendencia).toBe('mejora');
  });

  test('rechaza pruebas de otro deporte, valores imposibles y fechas futuras', async () => {
    await expect(svc.registrar(ids.carlos, { prueba: 'laneAgility', valor: 11 })).rejects.toMatchObject({ status: 400 });
    await expect(svc.registrar(ids.carlos, { prueba: 'sprint10', valor: 0.3 })).rejects.toMatchObject({ status: 400 });
    await expect(svc.registrar(ids.carlos, { prueba: 'sprint10', valor: 1.8, fecha: '2999-01-01' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.obtener(999999)).rejects.toMatchObject({ status: 404 });
  });

  test('solo borra resultados del propio atleta', async () => {
    const r = await svc.registrar(ids.carlos, { prueba: 'sprint10', valor: 1.8 });
    expect(await svc.eliminar(ids.diego, r.id)).toBe(false);
    expect(await svc.eliminar(ids.carlos, r.id)).toBe(true);
  });
});
