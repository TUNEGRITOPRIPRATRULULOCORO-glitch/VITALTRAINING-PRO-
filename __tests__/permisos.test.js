// Quién ve qué tickets de soporte (el servicio se simula: aquí solo importa el filtro por rol)
jest.mock('../servidor/api/incidencias/incidencias.service', () => ({ listar: jest.fn(async filtros => [{ filtros }]) }));
const svc = require('../servidor/api/incidencias/incidencias.service');
const ctrl = require('../servidor/api/incidencias/incidencias.controller');

function pedir(user, query = {}) {
  const res = { json: jest.fn(), status: jest.fn(() => res) };
  return ctrl.getIncidencias({ user, query }, res).then(() => res.json.mock.calls[0][0]);
}

beforeEach(() => svc.listar.mockClear());

test('el atleta solo ve sus propios tickets, aunque pida los de otro', async () => {
  const [{ filtros }] = await pedir({ id: 7, rol: 'Atleta' }, { userId: '1' });
  expect(filtros.userId).toBe(7);
});

test('el nutricionista solo ve los tickets de nutrición', async () => {
  const [{ filtros }] = await pedir({ id: 3, rol: 'Nutricionista' });
  expect(filtros.destinatario).toBe('Nutricionista');
});

test('el administrador ve todos', async () => {
  const [{ filtros }] = await pedir({ id: 1, rol: 'Administrador' }, { estado: 'abierta' });
  expect(filtros).toEqual({ estado: 'abierta' });
});

test('el médico no ve tickets', async () => {
  expect(await pedir({ id: 5, rol: 'Medico' })).toEqual([]);
  expect(svc.listar).not.toHaveBeenCalled();
});
