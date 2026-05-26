jest.mock('../data/db');
const { query } = require('../data/db');
const historialService = require('../api/panel/historial.service');

const HOY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

// ─── historialComidas ──────────────────────────────
describe('historialComidas', () => {
  test('retorna comidas del usuario paginadas', async () => {
    query.mockResolvedValueOnce({ rows: [{ total: '2' }] }); // COUNT
    query.mockResolvedValueOnce({ rows: [
      { id: 1, userId: 1, nombre: 'Arepa', tipo: 'Desayuno', calorias: 400, fecha: HOY, createdAt: new Date().toISOString() },
      { id: 2, userId: 1, nombre: 'Pollo', tipo: 'Almuerzo', calorias: 520, fecha: HOY, createdAt: new Date().toISOString() }
    ]}); // SELECT
    const result = await historialService.historialComidas(1);
    expect(result.datos).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  test('paginacion limita resultados', async () => {
    query.mockResolvedValueOnce({ rows: [{ total: '15' }] }); // COUNT
    query.mockResolvedValueOnce({ rows: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1, userId: 1, nombre: `Comida ${i}`, tipo: 'Almuerzo', calorias: 400, fecha: HOY
    }))}); // SELECT paginado
    const result = await historialService.historialComidas(1, { page: 1, limit: 5 });
    expect(result.datos).toHaveLength(5);
    expect(result.totalPaginas).toBe(3);
  });
});

// ─── registrarComida ──────────────────────────────
describe('registrarComida', () => {
  test('crea una comida correctamente', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, nombre: 'Ensalada', tipo: 'Almuerzo', calorias: 300, fecha: HOY, createdAt: new Date().toISOString() }] });
    const result = await historialService.registrarComida(1, { nombre: 'Ensalada', tipo: 'Almuerzo', calorias: 300, fecha: HOY });
    expect(result.nombre).toBe('Ensalada');
    expect(result.userId).toBe(1);
    expect(query).toHaveBeenCalled();
  });

  test('lanza error si falta nombre', async () => {
    await expect(historialService.registrarComida(1, { tipo: 'Almuerzo' }))
      .rejects.toThrow(/nombre/i);
  });

  test('lanza error si falta tipo', async () => {
    await expect(historialService.registrarComida(1, { nombre: 'Algo' }))
      .rejects.toThrow(/tipo/i);
  });

  test('calorias por defecto es 0 si no se pasan', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, nombre: 'Agua', tipo: 'Otro', calorias: 0, fecha: HOY }] });
    const result = await historialService.registrarComida(1, { nombre: 'Agua', tipo: 'Otro' });
    expect(result.calorias).toBe(0);
  });
});

// ─── eliminarComida ───────────────────────────────
describe('eliminarComida', () => {
  test('elimina la comida del usuario', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 100 }] });
    const result = await historialService.eliminarComida(1, 100);
    expect(result).toBe(true);
  });

  test('retorna null si la comida no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await historialService.eliminarComida(1, 999);
    expect(result).toBeNull();
  });

  test('no puede eliminar comida de otro usuario', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // WHERE user_id=$2 no coincide
    const result = await historialService.eliminarComida(1, 50);
    expect(result).toBeNull();
  });
});

// ─── cumplimiento ─────────────────────────────────
describe('registrarCumplimiento', () => {
  test('guarda un registro de cumplimiento', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // SELECT check: no existe
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, diaSemana: 'Lunes', fecha: HOY, tipo: 'Fuerza + Core', notas: '' }] }); // INSERT
    const result = await historialService.registrarCumplimiento(1, { diaSemana: 'Lunes', tipo: 'Fuerza + Core', fecha: HOY });
    expect(result.diaSemana).toBe('Lunes');
    expect(result.userId).toBe(1);
  });

  test('no duplica el mismo dia en la misma fecha', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, diaSemana: 'Lunes', fecha: HOY }] }); // ya existe
    const result = await historialService.registrarCumplimiento(1, { diaSemana: 'Lunes', fecha: HOY });
    expect(result.id).toBe(1);
    expect(query).toHaveBeenCalledTimes(1); // solo SELECT, no INSERT
  });

  test('si permite mismo dia en fecha diferente', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // no existe para esa fecha
    query.mockResolvedValueOnce({ rows: [{ id: 2, userId: 1, diaSemana: 'Lunes', fecha: HOY }] }); // INSERT
    const result = await historialService.registrarCumplimiento(1, { diaSemana: 'Lunes', fecha: HOY });
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe('getCumplimiento', () => {
  test('retorna solo los registros del usuario', async () => {
    query.mockResolvedValueOnce({ rows: [
      { id: 1, userId: 1, diaSemana: 'Lunes',     fecha: HOY },
      { id: 3, userId: 1, diaSemana: 'Miercoles', fecha: HOY }
    ]});
    const result = await historialService.getCumplimiento(1);
    expect(result).toHaveLength(2);
    result.forEach(r => expect(r.userId).toBe(1));
  });
});