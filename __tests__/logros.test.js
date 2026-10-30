// Logros: reglas puras y servicio integrado con la base pg-mem real.
const cat = require('../servidor/api/logros/logros.catalogo');

describe('reglas de logros', () => {
  test('racha máxima de días seguidos', () => {
    expect(cat.rachaMaxima(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-06'])).toBe(3);
    expect(cat.rachaMaxima([])).toBe(0);
  });

  test('semana completa: todas las sesiones de una semana ya terminada', () => {
    const semana = (lunes, estados) => estados.map((estado, i) => ({ fecha: `2026-10-${String(lunes + i).padStart(2, '0')}`, estado }));
    const dias = [
      ...semana(5, ['completo', 'descanso', 'completo', 'descanso', 'completo', 'descanso', 'descanso']),   // completa
      ...semana(12, ['completo', 'descanso', 'parcial', 'descanso', 'completo', 'descanso', 'descanso']),   // con una a medias
      ...semana(19, ['completo', 'descanso', 'completo', 'descanso', 'completo', 'descanso', 'descanso']),  // aún no termina
    ];
    expect(cat.semanasCompletas(dias, '2026-10-22')).toBe(1);
  });

  test('evaluar marca el progreso y lo conseguido', () => {
    const r = cat.evaluar({ rachaMax: 5, sesiones: 12 });
    expect(r.find(l => l.clave === 'racha_3')).toMatchObject({ conseguido: true });
    expect(r.find(l => l.clave === 'racha_7')).toMatchObject({ conseguido: false, progreso: { actual: 5, meta: 7 } });
    expect(r.find(l => l.clave === 'sesiones_10').conseguido).toBe(true);
    expect(new Set(cat.LOGROS.map(l => l.clave)).size).toBe(cat.LOGROS.length); // claves únicas
  });
});

describe('servicio (integración)', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const svc = require('../servidor/api/logros/logros.service');
  const { hoyISO, sumarDias } = require('../servidor/compartido/fechas');
  let carlos;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    carlos = Number((await query("SELECT id FROM usuarios WHERE email = 'carlos@vital.com'")).rows[0].id);
    for (let i = 0; i < 3; i++)
      await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1, $2, 3, 8, 8)', [carlos, sumarDias(hoyISO(), -i)]);
    await query("INSERT INTO series (user_id, ejercicio, fecha, peso, repeticiones) VALUES ($1, 'Sentadilla', $2, 50, 8)", [carlos, hoyISO()]);
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('el atleta gana logros y se celebran una sola vez', async () => {
    const yo = { id: carlos, rol: 'Atleta' };
    const r = await svc.obtener(carlos, yo);
    const de = clave => r.logros.find(l => l.clave === clave);
    expect(de('salud_1')).toMatchObject({ conseguido: true, nuevo: true, fecha: hoyISO() });
    expect(de('racha_3')).toMatchObject({ conseguido: true, nuevo: true });
    expect(de('series_1').conseguido).toBe(true);
    expect(de('racha_7')).toMatchObject({ conseguido: false, progreso: { actual: 3, meta: 7 } });
    expect(r.conseguidos).toBeGreaterThanOrEqual(3);

    const otra = await svc.obtener(carlos, yo);
    expect(otra.logros.find(l => l.clave === 'salud_1').nuevo).toBe(false);
  });

  test('un logro ganado no se pierde, y un profesional no gasta la celebración', async () => {
    await query('DELETE FROM series WHERE user_id = $1', [carlos]);
    const r = await svc.obtener(carlos, { id: 999, rol: 'Entrenador' });
    expect(r.logros.find(l => l.clave === 'series_1')).toMatchObject({ conseguido: true, nuevo: false });
  });
});
