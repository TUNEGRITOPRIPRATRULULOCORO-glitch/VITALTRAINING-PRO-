jest.mock('../base-de-datos/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('../base-de-datos/db');
const sesion = require('../servidor/compartido/sesion');
const authMiddleware = require('../servidor/compartido/middleware/auth');
const authService = require('../servidor/api/auth/auth.service');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

describe('sesion — firmar y verificar', () => {
  test('un token firmado se verifica y trae los datos de la persona', () => {
    const datos = sesion.verificar(sesion.firmar({ id: 7, nombre: 'Ana', email: 'ana@test.com', rol: 'Atleta' }));
    expect(datos).toMatchObject({ id: 7, nombre: 'Ana', email: 'ana@test.com', rol: 'Atleta' });
  });

  test('rechaza un token sin firma (alg "none")', () => {
    const falso = jwt.sign({ id: 1, rol: 'Administrador' }, null, { algorithm: 'none' });
    expect(() => sesion.verificar(falso)).toThrow();
  });
});

describe('sesion — anteriorAlCambio', () => {
  const iat = 1_700_000_000;

  test('sin cambio de contraseña el token vale', () => {
    expect(sesion.anteriorAlCambio({ iat }, null)).toBe(false);
  });

  test('un token firmado antes del cambio ya no vale', () => {
    expect(sesion.anteriorAlCambio({ iat }, new Date((iat + 60) * 1000))).toBe(true);
  });

  test('el token firmado en el mismo segundo del cambio sigue valiendo', () => {
    expect(sesion.anteriorAlCambio({ iat }, new Date(iat * 1000 + 700))).toBe(false);
  });
});

describe('authMiddleware — cambio de contraseña', () => {
  test('cierra las sesiones abiertas antes del cambio', async () => {
    const token = sesion.firmar({ id: 901, rol: 'Atleta' });
    query.mockResolvedValueOnce({ rows: [{ rol: 'Atleta', estado: 'Activo', password_cambiado: new Date(Date.now() + 60_000) }] });
    const res = makeRes(), next = jest.fn();

    await authMiddleware({ headers: { authorization: `Bearer ${token}` } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error).toMatch(/contraseña cambió/);
    expect(next).not.toHaveBeenCalled();
  });

  test('deja pasar un token firmado después del cambio', async () => {
    const token = sesion.firmar({ id: 902, rol: 'Atleta' });
    query.mockResolvedValueOnce({ rows: [{ rol: 'Atleta', estado: 'Activo', password_cambiado: new Date(Date.now() - 60_000) }] });
    const next = jest.fn();

    await authMiddleware({ headers: { authorization: `Bearer ${token}` } }, makeRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('login — no delata cuentas', () => {
  test('una cuenta inactiva con contraseña incorrecta responde igual que un correo inexistente', async () => {
    const hash = await bcrypt.hash('correcta123', 10);
    query.mockResolvedValueOnce({ rows: [{ id: 3, email: 'off@test.com', password: hash, estado: 'Inactivo' }] });
    const inactiva = await authService.login('off@test.com', 'incorrecta');
    query.mockResolvedValueOnce({ rows: [] });
    const inexistente = await authService.login('nadie@test.com', 'incorrecta');

    expect(inactiva).toEqual(inexistente);
    expect(inactiva.status).toBe(401);
  });

  test('la sesión no incluye datos internos de la contraseña', async () => {
    const hash = await bcrypt.hash('correcta123', 10);
    query.mockResolvedValueOnce({ rows: [{ id: 4, email: 'a@test.com', password: hash, password_cambiado: new Date(), estado: 'Activo', rol: 'Atleta' }] });
    const { usuario } = await authService.login('a@test.com', 'correcta123');
    expect(usuario.password).toBeUndefined();
    expect(usuario.password_cambiado).toBeUndefined();
  });
});
