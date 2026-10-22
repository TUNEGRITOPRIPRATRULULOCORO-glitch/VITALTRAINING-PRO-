// Test de integración: usa la base pg-mem real (sin mocks) para validar las consultas SQL
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/rendimiento/rendimiento.service');

const dia = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

let carlos, diego;

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  const { rows } = await query("SELECT id, email FROM usuarios WHERE email IN ('carlos@vital.com', 'diego@vital.com')");
  carlos = Number(rows.find(r => r.email === 'carlos@vital.com').id);
  diego  = Number(rows.find(r => r.email === 'diego@vital.com').id);

  // Carlos: plan desde hace 20 días, entrena todos los días con carga estable, salud de hoy buena
  const semana = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => ({ dia: d, ejercicios: [{ nombre: 'x' }] }));
  await query('INSERT INTO perfiles_medicos (user_id, rutina_semanal, creado_en) VALUES ($1, $2, $3)',
    [carlos, JSON.stringify({ semana }), dia(20) + 'T08:00:00Z']);
  for (let n = 20; n >= 1; n--)
    await query('INSERT INTO cumplimiento (user_id, fecha, dia_semana, estado, rpe, duracion_minutos) VALUES ($1,$2,$3,$4,5,60)',
      [carlos, dia(n), 'd' + n, n === 2 ? 'parcial' : 'completo']);
  await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1,$2,2,9,9)', [carlos, dia(0)]);
  await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1,$2,3,8,8)', [carlos, dia(1)]);
}, 30000);

afterAll(() => console.log.mockRestore());

test('obtenerResumen combina salud, carga, cumplimiento y racha de un atleta', async () => {
  const r = await svc.obtenerResumen(carlos);

  expect(r.listo).toMatchObject({ nivel: 'alto', puntaje: 90 }); // (11-2+9+9)/30
  expect(r.carga.riesgo).toBe('optimo');
  expect(r.carga.ratio).toBe(0.9); // 6 sesiones en 7 días (hoy aún no) frente a 7 por semana de media
  expect(r.cumplimiento.parciales).toBe(1);
  expect(r.cumplimiento.dias.at(-1).estado).toBe('pendiente'); // hoy toca y aún no registra
  expect(r.racha).toBe(2);
});

test('obtenerResumen de un atleta sin datos no falla', async () => {
  const r = await svc.obtenerResumen(diego);
  expect(r.listo.nivel).toBe('sin-datos');
  expect(r.carga.riesgo).toBe('sin-datos');
  expect(r.cumplimiento.porcentaje).toBeNull();
  expect(r.racha).toBe(0);
});

test('obtenerEquipo devuelve solo atletas activos, cada uno con sus propios datos', async () => {
  const equipo = await svc.obtenerEquipo();
  const nombres = equipo.map(a => a.nombre);
  expect(nombres).toEqual(expect.arrayContaining(['Carlos Ruiz', 'Diego Torres']));
  expect(nombres).not.toContain('Admin Sistema');

  const c = equipo.find(a => a.id === carlos);
  const d = equipo.find(a => a.id === diego);
  expect(c.listo.nivel).toBe('alto');
  expect(c.racha).toBe(2);
  expect(d.listo.nivel).toBe('sin-datos');
});
