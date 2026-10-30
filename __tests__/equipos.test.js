// Equipos y acceso a atletas: integración con la base pg-mem real (sin mocks).
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/equipos/equipos.service');
const nutricionista = require('../servidor/api/nutricionista/nutricionista.service');
const mensajes = require('../servidor/api/mensajes/mensajes.service');

const ids = {};
const yo = (nombre, rol) => ({ id: ids[nombre], rol });
let maria, pedro, medico, carlos, diego, admin;

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  const { rows } = await query('SELECT id, email FROM usuarios');
  for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
  maria = yo('maria', 'Nutricionista'); pedro = yo('pedro', 'Nutricionista'); medico = yo('medico', 'Medico');
  carlos = yo('carlos', 'Atleta'); diego = yo('diego', 'Atleta'); admin = yo('admin', 'Administrador');
}, 30000);

afterAll(() => console.log.mockRestore());

describe('sin equipos (club único)', () => {
  test('cada profesional ve a todos los atletas, como antes', async () => {
    expect(await svc.atletasVisibles(maria)).toBeNull();
    expect(await svc.puedeVerAtleta(medico, ids.diego)).toBe(true);
    expect((await nutricionista.listarFutbolistas(maria)).map(a => a.nombre).sort()).toEqual(['Carlos Ruiz', 'Diego Torres']);
  });

  test('el atleta solo se ve a sí mismo y un rol desconocido a nadie', async () => {
    expect(await svc.atletasVisibles(carlos)).toEqual([ids.carlos]);
    expect(await svc.atletasVisibles({ id: 99, rol: 'Otro' })).toEqual([]);
  });
});

