// Rangos: escala unitaria y servicio integrado con la base pg-mem real.
const cat = require('../servidor/api/rangos/rangos.catalogo');

describe('escala de rangos', () => {
  test('22 pasos: Bronce I … Diamante III y Radiante sin división', () => {
    expect(cat.rangoDe(0).etiqueta).toBe('Bronce I');
    expect(cat.rangoDe(5).etiqueta).toBe('Plata III');
    expect(cat.rangoDe(20).etiqueta).toBe('Diamante III');
    expect(cat.rangoDe(21)).toMatchObject({ etiqueta: 'Radiante', division: null });
    expect(cat.rangoDe(99).paso).toBe(21);
  });

  test('cada referencia cae en su rango (más es mejor)', () => {
    const refs = [25, 33, 40, 48, 58]; // CMJ hombres
    expect(cat.rangoDe(cat.pasoDe(25, refs)).etiqueta).toBe('Plata I');
    expect(cat.rangoDe(cat.pasoDe(33, refs)).etiqueta).toBe('Oro I');
    expect(cat.rangoDe(cat.pasoDe(40, refs)).etiqueta).toBe('Platino I');
    expect(cat.rangoDe(cat.pasoDe(48, refs)).etiqueta).toBe('Rubí I');
    expect(cat.pasoDe(58, refs)).toBe(21);
    expect(cat.pasoDe(5, refs)).toBe(0);
    expect(cat.pasoDe(36.5, refs)).toBe(7); // a medio camino entre Oro I y Platino I
  });

  test('también funciona cuando menos es mejor (tiempos)', () => {
    const refs = cat.TESTS.sprint10.h; // 2.1 … 1.62 s
    expect(cat.pasoDe(2.1, refs)).toBe(3);
    expect(cat.pasoDe(1.82, refs)).toBe(9);
    expect(cat.pasoDe(1.5, refs)).toBe(21);
    expect(cat.pasoDe(3, refs)).toBe(0);
    expect(cat.pasoDe(1.95, refs)).toBeGreaterThan(cat.pasoDe(2.0, refs));
  });

  test('valorParaPaso es el inverso de pasoDe', () => {
    const refs = cat.FUERZA.find(f => f.id === 'sentadilla').h;
    for (const paso of [1, 4, 8, 12, 18]) expect(cat.pasoDe(cat.valorParaPaso(paso, refs) + 1e-6, refs)).toBe(paso);
  });

  test('referencias por sexo, y el punto medio si no se indicó', () => {
    const def = cat.TESTS.cmj;
    expect(cat.referenciasPara(def, 'Mujer')).toEqual(def.m);
    expect(cat.referenciasPara(def, null)[0]).toBe(21.5);
    expect(cat.pasoDe(30, cat.referenciasPara(def, 'Mujer'))).toBeGreaterThan(cat.pasoDe(30, cat.referenciasPara(def, 'Hombre')));
  });

  test('reconoce los ejercicios de fuerza por su nombre', () => {
    expect(cat.ejercicioDeFuerza('Sentadilla con barra 5 × 5').id).toBe('sentadilla');
    expect(cat.ejercicioDeFuerza('Peso muerto 3 × 5').id).toBe('pesoMuerto');
    expect(cat.ejercicioDeFuerza('Peso muerto rumano').id).toBe('rumano');
    expect(cat.ejercicioDeFuerza('Sentadilla (barra o goblet)')).toBeNull(); // ambiguo: no se compara
    expect(cat.ejercicioDeFuerza('Tiro tras bote (pull-up)')).toBeNull();
  });
});

describe('servicio (integración)', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const svc = require('../servidor/api/rangos/rangos.service');
  const series = require('../servidor/api/series/series.service');
  const lesiones = require('../servidor/api/lesiones/lesiones.service');
  const { sumarDias, hoyISO } = require('../servidor/compartido/fechas');
  let carlos;
  const yo = () => ({ id: carlos, rol: 'Atleta' });

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    carlos = Number((await query("SELECT id FROM usuarios WHERE email = 'carlos@vital.com'")).rows[0].id);
    await query("INSERT INTO perfiles (user_id, peso, sexo) VALUES ($1, 80, 'Hombre')", [carlos]);
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('rango en fuerza (relativo al peso) y en tests, con lo que falta', async () => {
    // 100 kg × 5 → ≈ 116,5 kg máx. → 1,46 × 80 kg
    await series.registrar(carlos, { ejercicio: 'Sentadilla con barra 5 × 5', peso: 100, repeticiones: 5, fecha: sumarDias(hoyISO(), -2) });
    await query("INSERT INTO evaluaciones (user_id, prueba, valor, fecha) VALUES ($1, 'cmj', 40, $2)", [carlos, hoyISO()]);

    const r = await svc.obtener(carlos, yo());
    const sentadilla = r.rangos.find(x => x.tipo === 'fuerza');
    expect(sentadilla.rango.etiqueta).toBe('Oro III');
    expect(sentadilla.marca).toMatch(/1,46 × tu peso/);
    expect(sentadilla.siguiente.rango.etiqueta).toBe('Platino I');
    expect(sentadilla.siguiente.falta).toMatch(/más en tu máximo estimado/);
    expect(sentadilla.nuevo).toBe(true);

    const salto = r.rangos.find(x => x.clave === 'test:cmj');
    expect(salto.rango.etiqueta).toBe('Platino I');
    expect(salto.siguiente.falta).toMatch(/cm más/);
    expect(r.mejor.etiqueta).toBe('Platino I');
  });

  test('subir de rango se celebra una vez y nunca se baja', async () => {
    await series.registrar(carlos, { ejercicio: 'Sentadilla con barra 5 × 5', peso: 115, repeticiones: 5 });
    const subida = (await svc.obtener(carlos, yo())).rangos.find(x => x.tipo === 'fuerza');
    expect(subida).toMatchObject({ subio: true });
    expect(subida.rango.paso).toBeGreaterThan(8);
    expect((await svc.obtener(carlos, yo())).rangos.find(x => x.tipo === 'fuerza').subio).toBe(false);

    // Si sube su peso corporal, su marca relativa baja, pero el rango no
    const paso = subida.rango.paso;
    await query('UPDATE perfiles SET peso = 95 WHERE user_id = $1', [carlos]);
    expect((await svc.obtener(carlos, yo())).rangos.find(x => x.tipo === 'fuerza').rango.paso).toBe(paso);
    await query('UPDATE perfiles SET peso = 80 WHERE user_id = $1', [carlos]);
  });

  test('un profesional ve los rangos sin guardar subidas', async () => {
    await query("INSERT INTO evaluaciones (user_id, prueba, valor, fecha) VALUES ($1, 'cmj', 50, $2)", [carlos, hoyISO()]);
    const visto = (await svc.obtener(carlos, { id: 1, rol: 'Medico' })).rangos.find(x => x.clave === 'test:cmj');
    expect(visto.subio).toBe(false);
    expect((await svc.obtener(carlos, yo())).rangos.find(x => x.clave === 'test:cmj').subio).toBe(true);
  });

  test('de baja médica los rangos quedan en pausa', async () => {
    await lesiones.registrar(carlos, { zona: 'Rodilla', tipo: 'Muscular', gravedad: 'leve' }, { nombre: 'Dr. Vital' });
    const r = await svc.obtener(carlos, yo());
    expect(r.enPausa).toBe(true);
    expect(r.rangos.every(x => x.siguiente === null)).toBe(true);
  });
});
