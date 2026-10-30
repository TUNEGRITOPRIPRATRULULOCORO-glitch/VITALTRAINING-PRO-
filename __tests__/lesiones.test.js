// Lesiones: catálogo y cálculos unitarios; servicio integrado con la base pg-mem real (sin mocks).
const cat = require('../servidor/api/lesiones/lesiones.catalogo');
const calc = require('../servidor/api/rendimiento/rendimiento.calculos');
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/lesiones/lesiones.service');
const rendimiento = require('../servidor/api/rendimiento');
const asistente = require('../servidor/api/ia/asistente');
const { hoyISO, sumarDias } = require('../servidor/compartido/fechas');

describe('estado médico', () => {
  test('sin lesiones activas es apto', () => {
    expect(cat.estadoDesde([])).toMatchObject({ estado: 'apto', etiqueta: 'Apto', zonas: [] });
  });

  test('una baja gana sobre una lesión en recuperación', () => {
    const e = cat.estadoDesde([
      { zona: 'Rodilla', restriccion: 'adaptado' },
      { zona: 'Tobillo', restriccion: 'no_apto' },
    ]);
    expect(e).toMatchObject({ estado: 'no_apto', etiqueta: 'Baja médica', zonas: ['Rodilla', 'Tobillo'] });
    expect(cat.estadoDesde([{ zona: 'Rodilla', restriccion: 'adaptado' }]).estado).toBe('adaptado');
  });

  test('valida zona, tipo, gravedad y fechas', () => {
    const ok = { zona: 'Rodilla', tipo: 'Muscular', gravedad: 'leve', fechaInicio: '2026-10-01' };
    expect(cat.validarLesion(ok, '2026-10-22')).toBeNull();
    expect(cat.validarLesion({ ...ok, zona: 'Nariz' }, '2026-10-22')).toMatch(/zona/);
    expect(cat.validarLesion({ ...ok, gravedad: 'mortal' }, '2026-10-22')).toMatch(/gravedad/);
    expect(cat.validarLesion({ ...ok, fechaInicio: '2026-11-01' }, '2026-10-22')).toMatch(/futuro/);
    expect(cat.validarLesion({ ...ok, altaEstimada: '2026-09-01' }, '2026-10-22')).toMatch(/anterior/);
    expect(cat.validarLesion({ gravedad: 'grave' }, '2026-10-22', { parcial: true })).toBeNull();
  });
});

describe('rendimiento con lesiones', () => {
  const salud = { fatiga: 1, sueno: 10, recuperacion: 10 }; // daría 100

  test('de baja no está listo para entrenar, aunque la salud sea perfecta', () => {
    const r = calc.calcularListo(salud, 'optimo', { estado: 'no_apto', zonas: ['Tobillo'] });
    expect(r).toMatchObject({ puntaje: null, nivel: 'baja' });
    expect(r.mensaje).toMatch(/baja médica \(Tobillo\)/);
  });

  test('en recuperación el nivel no pasa de "medio"', () => {
    const r = calc.calcularListo(salud, 'optimo', { estado: 'adaptado', zonas: ['Rodilla'] });
    expect(r).toMatchObject({ puntaje: 100, nivel: 'medio' });
    expect(r.mensaje).toMatch(/recuperación \(Rodilla\)/);
    expect(calc.calcularListo(null, null, { estado: 'adaptado', zonas: [] }).nivel).toBe('sin-datos');
  });

  test('los días lesionado no cuentan como sesiones falladas', () => {
    const plan = { semana: [{ dia: 'Lunes', ejercicios: [{ nombre: 'Sentadilla' }] }, { dia: 'Miércoles', ejercicios: [{ nombre: 'Sprint' }] }] };
    const periodos = [{ desde: '2026-10-12', hasta: '2026-10-19' }];
    const r = calc.calcularCumplimiento(plan, [], '2026-10-22', '2026-10-01', periodos);
    const estado = f => r.dias.find(d => d.fecha === f).estado;
    expect(estado('2026-10-14')).toBe('lesion');  // miércoles lesionado
    expect(estado('2026-10-19')).toBe('lesion');  // lunes, último día antes del alta
    expect(estado('2026-10-21')).toBe('fallado'); // miércoles ya de alta
    expect(estado('2026-10-07')).toBe('fallado'); // antes de la lesión
    expect(r.fallados).toBe(3);                   // 5, 7 y 21 de octubre
  });
});

