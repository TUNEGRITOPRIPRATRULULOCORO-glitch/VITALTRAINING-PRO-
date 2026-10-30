// "Hoy te toca…": cálculo unitario y servicio integrado con la base pg-mem real.
const { construirHoy } = require('../servidor/api/rendimiento/rendimiento.hoy');

const comida = (nombre, kcal) => ({ nombre, kcal, proteina: 30, carbs: 80, grasa: 15 });
const plan = {
  rutinaSemanal: { semana: [
    { dia: 'Jueves', tipo: 'Velocidad + Técnica', ejercicios: [{ nombre: 'Sprint' }, { nombre: 'Rondo' }] },
    { dia: 'Viernes', tipo: 'Activación', ejercicios: [{ nombre: 'Movilidad' }] },
    { dia: 'Sábado', tipo: 'Partido', ejercicios: [{ nombre: 'Partido' }] },
    { dia: 'Domingo', tipo: 'Descanso', ejercicios: [] },
  ] },
  planAlimenticio: { semana: ['Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia, i) => ({
    dia,
    tipoDia: ['entreno', 'precompetencia', 'partido', 'descanso'][i],
    objetivo: { kcal: 2860, proteina: 118, carbs: 400, grasa: 80, aguaLitros: 3.1 },
    desayuno: comida('Avena con plátano', 650), meriendaMañana: comida('Fruta', 200),
    almuerzo: comida('Arroz con pollo', 850), meriendaTarde: comida('Yogur', 250),
    cena: i === 3 ? { nombre: 'Sin opción segura', kcal: 0 } : comida('Salmón con quinoa', 700),
  })) },
};
const base = { fecha: '2026-10-29', dia: 'Jueves', plan, saludHoy: false, listo: { nivel: 'sin-datos' }, sesion: null, comidasHoy: [] };
const tarea = (hoy, id) => hoy.tareas.find(t => t.id === id);

describe('construirHoy', () => {
  test('día de entreno: salud, sesión y 3 comidas pendientes', () => {
    const hoy = construirHoy(base);
    expect(hoy).toMatchObject({ dia: 'Jueves', tipoDia: 'entreno', etiqueta: 'Entreno', progreso: { hechas: 0, total: 5 } });
    expect(hoy.tareas.map(t => t.id)).toEqual(['salud', 'entreno', 'desayuno', 'almuerzo', 'cena']);
    expect(tarea(hoy, 'entreno')).toMatchObject({ titulo: 'Velocidad + Técnica', estado: 'pendiente', ejercicios: 2 });
    expect(tarea(hoy, 'almuerzo').comida).toMatchObject({ nombre: 'Arroz con pollo', kcal: 850 });
    expect(hoy.meriendas.map(m => m.nombre)).toEqual(['Fruta', 'Yogur']);
    expect(hoy.consejos).toEqual(['💧 Agua: 3,1 L', '😴 Duerme 7-9 h']);
  });

  test('marca lo hecho y cuenta el progreso', () => {
    const hoy = construirHoy({ ...base, saludHoy: true, listo: { puntaje: 82, nivel: 'alto', mensaje: 'Estás listo.' }, sesion: 'parcial', comidasHoy: ['desayuno', 'Almuerzo'] });
    expect(tarea(hoy, 'salud').detalle).toMatch(/82\/100/);
    expect(tarea(hoy, 'entreno').estado).toBe('parcial');
    expect(tarea(hoy, 'cena').estado).toBe('pendiente');
    expect(hoy.progreso).toEqual({ hechas: 4, total: 5 });
  });

  test('si el cuerpo pide descanso, lo avisa en la sesión', () => {
    const hoy = construirHoy({ ...base, saludHoy: true, listo: { puntaje: 40, nivel: 'bajo', mensaje: 'Descansa.' } });
    expect(tarea(hoy, 'entreno').detalle).toMatch(/pide descanso/);
  });

  test('víspera y día de partido cambian el mensaje y el sueño', () => {
    const vispera = construirHoy({ ...base, dia: 'Viernes' });
    expect(vispera).toMatchObject({ etiqueta: 'Víspera de partido' });
    expect(vispera.consejos).toContain('😴 Duerme 8-9 h');
    expect(construirHoy({ ...base, dia: 'Sábado' }).mensaje).toMatch(/3-4 h antes/);
  });

  test('día de descanso: la sesión no cuenta y una comida sin opción segura no se pide', () => {
    const hoy = construirHoy({ ...base, dia: 'Domingo' });
    expect(tarea(hoy, 'entreno').estado).toBe('descanso');
    expect(tarea(hoy, 'cena')).toBeUndefined();
    expect(hoy.progreso.total).toBe(3); // salud, desayuno y almuerzo
  });

  test('de baja médica la sesión queda en pausa y no cuenta', () => {
    const hoy = construirHoy({ ...base, estadoMedico: { estado: 'no_apto', zonas: ['Tobillo'], activas: [{ indicaciones: 'Reposo' }] } });
    expect(hoy).toMatchObject({ etiqueta: 'Baja médica' });
    expect(hoy.mensaje).toMatch(/Tobillo.*Reposo/);
    expect(tarea(hoy, 'entreno').estado).toBe('baja');
    expect(hoy.progreso.total).toBe(4);
  });

  test('en recuperación, la sesión se hace adaptada', () => {
    const hoy = construirHoy({ ...base, estadoMedico: { estado: 'adaptado', zonas: ['Rodilla'], activas: [] } });
    expect(tarea(hoy, 'entreno').detalle).toMatch(/Adaptado.*Rodilla/);
  });

  test('sin perfil médico pide completarlo', () => {
    const hoy = construirHoy({ ...base, plan: null });
    expect(hoy.tareas.map(t => t.id)).toEqual(['salud', 'plan']);
    expect(hoy.mensaje).toMatch(/perfil médico/);
  });
});

describe('servicio (integración)', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const svc = require('../servidor/api/rendimiento/rendimiento.service');
  const perfilMedico = require('../servidor/api/perfilMedico/perfilMedico.service');
  const { hoyISO } = require('../servidor/compartido/fechas');
  let carlos;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    carlos = Number((await query("SELECT id FROM usuarios WHERE email = 'carlos@vital.com'")).rows[0].id);
    await perfilMedico.guardar(carlos, { condiciones: [], alergias: [], preferencias: 'Sin restricciones' }, 'Delantero', 'Fútbol');
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('arma el día con la rutina y el plan del atleta, y marca lo que apuntó', async () => {
    const antes = await svc.obtenerHoy(carlos);
    expect(antes.tareas[0]).toMatchObject({ id: 'salud', estado: 'pendiente' });
    expect(antes.tareas.some(t => t.id === 'entreno')).toBe(true);
    const desayuno = antes.tareas.find(t => t.id === 'desayuno');
    expect(desayuno.comida.kcal).toBeGreaterThan(0);

    await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1, $2, 3, 8, 8)', [carlos, hoyISO()]);
    await query("INSERT INTO comidas (user_id, nombre, tipo, calorias, fecha) VALUES ($1, 'Avena', 'desayuno', 600, $2)", [carlos, hoyISO()]);
    const despues = await svc.obtenerHoy(carlos);
    expect(despues.tareas.find(t => t.id === 'salud').estado).toBe('hecho');
    expect(despues.tareas.find(t => t.id === 'desayuno').estado).toBe('hecho');
    expect(despues.progreso.hechas).toBe(antes.progreso.hechas + 2);
  });
});
