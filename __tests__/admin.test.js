// Panel de administración: filtro de roles y moderación de fotos (integración con pg-mem).
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const usuarios = require('../servidor/api/usuarios/usuarios.service');
const fotos = require('../servidor/api/usuarios/fotos.service');
const ctrl = require('../servidor/api/usuarios/usuarios.controller');

const JPEG = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 7)]).toString('base64')}`;
const ids = {};

function respuesta() {
  const res = { statusCode: 200, cuerpo: null };
  res.status = c => { res.statusCode = c; return res; };
  res.json = b => { res.cuerpo = b; return res; };
  return res;
}

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  // Un atleta registrado desde la app queda con rol "Atleta"; los de prueba son "Futbolista"
  await query("INSERT INTO usuarios (nombre, email, password, rol, estado) VALUES ('Ana Nueva', 'ana@vital.com', 'x', 'Atleta', 'Activo')");
  const { rows } = await query('SELECT id, email FROM usuarios');
  for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
}, 30000);

describe('listado de usuarios', () => {
  test('el filtro "Atleta" incluye a los atletas de los dos nombres de rol', async () => {
    const lista = await usuarios.listar({ rol: 'Futbolista' });
    const correos = lista.map(u => u.email);
    expect(correos).toEqual(expect.arrayContaining(['ana@vital.com', 'carlos@vital.com']));
    expect(lista.every(u => ['Atleta', 'Futbolista'].includes(u.rol))).toBe(true);
    expect(await usuarios.listar({ rol: 'Atleta' })).toHaveLength(lista.length);
  });

  test('el filtro "Médico" encuentra a los médicos', async () => {
    const lista = await usuarios.listar({ rol: 'Medico' });
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every(u => ['Medico', 'Médico'].includes(u.rol))).toBe(true);
  });

  test('indica quién tiene foto de perfil', async () => {
    await fotos.guardar(ids.carlos, JPEG);
    const lista = await usuarios.listar({});
    expect(lista.find(u => u.id == ids.carlos).tieneFoto).toBe(true);
    expect(lista.find(u => u.id == ids.ana).tieneFoto).toBe(false);
  });
});

describe('moderación de fotos', () => {
  test('el admin retira una foto y el usuario recibe un aviso', async () => {
    await fotos.guardar(ids.diego, JPEG);
    const res = respuesta();
    await ctrl.deleteFotoUsuario({ params: { id: String(ids.diego) } }, res);
    expect(res.cuerpo).toEqual({ ok: true });
    expect(await fotos.obtener(ids.diego)).toBeNull();

    await new Promise(r => setTimeout(r, 50)); // el aviso se crea después de responder
    const { rows } = await query("SELECT mensaje FROM alertas WHERE user_id = $1 AND tipo = 'cuenta'", [ids.diego]);
    expect(rows[0].mensaje).toMatch(/retiró tu foto/);
  });

  test('si el usuario no tiene foto responde 404', async () => {
    const res = respuesta();
    await ctrl.deleteFotoUsuario({ params: { id: String(ids.ana) } }, res);
    expect(res.statusCode).toBe(404);
  });
});

describe('el administrador no puede dejarse fuera', () => {
  const pedir = (fn, params, body = {}) => { const res = respuesta(); return fn({ params, body, user: { id: ids.admin, rol: 'Administrador' } }, res).then(() => res); };

  test('no puede quitarse el rol, desactivarse ni eliminarse', async () => {
    const id = String(ids.admin);
    expect((await pedir(ctrl.putUsuario, { id }, { rol: 'Atleta' })).statusCode).toBe(400);
    expect((await pedir(ctrl.putUsuario, { id }, { estado: 'Inactivo' })).statusCode).toBe(400);
    expect((await pedir(ctrl.deleteUsuario, { id })).statusCode).toBe(400);
    const { rows } = await query('SELECT rol, estado FROM usuarios WHERE id = $1', [ids.admin]);
    expect(rows[0]).toEqual({ rol: 'Administrador', estado: 'Activo' });
  });

  test('valida el rol, el estado y que el correo no esté repetido', async () => {
    const id = String(ids.diego);
    expect((await pedir(ctrl.putUsuario, { id }, { rol: 'Hacker' })).statusCode).toBe(400);
    expect((await pedir(ctrl.putUsuario, { id }, { estado: 'Borrado' })).statusCode).toBe(400);
    expect((await pedir(ctrl.putUsuario, { id }, { email: 'carlos@vital.com' })).statusCode).toBe(409);
    expect((await pedir(ctrl.putUsuario, { id }, { nombre: 'Diego T.' })).cuerpo).toMatchObject({ nombre: 'Diego T.' });
  });
});
