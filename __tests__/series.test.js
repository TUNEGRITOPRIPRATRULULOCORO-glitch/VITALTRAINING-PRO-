// Registro serie a serie: cálculos unitarios y servicio integrado con la base pg-mem real.
const calc = require('../servidor/api/series/series.calculos');

const s = (id, fecha, peso, repeticiones) => ({ id, fecha, peso, repeticiones });

describe('1RM estimado y récords', () => {
  test('Epley, con tope de 12 repeticiones y sin peso no hay 1RM', () => {
    expect(calc.e1rm(100, 5)).toBe(116.5);
    expect(calc.e1rm(60, 20)).toBe(calc.e1rm(60, 12));
    expect(calc.e1rm(null, 10)).toBeNull();
  });

  test('la mejor marca es la del 1RM más alto, y en empate la primera', () => {
    const series = [s(1, '2026-10-01', 80, 8), s(2, '2026-10-08', 90, 3), s(3, '2026-10-15', 80, 8)];
    expect(calc.mejorMarca(series)).toMatchObject({ peso: 80, repeticiones: 8, id: 1, fecha: '2026-10-01' });
  });

  test('con el propio cuerpo, gana quien hace más repeticiones', () => {
    expect(calc.mejorMarca([s(1, 'a', null, 10), s(2, 'b', null, 14), s(3, 'c', null, 12)]).repeticiones).toBe(14);
  });

  test('esRecord: la primera marca no cuenta y luego hay que superar el 1RM', () => {
    expect(calc.esRecord(s(9, 'x', 60, 8), [])).toBe(false);
    const previas = [s(1, 'a', 60, 8)];
    expect(calc.esRecord(s(2, 'b', 60, 9), previas)).toBe(true);
    expect(calc.esRecord(s(3, 'b', 60, 8), previas)).toBe(false);
    expect(calc.esRecord(s(4, 'b', null, 20), [s(1, 'a', null, 15)])).toBe(true);
  });

  test('porSesion agrupa por fecha, de la más reciente a la más antigua, con su volumen', () => {
    const sesiones = calc.porSesion([s(1, '2026-10-01', 50, 10), s(2, '2026-10-08', 55, 10), s(3, '2026-10-01', 50, 8)]);
    expect(sesiones.map(x => x.fecha)).toEqual(['2026-10-08', '2026-10-01']);
    expect(sesiones[1]).toMatchObject({ volumen: 900 });
    expect(sesiones[1].series.map(x => x.repeticiones)).toEqual([10, 8]);
  });
});

describe('sugerencia (doble progresión)', () => {
  const sesion = (...series) => ({ series: series.map(([peso, repeticiones]) => ({ peso, repeticiones })) });

  test('primera vez: pide elegir un peso cómodo', () => {
    expect(calc.sugerir(null, 10)).toMatchObject({ peso: null, repeticiones: 10 });
    expect(calc.sugerir(null, 10).texto).toMatch(/sobren 2 o 3/);
  });

  test('completó el objetivo en todas las series: sube 2,5 kg (1 kg si es poco peso)', () => {
    expect(calc.sugerir(sesion([60, 10], [60, 10], [60, 11]), 10)).toMatchObject({ peso: 62.5, repeticiones: 10 });
    expect(calc.sugerir(sesion([12, 12], [12, 12]), 12)).toMatchObject({ peso: 13 });
  });

  test('no completó el objetivo: mismo peso y una repetición más', () => {
    const r = calc.sugerir(sesion([60, 10], [60, 8], [60, 7]), 10);
    expect(r).toMatchObject({ peso: 60, repeticiones: 8 });
    expect(r.texto).toMatch(/Mantén 60 kg/);
  });

  test('con el propio cuerpo: una repetición más que la mejor serie', () => {
    expect(calc.sugerir(sesion([null, 12], [null, 10]), 12)).toMatchObject({ peso: null, repeticiones: 13 });
  });

  test('lesionado o con el cuerpo pidiendo descanso: no sube', () => {
    expect(calc.sugerir(sesion([60, 10], [60, 10]), 10, 'lesion')).toMatchObject({ peso: 60, repeticiones: 10 });
    expect(calc.sugerir(sesion([60, 10]), 10, 'descanso').texto).toMatch(/no subas/);
  });
});

