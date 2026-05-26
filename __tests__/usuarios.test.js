jest.mock('../data/db');
const { query } = require('../data/db');
const svc = require('../api/usuarios/usuarios.service');

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

// ─── listar ───────────────────────────────────────────────────────────────────
describe('listar', () => {
  test('devuelve todos los usuarios sin contraseña', async () => {
    query.mockResolvedValueOnce({ rows: [
      { id: 1, nombre: 'Carlos',   email: 'carlos@vital.com', rol: 'Futbolista',    estado: 'Activo'   },
      { id: 2, nombre: 'Maria',    email: 'maria@vital.com',  rol: 'Nutricionista', estado: 'Activo'   },
      { id: 3, nombre: 'Inactivo', email: 'off@vital.com',    rol: 'Futbolista',    estado: 'Inactivo' }
    ]});
    const res = await svc.listar();
    expect(res).toHaveLength(3);
    res.forEach(u => expect(u.password).toBeUndefined());
  });

  test('filtra por nombre (búsqueda parcial)', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Carlos', email: 'carlos@vital.com', rol: 'Futbolista', estado: 'Activo' }] });
    const res = await svc.listar({ q: 'carl' });
    expect(res).toHaveLength(1);
    expect(res[0].nombre).toBe('Carlos');
  });

  test('filtra por email (búsqueda parcial)', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 2, nombre: 'Maria', email: 'maria@vital.com', rol: 'Nutricionista', estado: 'Activo' }] });
    const res = await svc.listar({ q: 'maria@' });
    expect(res).toHaveLength(1);
    expect(res[0].email).toBe('maria@vital.com');
  });

  test('filtra por rol', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 2, nombre: 'Maria', email: 'maria@vital.com', rol: 'Nutricionista', estado: 'Activo' }] });
    const res = await svc.listar({ rol: 'Nutricionista' });
    expect(res).toHaveLength(1);
    expect(res[0].nombre).toBe('Maria');
  });

  test('filtra por estado Inactivo', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 3, nombre: 'Inactivo', email: 'off@vital.com', rol: 'Futbolista', estado: 'Inactivo' }] });
    const res = await svc.listar({ estado: 'Inactivo' });
    expect(res).toHaveLength(1);
    expect(res[0].nombre).toBe('Inactivo');
  });

  test('no filtra cuando rol es "Todos los roles"', async () => {
    query.mockResolvedValueOnce({ rows: [
      { id: 1, nombre: 'Carlos', rol: 'Futbolista',    estado: 'Activo' },
      { id: 2, nombre: 'Maria',  rol: 'Nutricionista', estado: 'Activo' },
      { id: 3, nombre: 'Admin',  rol: 'Administrador', estado: 'Activo' }
    ]});
    const res = await svc.listar({ rol: 'Todos los roles' });
    expect(res).toHaveLength(3);
  });
});

// ─── crear ────────────────────────────────────────────────────────────────────
describe('crear', () => {
  test('crea usuario y retorna sin contraseña', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // no existe
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Nuevo', email: 'nuevo@test.com', rol: 'Futbolista', estado: 'Activo' }] }); // INSERT
    const res = await svc.crear({ nombre: 'Nuevo', email: 'nuevo@test.com', rol: 'Futbolista' });
    expect(res.nombre).toBe('Nuevo');
    expect(res.password).toBeUndefined();
  });

  test('usa contraseña por defecto "1234" si no se envía', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Test', email: 'test@test.com', rol: 'Futbolista', estado: 'Activo' }] });
    const res = await svc.crear({ nombre: 'Test', email: 'test@test.com' });
    expect(res.passwordInicial).toBe('1234');
  });

  test('usa la contraseña enviada como passwordInicial', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Test2', email: 'test2@test.com', rol: 'Futbolista', estado: 'Activo' }] });
    const res = await svc.crear({ nombre: 'Test2', email: 'test2@test.com', password: 'segura123' });
    expect(res.passwordInicial).toBe('segura123');
  });

  test('lanza error si falta nombre', async () => {
    await expect(svc.crear({ email: 'ok@test.com' })).rejects.toThrow(/nombre/i);
  });

  test('lanza error si el email no tiene formato válido', async () => {
    await expect(svc.crear({ nombre: 'Test', email: 'no-es-email' })).rejects.toThrow(/correo/i);
  });

  test('lanza error si el correo ya existe', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // ya existe
    await expect(svc.crear({ nombre: 'Otro', email: 'carlos@vital.com' })).rejects.toThrow(/correo/i);
  });
});

// ─── actualizar ───────────────────────────────────────────────────────────────
describe('actualizar', () => {
  test('actualiza campos del usuario', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Carlos Actualizado', email: 'carlos@vital.com', rol: 'Futbolista', estado: 'Activo' }] });
    const res = await svc.actualizar(1, { nombre: 'Carlos Actualizado' });
    expect(res.nombre).toBe('Carlos Actualizado');
    expect(res.password).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('retorna null si el usuario no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await svc.actualizar(999, { nombre: 'Fantasma' });
    expect(res).toBeNull();
  });

  test('no actualiza la contraseña (campo ignorado)', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'OK', email: 'carlos@vital.com', rol: 'Futbolista', estado: 'Activo' }] });
    const res = await svc.actualizar(1, { nombre: 'OK', password: 'nueva' });
    const sqlCall = query.mock.calls[0][0];
    expect(sqlCall).not.toContain('password');
  });
});

// ─── eliminar ─────────────────────────────────────────────────────────────────
describe('eliminar', () => {
  test('elimina el usuario y retorna su nombre', async () => {
    query.mockResolvedValueOnce({ rows: [{ nombre: 'Carlos' }] });
    const res = await svc.eliminar(1);
    expect(res).toEqual({ nombre: 'Carlos' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('retorna null si el usuario no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await svc.eliminar(999);
    expect(res).toBeNull();
  });
});