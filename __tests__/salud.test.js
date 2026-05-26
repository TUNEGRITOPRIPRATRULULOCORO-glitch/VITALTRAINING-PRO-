jest.mock('../data/db');
const { query } = require('../data/db');
const saludService = require('../api/salud/salud.service');

const HOY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

describe('salud.service — listar', () => {
  test('retorna registros del usuario ordenados por fecha descendente', async () => {
    query.mockResolvedValueOnce({ rows: [
      { id: 2, userId: 1, fecha: '2026-01-03', fatiga: 3, sueno: 8, recuperacion: 8, createdAt: '2026-01-03T10:00:00Z' },
      { id: 1, userId: 1, fecha: '2026-01-01', fatiga: 5, sueno: 7, recuperacion: 6, createdAt: '2026-01-01T10:00:00Z' }
    ]});
    const result = await saludService.listar(1);
    expect(result).toHaveLength(2);
    expect(result[0].fecha).toBe('2026-01-03');
    expect(result[1].fecha).toBe('2026-01-01');
  });

  test('retorna arreglo vacio si el usuario no tiene registros', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await saludService.listar(99);
    expect(result).toHaveLength(0);
  });
});

describe('salud.service — crear', () => {
  test('crea un registro de salud correctamente', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // SELECT check
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, fecha: HOY, fatiga: 6, sueno: 8, recuperacion: 7, notas: '', createdAt: new Date().toISOString() }] }); // INSERT
    const result = await saludService.crear(1, { fatiga: 6, sueno: 8, recuperacion: 7, fecha: HOY });
    expect(result.userId).toBe(1);
    expect(result.fatiga).toBe(6);
    expect(result.sueno).toBe(8);
    expect(result.recuperacion).toBe(7);
    expect(query).toHaveBeenCalled();
  });

  test('lanza error si ya existe registro del dia', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // ya existe
    await expect(saludService.crear(1, { fecha: HOY })).rejects.toThrow(/hoy/i);
  });

  test('genera alerta automatica si fatiga >= 8', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // SELECT check
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, fecha: HOY, fatiga: 9, sueno: 7, recuperacion: 6 }] }); // INSERT salud
    query.mockResolvedValueOnce({ rows: [] }); // INSERT alerta fatiga
    await saludService.crear(1, { fatiga: 9, sueno: 7, recuperacion: 6, fecha: HOY });
    const alertaCall = query.mock.calls.find(c => c[0].includes('fatiga'));
    expect(alertaCall).toBeDefined();
  });

  test('genera alerta automatica si recuperacion <= 3', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, fecha: HOY, fatiga: 5, sueno: 7, recuperacion: 2 }] });
    query.mockResolvedValueOnce({ rows: [] }); // alerta recuperacion
    await saludService.crear(1, { fatiga: 5, sueno: 7, recuperacion: 2, fecha: HOY });
    const alertaCall = query.mock.calls.find(c => c[0].includes('recuperacion'));
    expect(alertaCall).toBeDefined();
  });

  test('genera alerta automatica si sueno <= 4', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, fecha: HOY, fatiga: 5, sueno: 3, recuperacion: 6 }] });
    query.mockResolvedValueOnce({ rows: [] }); // alerta sueno
    await saludService.crear(1, { fatiga: 5, sueno: 3, recuperacion: 6, fecha: HOY });
    const alertaCall = query.mock.calls.find(c => c[0].includes('sueno'));
    expect(alertaCall).toBeDefined();
  });

  test('no genera alertas con valores normales', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // SELECT check
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, fecha: HOY, fatiga: 5, sueno: 7, recuperacion: 6 }] }); // INSERT
    await saludService.crear(1, { fatiga: 5, sueno: 7, recuperacion: 6, fecha: HOY });
    expect(query).toHaveBeenCalledTimes(2);
  });

  test('usa valor por defecto si no se pasan datos', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, fecha: HOY, fatiga: 5, sueno: 7, recuperacion: 5 }] });
    const result = await saludService.crear(1, {});
    expect(result.fatiga).toBe(5);
    expect(result.sueno).toBe(7);
    expect(result.recuperacion).toBe(5);
  });

  test('lanza error si fatiga es mayor a 10', async () => {
    await expect(saludService.crear(1, { fatiga: 15, sueno: 7, recuperacion: 5, fecha: HOY }))
      .rejects.toThrow(/1 y 10/i);
  });

  test('lanza error si sueno es menor a 1', async () => {
    await expect(saludService.crear(1, { fatiga: 5, sueno: 0, recuperacion: 5, fecha: HOY }))
      .rejects.toThrow(/1 y 10/i);
  });

  test('lanza error si la fecha tiene formato inválido', async () => {
    await expect(saludService.crear(1, { fatiga: 5, sueno: 7, recuperacion: 5, fecha: '23/05/2026' }))
      .rejects.toThrow(/formato/i);
  });

  test('lanza error si la fecha es futura', async () => {
    await expect(saludService.crear(1, { fatiga: 5, sueno: 7, recuperacion: 5, fecha: '2099-01-01' }))
      .rejects.toThrow(/futura/i);
  });

  test('acepta fecha de hoy sin error', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 1, fecha: HOY, fatiga: 5, sueno: 7, recuperacion: 5 }] });
    await expect(saludService.crear(1, { fatiga: 5, sueno: 7, recuperacion: 5, fecha: HOY }))
      .resolves.toBeDefined();
  });
});