describe('servicio (integración)', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const svc = require('../servidor/api/series/series.service');
  const { hoyISO, sumarDias } = require('../servidor/compartido/fechas');
  let carlos, diego;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    const id = async email => Number((await query('SELECT id FROM usuarios WHERE email = $1', [email])).rows[0].id);
    carlos = await id('carlos@vital.com');
    diego = await id('diego@vital.com');
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('apunta series, ve la sesión anterior y avisa de un récord nuevo', async () => {
    const ayer = sumarDias(hoyISO(), -3);
    for (const reps of [10, 10, 10]) await svc.registrar(carlos, { ejercicio: 'Sentadilla goblet', peso: 20, repeticiones: reps, fecha: ayer });

    const antes = await svc.ejercicio(carlos, 'Sentadilla goblet', 10);
    expect(antes.anterior).toMatchObject({ fecha: ayer, volumen: 600 });
    expect(antes.sugerencia).toMatchObject({ peso: 22.5, repeticiones: 10 });
    expect(antes.hoy).toEqual([]);

    const primera = await svc.registrar(carlos, { ejercicio: 'Sentadilla goblet', peso: '22.5', repeticiones: 10 });
    expect(primera).toMatchObject({ record: true, serie: { peso: 22.5, repeticiones: 10, fecha: hoyISO() } });
    const segunda = await svc.registrar(carlos, { ejercicio: 'Sentadilla goblet', peso: 22.5, repeticiones: 9 });
    expect(segunda.record).toBe(false);

    const despues = await svc.ejercicio(carlos, 'Sentadilla goblet', 10);
    expect(despues.hoy.map(x => x.repeticiones)).toEqual([10, 9]);
    expect(despues.record).toMatchObject({ peso: 22.5, repeticiones: 10 });
    expect(despues.historial).toHaveLength(1);
    expect(await svc.resumenHoy(carlos)).toEqual({ 'Sentadilla goblet': 2 });
  });

  test('peso corporal: sin peso se guarda como vacío', async () => {
    const r = await svc.registrar(carlos, { ejercicio: 'Flexiones', peso: '', repeticiones: 15 });
    expect(r.serie.peso).toBeNull();
    expect(r.e1rm).toBeNull();
  });

  test('records: la mejor marca de cada ejercicio', async () => {
    const lista = await svc.records(carlos);
    expect(lista.map(r => r.ejercicio).sort()).toEqual(['Flexiones', 'Sentadilla goblet']);
    expect(lista.find(r => r.ejercicio === 'Sentadilla goblet')).toMatchObject({ sesiones: 2, record: { peso: 22.5 } });
  });

  test('rechaza datos imposibles y solo borra series propias', async () => {
    await expect(svc.registrar(carlos, { ejercicio: 'Press', peso: 50, repeticiones: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(svc.registrar(carlos, { ejercicio: 'Press', peso: 9000, repeticiones: 5 })).rejects.toMatchObject({ status: 400 });
    await expect(svc.registrar(carlos, { ejercicio: '', repeticiones: 5 })).rejects.toMatchObject({ status: 400 });
    await expect(svc.registrar(carlos, { ejercicio: 'Press', repeticiones: 5, fecha: '2999-01-01' })).rejects.toMatchObject({ status: 400 });
    const { serie } = await svc.registrar(carlos, { ejercicio: 'Press', peso: 30, repeticiones: 8 });
    expect(await svc.eliminar(diego, serie.id)).toBe(false);
    expect(await svc.eliminar(carlos, serie.id)).toBe(true);
  });
});
