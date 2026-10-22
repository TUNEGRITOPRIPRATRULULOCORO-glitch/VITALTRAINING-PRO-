// Permisos: unitarios. Servicio: integración con la base pg-mem real (sin mocks).
const permisos = require('../servidor/api/mensajes/mensajes.permisos');
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/mensajes/mensajes.service');

// ─── permisos ─────────────────────────────────────────────────────────────────
describe('puedeEscribir', () => {
  const casos = [
    // remitente,       destinatario,    permitido
    ['Atleta',          'Nutricionista', true],
    ['Atleta',          'Medico',        true],
    ['Atleta',          'Administrador', false], // los atletas van por ticket
    ['Atleta',          'Atleta',        false],
    ['Nutricionista',   'Atleta',        true],
    ['Nutricionista',   'Medico',        true],
    ['Nutricionista',   'Administrador', true],
    ['Medico',          'Atleta',        true],
    ['Medico',          'Nutricionista', true],
    ['Medico',          'Administrador', true],
    ['Administrador',   'Nutricionista', true],
    ['Administrador',   'Medico',        true],
    ['Administrador',   'Atleta',        false],
  ];
  test.each(casos)('%s → %s: %s', (de, para, esperado) => {
    expect(permisos.puedeEscribir(de, para)).toBe(esperado);
  });

  test('acepta los alias Futbolista y Médico', () => {
    expect(permisos.puedeEscribir('Futbolista', 'Médico')).toBe(true);
    expect(permisos.puedeEscribir('Médico', 'Futbolista')).toBe(true);
  });

  test('un rol desconocido no puede escribir a nadie', () => {
    expect(permisos.puedeEscribir('Hacker', 'Administrador')).toBe(false);
    expect(permisos.rolesContactables('Hacker')).toEqual([]);
  });

  test('rolesContactables incluye las variantes guardadas en la base', () => {
    expect(permisos.rolesContactables('Nutricionista')).toEqual(
      expect.arrayContaining(['Atleta', 'Futbolista', 'Medico', 'Médico', 'Administrador'])
    );
  });
});

// ─── servicio (integración) ───────────────────────────────────────────────────
describe('mensajes.service', () => {
  const u = {};

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    const { rows } = await query('SELECT id, email, nombre, rol FROM usuarios');
    for (const r of rows) u[r.email.split('@')[0]] = { id: Number(r.id), nombre: r.nombre, rol: r.rol };
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('el atleta ve solo nutricionistas y médicos', async () => {
    const contactos = await svc.listarContactos(u.carlos);
    expect(new Set(contactos.map(c => c.rol))).toEqual(new Set(['Nutricionista', 'Medico']));
  });

  test('enviar y leer una conversación marca los mensajes como leídos', async () => {
    await svc.enviar(u.carlos, u.maria.id, '  Hola María  ');
    expect((await svc.noLeidos(u.maria)).total).toBe(1);

    const conv = await svc.conversacion(u.maria, u.carlos.id);
    expect(conv.contacto.nombre).toBe('Carlos Ruiz');
    expect(conv.mensajes).toEqual([expect.objectContaining({ texto: 'Hola María', mio: false })]);
    expect((await svc.noLeidos(u.maria)).total).toBe(0);
  });

  test('los contactos con mensajes sin leer salen primero', async () => {
    await svc.enviar(u.medico, u.maria.id, 'Revisa a Carlos, por favor');
    const contactos = await svc.listarContactos(u.maria);
    expect(contactos[0]).toMatchObject({ nombre: 'Dr. Vital', noLeidos: 1 });
    expect(contactos[0].ultimoMensaje).toMatchObject({ texto: 'Revisa a Carlos, por favor', mio: false });
  });

  test('noLeidos separa por rol del remitente', async () => {
    await svc.enviar(u.medico, u.admin.id, 'El expediente no carga');
    await svc.enviar(u.maria, u.admin.id, 'No puedo ver un paciente');
    expect(await svc.noLeidos(u.admin)).toEqual({ total: 2, porRol: { Medico: 1, Nutricionista: 1 } });
  });

  test('un atleta no puede escribir a administración ni a otro atleta', async () => {
    await expect(svc.enviar(u.carlos, u.admin.id, 'hola')).rejects.toMatchObject({ status: 403 });
    await expect(svc.enviar(u.carlos, u.diego.id, 'hola')).rejects.toMatchObject({ status: 403 });
  });

  test('tampoco puede leer conversaciones con quien no tiene permiso', async () => {
    await expect(svc.conversacion(u.carlos, u.admin.id)).rejects.toMatchObject({ status: 403 });
  });

  test('valida texto vacío, demasiado largo y destinatario inexistente', async () => {
    await expect(svc.enviar(u.carlos, u.maria.id, '   ')).rejects.toMatchObject({ status: 400 });
    await expect(svc.enviar(u.carlos, u.maria.id, 'x'.repeat(svc.MAX_TEXTO + 1))).rejects.toMatchObject({ status: 400 });
    await expect(svc.enviar(u.carlos, 99999, 'hola')).rejects.toMatchObject({ status: 404 });
    await expect(svc.enviar(u.carlos, 'abc', 'hola')).rejects.toMatchObject({ status: 404 });
  });

  test('no se puede escribir a un usuario inactivo', async () => {
    await query("UPDATE usuarios SET estado = 'Inactivo' WHERE id = $1", [u.pedro.id]);
    await expect(svc.enviar(u.carlos, u.pedro.id, 'hola')).rejects.toMatchObject({ status: 404 });
    const contactos = await svc.listarContactos(u.carlos);
    expect(contactos.map(c => c.nombre)).not.toContain('Pedro Lopez');
  });
});
