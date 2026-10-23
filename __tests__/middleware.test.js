jest.mock('jsonwebtoken');
jest.mock('../base-de-datos/db');
const jwt = require('jsonwebtoken');
const { query } = require('../base-de-datos/db');
const authMiddleware = require('../servidor/compartido/middleware/auth');
const { requireRol, requireOwnerOrRol } = require('../servidor/compartido/middleware/roles');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

describe('authMiddleware', () => {
  test('llama next() con token válido y cuenta activa', async () => {
    const payload = { id: 1, rol: 'Futbolista' };
    jwt.verify.mockReturnValue(payload);
    query.mockResolvedValueOnce({ rows: [{ rol: 'Futbolista', estado: 'Activo' }] });
    const req  = { path: '/panel/1', headers: { authorization: 'Bearer token-valido' } };
    const res  = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(payload);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('una cuenta desactivada no entra aunque su token siga vigente', async () => {
    jwt.verify.mockReturnValue({ id: 2, rol: 'Atleta' });
    query.mockResolvedValueOnce({ rows: [{ rol: 'Atleta', estado: 'Inactivo' }] });
    const res = makeRes(), next = jest.fn();

    await authMiddleware({ headers: { authorization: 'Bearer t' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('el rol se toma de la base: quitar el rol de admin surte efecto sin esperar a que caduque el token', async () => {
    jwt.verify.mockReturnValue({ id: 3, rol: 'Administrador' });
    query.mockResolvedValueOnce({ rows: [{ rol: 'Atleta', estado: 'Activo' }] });
    const req = { headers: { authorization: 'Bearer t' } }, next = jest.fn();

    await authMiddleware(req, makeRes(), next);

    expect(req.user.rol).toBe('Atleta');
    expect(next).toHaveBeenCalled();
  });

  test('recuerda la cuenta unos segundos y la olvida cuando el admin la cambia', async () => {
    jwt.verify.mockReturnValue({ id: 4, rol: 'Atleta' });
    query.mockResolvedValue({ rows: [{ rol: 'Atleta', estado: 'Activo' }] });
    const pedir = () => authMiddleware({ headers: { authorization: 'Bearer t' } }, makeRes(), jest.fn());

    await pedir(); await pedir();
    expect(query).toHaveBeenCalledTimes(1);
    authMiddleware.olvidarCuenta(4);
    await pedir();
    expect(query).toHaveBeenCalledTimes(2);
  });

  test('una cuenta eliminada no entra', async () => {
    jwt.verify.mockReturnValue({ id: 99, rol: 'Atleta' });
    query.mockResolvedValueOnce({ rows: [] });
    const res = makeRes();

    await authMiddleware({ headers: { authorization: 'Bearer t' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('retorna 401 si no hay header de autorización', () => {
    const req  = { path: '/panel/1', headers: {} };
    const res  = makeRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/autorizado/i) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 si el header no empieza con Bearer', () => {
    const req  = { path: '/panel/1', headers: { authorization: 'Basic abc123' } };
    const res  = makeRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 401 si el token es inválido o expirado', () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });
    const req  = { path: '/panel/1', headers: { authorization: 'Bearer token-invalido' } };
    const res  = makeRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/expir/i) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('ninguna ruta se salta la sesión (la antigua de n8n tampoco)', () => {
    const req  = { path: '/ia/n8n-contexto/5', headers: {} };
    const res  = makeRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── requireRol ───────────────────────────────────────────────────────────────
describe('requireRol', () => {
  test('llama next() si el usuario tiene el rol requerido', () => {
    const req  = { user: { id: 1, rol: 'Administrador' } };
    const res  = makeRes();
    const next = jest.fn();
    requireRol('Administrador')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('llama next() si el usuario tiene uno de varios roles permitidos', () => {
    const req  = { user: { id: 2, rol: 'Nutricionista' } };
    const res  = makeRes();
    const next = jest.fn();
    requireRol('Nutricionista', 'Administrador')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('retorna 403 si el usuario no tiene el rol requerido', () => {
    const req  = { user: { id: 3, rol: 'Futbolista' } };
    const res  = makeRes();
    const next = jest.fn();
    requireRol('Administrador')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 403 si el usuario no tiene ninguno de los roles permitidos', () => {
    const req  = { user: { id: 4, rol: 'Futbolista' } };
    const res  = makeRes();
    const next = jest.fn();
    requireRol('Nutricionista', 'Administrador')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── requireOwnerOrRol ────────────────────────────────────────────────────────
describe('requireOwnerOrRol', () => {
  test('llama next() si el userId del token coincide con el param', () => {
    const req  = { user: { id: 5, rol: 'Futbolista' }, params: { userId: '5' } };
    const res  = makeRes();
    const next = jest.fn();
    requireOwnerOrRol('Administrador')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('llama next() si el usuario tiene rol permitido aunque no sea el dueño', () => {
    const req  = { user: { id: 1, rol: 'Administrador' }, params: { userId: '99' } };
    const res  = makeRes();
    const next = jest.fn();
    requireOwnerOrRol('Administrador')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('retorna 403 si no es el dueño ni tiene rol permitido', () => {
    const req  = { user: { id: 5, rol: 'Futbolista' }, params: { userId: '99' } };
    const res  = makeRes();
    const next = jest.fn();
    requireOwnerOrRol('Administrador')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('llama next() si el nutricionista accede a datos de otro usuario', () => {
    const req  = { user: { id: 2, rol: 'Nutricionista' }, params: { userId: '10' } };
    const res  = makeRes();
    const next = jest.fn();
    requireOwnerOrRol('Administrador', 'Nutricionista')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});