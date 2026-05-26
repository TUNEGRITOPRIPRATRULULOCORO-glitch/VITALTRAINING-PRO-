jest.mock('../data/db');
const { query } = require('../data/db');
const bcrypt = require('bcrypt');
const authService = require('../api/auth/auth.service');

let hashedPassword;

beforeAll(async () => {
  hashedPassword = await bcrypt.hash('password123', 10);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('auth.service — login', () => {
  test('retorna token con credenciales correctas', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Admin Test', email: 'admin@test.com', password: hashedPassword, rol: 'Administrador', estado: 'Activo' }] });
    const result = await authService.login('admin@test.com', 'password123');
    expect(result.token).toBeDefined();
    expect(result.usuario).toBeDefined();
    expect(result.usuario.email).toBe('admin@test.com');
    expect(result.usuario.password).toBeUndefined();
  });

  test('retorna error con contrasena incorrecta', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'admin@test.com', password: hashedPassword, estado: 'Activo' }] });
    const result = await authService.login('admin@test.com', 'incorrecta');
    expect(result.error).toBeDefined();
    expect(result.status).toBe(401);
  });

  test('retorna error si el usuario no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await authService.login('noexiste@test.com', 'cualquiera');
    expect(result.error).toBeDefined();
    expect(result.status).toBe(401);
  });

  test('retorna error si la cuenta esta inactiva', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 2, email: 'inactivo@test.com', password: hashedPassword, estado: 'Inactivo' }] });
    const result = await authService.login('inactivo@test.com', 'password123');
    expect(result.error).toMatch(/inactiv/i);
    expect(result.status).toBe(403);
  });

  test('login es case-insensitive en el email', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Admin', email: 'admin@test.com', password: hashedPassword, rol: 'Administrador', estado: 'Activo' }] });
    const result = await authService.login('ADMIN@TEST.COM', 'password123');
    expect(result.token).toBeDefined();
  });
});

describe('auth.service — registro', () => {
  test('crea un nuevo usuario correctamente', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Juan Test', email: 'juan@test.com', rol: 'Futbolista', estado: 'Activo' }] });
    const result = await authService.registro({ nombre: 'Juan Test', email: 'juan@test.com', password: 'abc123' });
    expect(result.usuario).toBeDefined();
    expect(result.usuario.email).toBe('juan@test.com');
    expect(result.usuario.password).toBeUndefined();
  });

  test('hashea la contrasena al registrar', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    let capturedParams;
    query.mockImplementationOnce((sql, params) => {
      capturedParams = params;
      return Promise.resolve({ rows: [{ id: 1, nombre: 'Test Hash', email: 'hash@test.com', rol: 'Futbolista', estado: 'Activo' }] });
    });
    await authService.registro({ nombre: 'Test Hash', email: 'hash@test.com', password: 'mipassword' });
    expect(capturedParams[2]).toMatch(/^\$2b\$/);
    expect(capturedParams[2]).not.toBe('mipassword');
  });

  test('retorna error si el email ya existe', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await authService.registro({ nombre: 'Duplicado', email: 'admin@test.com', password: 'cualquiera' });
    expect(result.error).toBeDefined();
    expect(result.status).toBe(409);
  });

  test('el nuevo usuario tiene rol Futbolista por defecto', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Nuevo', email: 'nuevo@test.com', rol: 'Futbolista', estado: 'Activo' }] });
    const result = await authService.registro({ nombre: 'Nuevo', email: 'nuevo@test.com', password: '1234' });
    expect(result.usuario.rol).toBe('Futbolista');
    expect(result.usuario.estado).toBe('Activo');
  });

  test('retorna error si el email no tiene formato válido', async () => {
    const result = await authService.registro({ nombre: 'Test', email: 'no-es-un-email', password: '1234' });
    expect(result.error).toMatch(/formato/i);
    expect(result.status).toBe(400);
  });
});