// Marcas verificadas y anti-trampas: reglas puras e integración con la base pg-mem real.
const calc = require('../servidor/api/clasificacion/clasificacion.calculos');

describe('reglas anti-trampas', () => {
  test('una marca verificada siempre entra', () => {
    expect(calc.motivoSospecha({ tipo: 'test', verificado: true, puntos: 21, mejoraPct: 80, dias: 1 })).toBeNull();
  });

  test('sin verificar: nivel élite o mejora enorme de golpe se quedan fuera', () => {
    expect(calc.motivoSospecha({ tipo: 'test', verificado: false, puntos: 18.2 })).toMatch(/Diamante/);
    expect(calc.motivoSospecha({ tipo: 'test', verificado: false, puntos: 10, mejoraPct: 20, dias: 10 })).toMatch(/15 %/);
    expect(calc.motivoSospecha({ tipo: 'test', verificado: false, puntos: 10, mejoraPct: 20, dias: 200 })).toBeNull(); // mejora en meses: normal
    expect(calc.motivoSospecha({ tipo: 'fuerza', verificado: false, puntos: 10, mejoraPct: 20, dias: 7 })).toBeNull();
    expect(calc.motivoSospecha({ tipo: 'fuerza', verificado: false, puntos: 10, mejoraPct: 30, dias: 7 })).toMatch(/25 %/);
  });

  test('conMejora compara con la mejor marca anterior (también en tiempos)', () => {
    const saltos = calc.conMejora([{ fecha: '2026-10-10', valor: 40 }, { fecha: '2026-10-01', valor: 35 }, { fecha: '2026-10-20', valor: 50 }]);
    expect(saltos.map(s => s.mejoraPct)).toEqual([null, 14.3, 25]);
    expect(saltos[2].dias).toBe(10);
    const sprint = calc.conMejora([{ fecha: '2026-10-01', valor: 2.0 }, { fecha: '2026-10-05', valor: 1.6 }], false);
    expect(sprint[1].mejoraPct).toBe(20);
  });
});

describe('integración', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const evaluaciones = require('../servidor/api/evaluaciones/evaluaciones.service');
  const series = require('../servidor/api/series/series.service');
  const equipos = require('../servidor/api/equipos/equipos.service');
  const clasificacion = require('../servidor/api/clasificacion/clasificacion.service');
  const { hoyISO, sumarDias } = require('../servidor/compartido/fechas');
  const ids = {};
  const u = (nombre, rol) => ({ id: ids[nombre], rol, nombre });

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    await query("UPDATE usuarios SET deporte_principal = 'Fútbol' WHERE email = 'diego@vital.com'");
    const { rows } = await query('SELECT id, email FROM usuarios');
    for (const r of rows) ids[r.email.split('@')[0]] = Number(r.id);
    await query("INSERT INTO perfiles (user_id, sexo, peso) VALUES ($1, 'Hombre', 80), ($2, 'Hombre', 80)", [ids.carlos, ids.diego]);
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('un atleta libre registra sus tests (sin verificar); el del entrenador queda verificado', async () => {
    const propio = await evaluaciones.registrar(ids.diego, { prueba: 'cmj', valor: 38 }, u('diego', 'Atleta'));
    expect(propio.verificado).toBe(false);
    const delProfe = await evaluaciones.registrar(ids.diego, { prueba: 'cmj', valor: 39 }, u('entrenador', 'Entrenador'));
    expect(delProfe.verificado).toBe(true);
    // El atleta no puede borrar la marca que registró su entrenador
    await expect(evaluaciones.eliminar(ids.diego, delProfe.id, u('diego', 'Atleta'))).rejects.toMatchObject({ status: 403 });
    expect(await evaluaciones.eliminar(ids.diego, propio.id, u('diego', 'Atleta'))).toBe(true);
  });

  test('en un equipo, el atleta no registra sus propios tests', async () => {
    const e = await equipos.crear({ nombre: 'Juvenil' });
    await equipos.agregarMiembro(e.id, ids.carlos);
    await equipos.agregarMiembro(e.id, ids.entrenador);
    await expect(evaluaciones.registrar(ids.carlos, { prueba: 'cmj', valor: 40 }, u('carlos', 'Atleta'))).rejects.toMatchObject({ status: 403 });
    const r = await evaluaciones.registrar(ids.carlos, { prueba: 'cmj', valor: 40 }, u('entrenador', 'Entrenador'));
    expect(r.verificado).toBe(true);
  });

  test('el entrenador verifica una serie; el atleta no puede verificarse a sí mismo', async () => {
    const { serie } = await series.registrar(ids.carlos, { ejercicio: 'Peso muerto 3 × 5', peso: 120, repeticiones: 5 });
    await expect(series.verificar(ids.carlos, serie.id, u('carlos', 'Atleta'))).rejects.toMatchObject({ status: 403 });
    const v = await series.verificar(ids.carlos, serie.id, u('entrenador', 'Entrenador'));
    expect(v).toMatchObject({ verificado: true, verificadoPor: 'entrenador' });
    expect((await series.records(ids.carlos))[0].record.verificado).toBe(true);
  });

  test('en el equipo solo cuentan las marcas verificadas', async () => {
    await series.registrar(ids.carlos, { ejercicio: 'Peso muerto 3 × 5', peso: 125, repeticiones: 5 }); // sin verificar
    const r = await clasificacion.marcas(u('carlos', 'Atleta'), { ambito: 'equipo', clave: 'fuerza:pesoMuerto' });
    expect(r.filas[0]).toMatchObject({ marca: expect.stringMatching(/^120 kg/), verificado: true });
    expect(r.faltaDato).toMatch(/verifica tu entrenador/);
  });

  test('en todo el deporte una subida enorme sin verificar no entra', async () => {
    const hace = n => sumarDias(hoyISO(), -n);
    await query("INSERT INTO evaluaciones (user_id, prueba, valor, fecha) VALUES ($1, 'sprint10', 2.2, $2), ($1, 'sprint10', 1.85, $3)", [ids.diego, hace(10), hace(2)]);
    const r = await clasificacion.marcas(u('diego', 'Atleta'), { ambito: 'deporte', clave: 'test:sprint10' });
    expect(r.filas.find(f => f.esYo)).toMatchObject({ marca: '2,2 s', verificado: false }); // entra la de 2,2 s, no la de 1,85 (un 16 % mejor en 8 días)
    expect(r.faltaDato).toMatch(/de golpe/);
  });
});