describe('servicio de lesiones (integración)', () => {
  const ids = {};
  const medico = () => ({ id: ids.medico, rol: 'Medico', nombre: 'Dr. Vital' });

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    const { rows } = await query('SELECT id, email FROM usuarios');
    for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('registrar una baja cambia el estado, avisa al atleta y llega a rendimiento', async () => {
    const lesion = await svc.registrar(ids.carlos, {
      zona: 'Tobillo', tipo: 'Ligamento o articulación', gravedad: 'moderada', indicaciones: 'Hielo y reposo',
    }, medico());
    expect(lesion).toMatchObject({ zona: 'Tobillo', restriccion: 'no_apto', fechaInicio: hoyISO(), fechaAlta: null, registradoPor: 'Dr. Vital' });

    const exp = await svc.obtener(ids.carlos, medico());
    expect(exp.estado.estado).toBe('no_apto');
    expect(exp.activas).toHaveLength(1);

    const { rows } = await query("SELECT mensaje FROM alertas WHERE user_id = $1 AND tipo = 'lesion'", [ids.carlos]);
    expect(rows.at(-1).mensaje).toMatch(/baja/);

    const resumen = await rendimiento.obtenerResumen(ids.carlos);
    expect(resumen.listo.nivel).toBe('baja');
    expect(resumen.estadoMedico).toMatchObject({ estado: 'no_apto', zonas: ['Tobillo'] });
  });

  test('Vita recuerda la baja cuando el atleta pregunta por entrenar', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await asistente.conversar(ids.carlos, '¿Puedo entrenar hoy?');
    expect(r.respuesta).toMatch(/de baja.*Tobillo/);
    expect(r.respuesta).toMatch(/Hielo y reposo/);
    // De baja no se añade la respuesta normal ("estás listo", "en condiciones de partido"...)
    expect(r.respuesta).toMatch(/tu trabajo es recuperarte/);
    expect(r.respuesta).not.toMatch(/listo|en condiciones/i);
    expect(await asistente.contextoAtleta(ids.carlos)).toMatch(/Estado médico: Baja médica/);
    await asistente.borrarConversacion(ids.carlos);
  });

  test('pasar a entreno adaptado y dar el alta', async () => {
    const [activa] = (await svc.obtener(ids.carlos, medico())).activas;
    const editada = await svc.actualizar(ids.carlos, activa.id, { restriccion: 'adaptado', altaEstimada: sumarDias(hoyISO(), 7) });
    expect(editada.restriccion).toBe('adaptado');
    expect((await svc.estadoDe(ids.carlos)).estado).toBe('adaptado');

    await expect(svc.darAlta(ids.carlos, activa.id, '2999-01-01')).rejects.toMatchObject({ status: 400 });
    const alta = await svc.darAlta(ids.carlos, activa.id);
    expect(alta.fechaAlta).toBe(hoyISO());
    await expect(svc.darAlta(ids.carlos, activa.id)).rejects.toMatchObject({ status: 400 });

    const exp = await svc.obtener(ids.carlos, medico());
    expect(exp.estado.estado).toBe('apto');
    expect(exp.historial).toHaveLength(1);
  });

  test('rechaza datos inválidos y lesiones de otro atleta', async () => {
    await expect(svc.registrar(ids.carlos, { zona: 'Nariz', tipo: 'Muscular', gravedad: 'leve' }, medico())).rejects.toMatchObject({ status: 400 });
    await expect(svc.registrar(999999, { zona: 'Pie', tipo: 'Muscular', gravedad: 'leve' }, medico())).rejects.toMatchObject({ status: 404 });
    const l = await svc.registrar(ids.carlos, { zona: 'Pie', tipo: 'Contusión', gravedad: 'leve', restriccion: 'adaptado' }, medico());
    await expect(svc.actualizar(ids.diego, l.id, { gravedad: 'grave' })).rejects.toMatchObject({ status: 404 });
    expect(await svc.eliminar(ids.diego, l.id)).toBe(false);
    expect(await svc.eliminar(ids.carlos, l.id)).toBe(true);
  });

  test('notas clínicas: el atleta solo ve las visibles y los demás roles ninguna', async () => {
    await svc.agregarNota(ids.carlos, { texto: 'Evolución favorable.' }, medico());
    await svc.agregarNota(ids.carlos, { texto: 'Valorar resonancia.', visibleAtleta: false }, medico());
    await expect(svc.agregarNota(ids.carlos, { texto: '   ' }, medico())).rejects.toMatchObject({ status: 400 });

    expect((await svc.obtener(ids.carlos, medico())).notas.map(n => n.texto)).toEqual(['Valorar resonancia.', 'Evolución favorable.']);
    expect((await svc.obtener(ids.carlos, { id: ids.carlos, rol: 'Atleta' })).notas.map(n => n.texto)).toEqual(['Evolución favorable.']);
    expect((await svc.obtener(ids.carlos, { id: ids.maria, rol: 'Nutricionista' })).notas).toBeNull();
  });

  test('cada médico solo borra sus propias notas', async () => {
    const nota = await svc.agregarNota(ids.carlos, { texto: 'Para borrar' }, medico());
    expect(await svc.eliminarNota(ids.carlos, nota.id, { id: ids.admin })).toBe(false);
    expect(await svc.eliminarNota(ids.carlos, nota.id, medico())).toBe(true);
  });
});