describe('con equipos', () => {
  let sub17, basquet;

  test('el admin crea equipos con un código de invitación', async () => {
    sub17 = await svc.crear({ nombre: 'Sub-17', deporte: 'Fútbol' });
    expect(sub17.codigo).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    basquet = await svc.crear({ nombre: 'Básquet A', deporte: 'Baloncesto' });
    expect(basquet.codigo).not.toBe(sub17.codigo);

    await expect(svc.crear({ nombre: 'sub-17' })).rejects.toMatchObject({ status: 409 });
    await expect(svc.crear({ nombre: 'X' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.crear({ nombre: 'Curling', deporte: 'Curling' })).rejects.toMatchObject({ status: 400 });
  });

  test('un profesional solo ve a los atletas de sus equipos; sin equipo, a nadie', async () => {
    await svc.agregarMiembro(sub17.id, ids.maria);
    await svc.agregarMiembro(sub17.id, ids.carlos);

    expect(await svc.atletasVisibles(maria)).toEqual([ids.carlos]);
    expect(await svc.puedeVerAtleta(maria, ids.diego)).toBe(false);
    expect(await svc.atletasVisibles(pedro)).toEqual([]);
    expect(await svc.atletasVisibles(admin)).toBeNull();

    const lista = await nutricionista.listarFutbolistas(maria);
    expect(lista.map(a => a.nombre)).toEqual(['Carlos Ruiz']);
    expect(lista[0].equipos).toEqual(['Sub-17']);
  });

  test('el atleta se une con el código (sin importar mayúsculas ni guiones) y solo está en un equipo', async () => {
    const codigo = basquet.codigo.toLowerCase().replace(/^(...)/, '$1-');
    expect(await svc.unirseConCodigo(diego, codigo)).toMatchObject({ nombre: 'Básquet A' });
    await svc.unirseConCodigo(diego, sub17.codigo);
    const { rows } = await query('SELECT equipo_id FROM equipo_miembros WHERE user_id = $1', [ids.diego]);
    expect(rows.map(r => Number(r.equipo_id))).toEqual([sub17.id]);
    expect(await svc.puedeVerAtleta(maria, ids.diego)).toBe(true);

    await svc.unirseConCodigo(diego, basquet.codigo); // vuelve a Básquet
    expect(await svc.puedeVerAtleta(maria, ids.diego)).toBe(false);
  });

  test('los profesionales no se unen con código y los códigos malos se rechazan', async () => {
    await expect(svc.unirseConCodigo(pedro, sub17.codigo)).rejects.toMatchObject({ status: 403 });
    await expect(svc.unirseConCodigo(carlos, 'ABC')).rejects.toMatchObject({ status: 400 });
    await expect(svc.unirseConCodigo(carlos, 'ZZZZZZ')).rejects.toMatchObject({ status: 404 });
  });

  test('renovar el código invalida el anterior', async () => {
    const viejo = sub17.codigo;
    sub17 = await svc.renovarCodigo(sub17.id);
    expect(sub17.codigo).not.toBe(viejo);
    await expect(svc.unirseConCodigo(diego, viejo)).rejects.toMatchObject({ status: 404 });
  });

  test('el atleta ve a los profesionales de su equipo pero no el código ni a sus compañeros', async () => {
    const [equipo] = await svc.misEquipos(carlos);
    expect(equipo).toMatchObject({ nombre: 'Sub-17' });
    expect(equipo.profesionales.map(p => p.nombre)).toEqual(['Maria Gomez']);
    expect(equipo.codigo).toBeUndefined();
    expect(equipo.atletas).toBeUndefined();

    const [deMaria] = await svc.misEquipos(maria);
    expect(deMaria.atletas.map(a => a.nombre)).toEqual(['Carlos Ruiz']);
  });

  test('chat: atleta y profesional solo hablan si comparten equipo', async () => {
    const usuarios = (await query('SELECT id, nombre, rol FROM usuarios')).rows;
    const de = email => usuarios.find(u => Number(u.id) === ids[email]);
    expect(await svc.puedenHablar(carlos, de('maria'))).toBe(true);
    expect(await svc.puedenHablar(diego, de('maria'))).toBe(false);
    expect(await svc.puedenHablar(maria, de('medico'))).toBe(true); // entre profesionales no se limita

    await expect(mensajes.enviar(diego, ids.maria, 'hola')).rejects.toMatchObject({ status: 403 });
    const contactos = (await mensajes.listarContactos({ ...maria, nombre: 'María' })).map(c => c.nombre);
    expect(contactos).toContain('Carlos Ruiz');
    expect(contactos).not.toContain('Diego Torres');
    expect(contactos).toContain('Dr. Vital');
  });

  test('el listado del admin muestra miembros y atletas sin equipo', async () => {
    await svc.quitarMiembro(basquet.id, ids.diego);
    const { equipos, sinEquipo } = await svc.listar();
    const s = equipos.find(e => e.id === sub17.id);
    expect(s.atletas.map(a => a.nombre)).toEqual(['Carlos Ruiz']);
    expect(s.profesionales.map(p => p.nombre)).toEqual(['Maria Gomez']);
    expect(sinEquipo.map(a => a.nombre)).toEqual(['Diego Torres']);
  });

  test('borrar todos los equipos vuelve al club único', async () => {
    expect(await svc.eliminar(sub17.id)).toBe(true);
    expect(await svc.eliminar(basquet.id)).toBe(true);
    expect(await svc.eliminar(basquet.id)).toBe(false);
    expect(await svc.atletasVisibles(maria)).toBeNull();
  });
});

describe('rutas protegidas por equipo', () => {
  let servidor, base, usuario, equipo;

  beforeAll(async () => {
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = usuario; next(); });
    app.use('/api/salud', require('../servidor/api/salud').router);
    app.use('/api/equipos', require('../servidor/api/equipos').router);
    servidor = app.listen(0);
    base = `http://127.0.0.1:${servidor.address().port}/api`;
    equipo = await svc.crear({ nombre: 'Primer equipo' });
    await svc.agregarMiembro(equipo.id, ids.medico);
    await svc.agregarMiembro(equipo.id, ids.carlos);
  });

  afterAll(async () => { servidor.close(); await svc.eliminar(equipo.id); });

  const pedir = (como, metodo, ruta, cuerpo) => {
    usuario = como;
    return fetch(base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo && JSON.stringify(cuerpo) });
  };

  test('el médico abre la salud de su atleta, pero no la de otro equipo', async () => {
    expect((await pedir(medico, 'GET', `/salud/${ids.carlos}`)).status).toBe(200);
    const res = await pedir(medico, 'GET', `/salud/${ids.diego}`);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/equipos/);
    expect((await pedir(diego, 'GET', `/salud/${ids.diego}`)).status).toBe(200);
  });

  test('solo el admin gestiona equipos; el atleta se une por código', async () => {
    expect((await pedir(medico, 'POST', '/equipos', { nombre: 'Pirata' })).status).toBe(403);
    expect((await pedir(carlos, 'GET', '/equipos')).status).toBe(403);
    expect((await pedir(admin, 'GET', '/equipos')).status).toBe(200);
    const unirse = await pedir(diego, 'POST', '/equipos/unirse', { codigo: equipo.codigo });
    expect(unirse.status).toBe(200);
    expect((await pedir(medico, 'GET', `/salud/${ids.diego}`)).status).toBe(200);
  });
});
