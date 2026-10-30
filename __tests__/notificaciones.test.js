// Notificaciones en el celular: integración con pg-mem; el envío real se sustituye por uno falso.
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/notificaciones/notificaciones.service');
const { hoyISO } = require('../servidor/compartido/fechas');

const enviados = [];
const sus = n => ({ endpoint: `https://push.ejemplo.com/${n}`, keys: { p256dh: 'clave-' + n, auth: 'auth-' + n } });
let carlos, diego;

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  const id = async e => Number((await query('SELECT id FROM usuarios WHERE email = $1', [e])).rows[0].id);
  carlos = await id('carlos@vital.com');
  diego = await id('diego@vital.com');
  svc._usarEnviador(async (s, datos) => {
    if (s.endpoint.endsWith('/caducada')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
    enviados.push({ endpoint: s.endpoint, ...JSON.parse(datos) });
  });
}, 30000);

afterAll(() => console.log.mockRestore());
beforeEach(() => { enviados.length = 0; });

test('genera sus claves una sola vez', async () => {
  const a = await svc.clavePublica();
  expect(a).toMatch(/^[A-Za-z0-9_-]{80,}$/);
  expect(await svc.clavePublica()).toBe(a);
  expect(Number((await query('SELECT COUNT(*) AS n FROM push_claves')).rows[0].n)).toBe(1);
});

test('suscribe un dispositivo, le envía avisos y borra las suscripciones caducadas', async () => {
  await svc.suscribir(carlos, { suscripcion: sus('carlos') });
  await svc.suscribir(carlos, { suscripcion: sus('caducada') });
  await expect(svc.suscribir(carlos, { suscripcion: { endpoint: 'http://inseguro' } })).rejects.toMatchObject({ status: 400 });
  expect(await svc.estado(carlos, sus('carlos').endpoint)).toEqual({ suscrito: true, recordatorio: true });

  expect(await svc.enviar(carlos, { titulo: 'Hola', cuerpo: 'Prueba' })).toBe(1);
  expect(enviados).toEqual([expect.objectContaining({ endpoint: sus('carlos').endpoint, titulo: 'Hola', cuerpo: 'Prueba' })]);
  expect((await svc.estado(carlos, sus('caducada').endpoint)).suscrito).toBe(false); // 410: se borró
});

test('una alerta del panel y un mensaje llegan al celular', async () => {
  await require('../servidor/api/panel').crearAlerta(carlos, 'lesion', 'Tu médico registró una lesión', '01/10/2026');
  const mensajes = require('../servidor/api/mensajes/mensajes.service');
  const maria = Number((await query("SELECT id FROM usuarios WHERE email = 'maria@vital.com'")).rows[0].id);
  await mensajes.enviar({ id: maria, rol: 'Nutricionista', nombre: 'Maria Gomez' }, carlos, '¿Cómo va la dieta?');
  await new Promise(r => setTimeout(r, 50)); // los avisos salen sin esperar
  expect(enviados.map(e => e.titulo)).toEqual(['🩹 Tu médico', '💬 Maria Gomez']);
});

test('recordatorio diario: solo a quien no registró su salud hoy y lo tiene activado', async () => {
  await svc.suscribir(diego, { suscripcion: sus('diego'), recordatorio: false });
  let r = await svc.recordatorioDiario();
  expect(r).toMatchObject({ candidatos: 1, avisados: 1 }); // Carlos sí; Diego lo apagó
  expect(enviados[0].titulo).toMatch(/Buenos días, Carlos/);

  enviados.length = 0;
  await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1, $2, 3, 8, 8)', [carlos, hoyISO()]);
  r = await svc.recordatorioDiario();
  expect(r.avisados).toBe(0);
});

test('desactivar en un dispositivo', async () => {
  await svc.desuscribir(carlos, sus('carlos').endpoint);
  expect(await svc.enviar(carlos, { titulo: 'x' })).toBe(0);
});
