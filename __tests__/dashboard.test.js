jest.mock('../data/db');
const { query } = require('../data/db');
const dashSvc   = require('../api/panel/dashboard.service');
const perfilSvc = require('../api/panel/perfil.service');

const HOY = new Date().toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

// helpers para mockear las 4 queries paralelas del dashboard
function mockDashboard({ perfil = null, comidas = [], rutinas = [], alertas = [] } = {}) {
  query.mockResolvedValueOnce({ rows: perfil ? [perfil] : [] }); // perfiles
  query.mockResolvedValueOnce({ rows: comidas });                 // comidas
  query.mockResolvedValueOnce({ rows: rutinas });                 // rutinas
  query.mockResolvedValueOnce({ rows: alertas });                 // alertas
}

// ─── dashboard ────────────────────────────────────────────────────────────────
describe('obtenerResumen', () => {
  test('devuelve resumen con datos del usuario', async () => {
    mockDashboard({
      perfil:  { userId: 1, nombre: 'Carlos', posicion: 'Delantero' },
      comidas: [
        { id: 1, userId: 1, nombre: 'Arepa', createdAt: HOY },
        { id: 2, userId: 1, nombre: 'Pollo', createdAt: HOY }
      ],
      alertas: [{ id: 1, userId: 1, leida: false, createdAt: HOY }]
    });

    const res = await dashSvc.obtenerResumen(1);

    expect(res.perfil.nombre).toBe('Carlos');
    expect(res.ultimasComidas).toHaveLength(2);
    expect(res.alertasRecientes).toHaveLength(1);
    expect(res.generadoEn).toBeDefined();
  });

  test('perfil es null si el usuario no tiene perfil', async () => {
    mockDashboard();
    const res = await dashSvc.obtenerResumen(99);
    expect(res.perfil).toBeNull();
    expect(res.ultimasComidas).toHaveLength(0);
  });

  test('limita a 3 comidas recientes', async () => {
    mockDashboard({
      comidas: Array.from({ length: 3 }, (_, i) => ({ id: i + 1, userId: 1, nombre: `Comida ${i}`, createdAt: HOY }))
    });
    const res = await dashSvc.obtenerResumen(1);
    expect(res.ultimasComidas).toHaveLength(3);
  });
});

// ─── perfil deportivo ─────────────────────────────────────────────────────────
describe('perfilService', () => {
  test('obtenerPerfil retorna el perfil del usuario', async () => {
    query.mockResolvedValueOnce({ rows: [{ userId: 5, posicion: 'Portero' }] });
    const res = await perfilSvc.obtenerPerfil(5);
    expect(res.posicion).toBe('Portero');
  });

  test('obtenerPerfil retorna null si no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await perfilSvc.obtenerPerfil(99)).toBeNull();
  });

  test('actualizarPerfil crea perfil nuevo si no existe', async () => {
    query.mockResolvedValueOnce({ rows: [{ userId: 10, nombre: 'Juan', posicion: 'Extremo', updatedAt: HOY }] });
    const res = await perfilSvc.actualizarPerfil(10, { nombre: 'Juan', posicion: 'Extremo' });
    expect(res.userId).toBe(10);
    expect(res.posicion).toBe('Extremo');
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('actualizarPerfil actualiza perfil existente', async () => {
    query.mockResolvedValueOnce({ rows: [{ userId: 5, nombre: 'Carlos', posicion: 'Delantero', updatedAt: HOY }] });
    const res = await perfilSvc.actualizarPerfil(5, { posicion: 'Delantero' });
    expect(res.posicion).toBe('Delantero');
    expect(query).toHaveBeenCalledTimes(1);
  });
});