describe('permisos de las rutas', () => {
  const ids = {};
  let servidor, base, usuario;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    const { rows } = await query('SELECT id, email FROM usuarios');
    for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
    // App mínima: la sesión la pone el test en vez del middleware de JWT
    const app = require('express')();
    app.use(require('express').json());
    app.use((req, res, next) => { req.user = usuario; next(); });
    app.use('/api/lesiones', require('../servidor/api/lesiones').router);
    servidor = app.listen(0);
    base = `http://127.0.0.1:${servidor.address().port}/api/lesiones`;
  }, 30000);

  afterAll(() => { servidor.close(); console.log.mockRestore(); });

  const pedir = (como, metodo, ruta, cuerpo) => {
    usuario = como;
    return fetch(base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) });
  };
  const lesion = { zona: 'Rodilla', tipo: 'Muscular', gravedad: 'leve' };

  test('solo el médico registra lesiones y notas', async () => {
    const atleta = { id: ids.carlos, rol: 'Atleta' };
    const nutri = { id: ids.maria, rol: 'Nutricionista' };
    expect((await pedir(atleta, 'POST', `/${ids.carlos}`, lesion)).status).toBe(403);
    expect((await pedir(nutri, 'POST', `/${ids.carlos}`, lesion)).status).toBe(403);
    expect((await pedir(atleta, 'POST', `/${ids.carlos}/notas`, { texto: 'hola' })).status).toBe(403);
    const res = await pedir({ id: ids.medico, rol: 'Medico', nombre: 'Dr. Vital' }, 'POST', `/${ids.carlos}`, lesion);
    expect(res.status).toBe(201);
    await svc.eliminar(ids.carlos, (await res.json()).lesion.id);
  });

  test('el atleta ve su expediente pero no el de otro', async () => {
    const atleta = { id: ids.carlos, rol: 'Atleta' };
    expect((await pedir(atleta, 'GET', `/${ids.carlos}`)).status).toBe(200);
    expect((await pedir(atleta, 'GET', `/${ids.diego}`)).status).toBe(403);
    expect((await pedir({ id: ids.maria, rol: 'Nutricionista' }, 'GET', `/${ids.diego}`)).status).toBe(200);
  });
});
