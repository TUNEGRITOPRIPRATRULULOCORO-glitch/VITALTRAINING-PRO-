// Test de integración: usa la base pg-mem real (sin mocks). Así también se detecta
// si alguna consulta usa SQL que la base de desarrollo no soporta.
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/reportes/reportes.service');

const dia = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const HOY = dia(0);

let ids;

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  const { rows } = await query('SELECT id, email FROM usuarios');
  ids = Object.fromEntries(rows.map(r => [r.email.split('@')[0], Number(r.id)]));
}, 30000);

afterAll(() => console.log.mockRestore());

describe('obtenerReporte', () => {
  test('base sin actividad no lanza error y devuelve ceros', async () => {
    const r = await svc.obtenerReporte();
    expect(r.totalComidas).toBe(0);
    expect(r.totalIncidencias).toBe(0);
    expect(r.fatigaPorAtleta).toEqual([]);
    expect(r.actividadPorDia).toHaveLength(7);
    expect(r.actividadPorDia.at(-1)).toEqual({ dia: HOY.slice(5), comidas: 0, rutinas: 0, salud: 0 });
  });

  test('cuenta usuarios por estado y por rol (incluye médicos)', async () => {
    await query("UPDATE usuarios SET estado = 'Inactivo' WHERE id = $1", [ids.pedro]);
    const r = await svc.obtenerReporte();
    expect(r).toMatchObject({ totalUsuarios: 7, activos: 6, inactivos: 1 });
    expect(r.porRol).toEqual({ Futbolista: 2, Nutricionista: 2, Entrenador: 1, Medico: 1, Administrador: 1 });
    await query("UPDATE usuarios SET estado = 'Activo' WHERE id = $1", [ids.pedro]);
  });

  test('cuenta incidencias por estado y las críticas', async () => {
    const crear = (estado, prioridad) => query(
      'INSERT INTO incidencias (user_id, titulo, estado, prioridad) VALUES ($1, $2, $3, $4)',
      [ids.carlos, 'Ticket', estado, prioridad]
    );
    await crear('abierta', 'critica');
    await crear('abierta', 'media');
    await crear('en progreso', 'alta');
    await crear('resuelta', 'critica');

    const r = await svc.obtenerReporte();
    expect(r.totalIncidencias).toBe(4);
    expect(r.incidenciasAbiertas).toBe(2);
    expect(r.incidenciasCriticas).toBe(2);
    expect(r.incidenciasPorEstado).toEqual({ abierta: 2, 'en progreso': 1, resuelta: 1 });
  });

  test('actividadPorDia cuenta cada registro en su día y excluye los de hace más de 7 días', async () => {
    await query("INSERT INTO comidas (user_id, nombre, fecha) VALUES ($1, 'Avena', $2), ($1, 'Arroz', $2)", [ids.carlos, HOY]);
    await query("INSERT INTO rutinas (user_id, nombre, fecha) VALUES ($1, 'Fuerza', $2)", [ids.carlos, dia(2)]);
    await query("INSERT INTO comidas (user_id, nombre, fecha) VALUES ($1, 'Vieja', $2)", [ids.carlos, dia(10)]);

    const r = await svc.obtenerReporte();
    const de = n => r.actividadPorDia.find(d => d.dia === dia(n).slice(5));
    expect(de(0).comidas).toBe(2);
    expect(de(2).rutinas).toBe(1);
    expect(r.actividadPorDia.reduce((t, d) => t + d.comidas, 0)).toBe(2);
    expect(r.totalComidas).toBe(3); // el total sí incluye la comida vieja
  });

  test('fatigaPorAtleta usa el último registro de cada atleta activo con salud', async () => {
    await query('INSERT INTO salud (user_id, fecha, fatiga, created_at) VALUES ($1, $2, 8, $3)', [ids.carlos, dia(1), dia(1) + 'T08:00:00Z']);
    await query('INSERT INTO salud (user_id, fecha, fatiga, created_at) VALUES ($1, $2, 4, $3)', [ids.carlos, HOY, HOY + 'T08:00:00Z']);

    const r = await svc.obtenerReporte();
    expect(r.fatigaPorAtleta).toEqual([{ nombre: 'Carlos', fatiga: 4 }]); // Diego no tiene registros
    expect(r.totalSalud).toBe(2);
  });

  test('un atleta inactivo no aparece en la fatiga', async () => {
    await query("UPDATE usuarios SET estado = 'Inactivo' WHERE id = $1", [ids.carlos]);
    const r = await svc.obtenerReporte();
    expect(r.fatigaPorAtleta).toEqual([]);
    await query("UPDATE usuarios SET estado = 'Activo' WHERE id = $1", [ids.carlos]);
  });
});
