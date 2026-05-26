jest.mock('../data/db');
const { query } = require('../data/db');
const svc = require('../api/reportes/reportes.service');

const HOY = new Date().toISOString().slice(0, 10);

beforeEach(() => jest.clearAllMocks());

// Monta las 7 queries que hace obtenerReporte en orden
function mockReporte({
  usuarios     = { total: '0', activos: '0', inactivos: '0', futbolistas: '0', nutricionistas: '0', administradores: '0' },
  incidencias  = { total: '0', abiertas: '0', en_progreso: '0', resueltas: '0', criticas: '0' },
  comidas      = '0',
  rutinas      = '0',
  salud        = '0',
  fatiga       = [],
  actividad    = Array.from({ length: 7 }, (_, i) => ({ dia: `2026-05-${String(17 + i).padStart(2,'0')}`, comidas: 0, rutinas: 0, salud: 0 }))
} = {}) {
  query.mockResolvedValueOnce({ rows: [usuarios] });
  query.mockResolvedValueOnce({ rows: [incidencias] });
  query.mockResolvedValueOnce({ rows: [{ total: comidas }] });
  query.mockResolvedValueOnce({ rows: [{ total: rutinas }] });
  query.mockResolvedValueOnce({ rows: [{ total: salud }] });
  query.mockResolvedValueOnce({ rows: fatiga });
  query.mockResolvedValueOnce({ rows: actividad });
}

describe('obtenerReporte', () => {
  test('retorna conteos correctos de usuarios', async () => {
    mockReporte({
      usuarios: { total: '4', activos: '3', inactivos: '1', futbolistas: '2', nutricionistas: '1', administradores: '1' }
    });
    const r = await svc.obtenerReporte();
    expect(r.totalUsuarios).toBe(4);
    expect(r.activos).toBe(3);
    expect(r.inactivos).toBe(1);
    expect(r.porRol.Futbolista).toBe(2);
    expect(r.porRol.Nutricionista).toBe(1);
    expect(r.porRol.Administrador).toBe(1);
  });

  test('retorna conteos correctos de incidencias', async () => {
    mockReporte({
      incidencias: { total: '4', abiertas: '2', en_progreso: '1', resueltas: '1', criticas: '1' }
    });
    const r = await svc.obtenerReporte();
    expect(r.totalIncidencias).toBe(4);
    expect(r.incidenciasAbiertas).toBe(2);
    expect(r.incidenciasCriticas).toBe(1);
    expect(r.incidenciasPorEstado.abierta).toBe(2);
    expect(r.incidenciasPorEstado['en progreso']).toBe(1);
    expect(r.incidenciasPorEstado.resuelta).toBe(1);
  });

  test('retorna totales de actividad', async () => {
    mockReporte({ comidas: '2', rutinas: '1', salud: '3' });
    const r = await svc.obtenerReporte();
    expect(r.totalComidas).toBe(2);
    expect(r.totalRutinas).toBe(1);
    expect(r.totalSalud).toBe(3);
  });

  test('actividadPorDia tiene 7 entradas', async () => {
    mockReporte();
    const r = await svc.obtenerReporte();
    expect(r.actividadPorDia).toHaveLength(7);
  });

  test('actividadPorDia cuenta comidas del día correcto', async () => {
    mockReporte({
      actividad: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000);
        const dia = d.toISOString().slice(0, 10);
        return { dia, comidas: dia === HOY ? 2 : 0, rutinas: dia === HOY ? 1 : 0, salud: 0 };
      })
    });
    const r = await svc.obtenerReporte();
    const hoyEntry = r.actividadPorDia.find(d => d.dia === HOY.slice(5));
    expect(hoyEntry.comidas).toBe(2);
    expect(hoyEntry.rutinas).toBe(1);
  });

  test('fatigaPorAtleta incluye solo futbolistas activos con salud registrada', async () => {
    mockReporte({ fatiga: [{ nombre: 'Carlos', fatiga: 7 }] });
    const r = await svc.obtenerReporte();
    expect(r.fatigaPorAtleta).toHaveLength(1);
    expect(r.fatigaPorAtleta[0].nombre).toBe('Carlos');
    expect(r.fatigaPorAtleta[0].fatiga).toBe(7);
  });

  test('base de datos vacía no lanza error', async () => {
    mockReporte();
    await expect(svc.obtenerReporte()).resolves.not.toThrow();
  });
});