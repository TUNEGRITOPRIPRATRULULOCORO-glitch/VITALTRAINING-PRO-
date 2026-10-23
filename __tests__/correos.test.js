// Servicio de correo y plantillas: unitarios. Recuperar contraseña y avisos: integración con pg-mem.
const correo = require('../servicios/correo');
const plantillas = require('../servicios/correo/plantillas');

const ENV_ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
  jest.restoreAllMocks();
});

describe('servicio de correo', () => {
  test('sin Brevo configurado guarda el correo en lugar de enviarlo', async () => {
    delete process.env.BREVO_API_KEY;
    correo.enviados.length = 0;
    const r = await correo.enviarCorreo({ para: 'a@b.com', asunto: 'Hola', html: '<p>Hola</p>', texto: 'Hola' });
    expect(r).toEqual({ ok: true, modo: 'consola' });
    expect(correo.enviados).toEqual([expect.objectContaining({ para: 'a@b.com', asunto: 'Hola' })]);
  });

  test('con Brevo configurado envía la petición correcta', async () => {
    process.env.BREVO_API_KEY = 'clave-de-prueba';
    process.env.CORREO_REMITENTE = 'equipo@vital.com';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, text: async () => '' });

    const r = await correo.enviarCorreo({ para: 'atleta@vital.com', nombre: 'Carlos', asunto: 'Prueba', html: '<b>x</b>', texto: 'x' });
    expect(r).toEqual({ ok: true, modo: 'brevo' });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(opciones.headers['api-key']).toBe('clave-de-prueba');
    expect(JSON.parse(opciones.body)).toMatchObject({
      sender: { email: 'equipo@vital.com', name: 'VitalTraining' },
      to: [{ email: 'atleta@vital.com', name: 'Carlos' }],
      subject: 'Prueba',
    });
  });

  test('si Brevo rechaza o no hay red, devuelve ok: false sin lanzar errores', async () => {
    process.env.BREVO_API_KEY = 'x';
    process.env.CORREO_REMITENTE = 'equipo@vital.com';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'unauthorized' });
    expect(await correo.enviarCorreo({ para: 'a@b.com', asunto: 'x', html: 'x', texto: 'x' })).toMatchObject({ ok: false, motivo: 'proveedor' });
    global.fetch.mockRejectedValueOnce(new Error('sin red'));
    expect(await correo.enviarCorreo({ para: 'a@b.com', asunto: 'x', html: 'x', texto: 'x' })).toMatchObject({ ok: false, motivo: 'red' });
  });

  test('sin destinatario no hace nada', async () => {
    expect(await correo.enviarCorreo({ para: '', asunto: 'x' })).toMatchObject({ ok: false });
  });

  test('urlApp usa APP_URL, luego la URL de Render y si no localhost', () => {
    delete process.env.APP_URL;
    delete process.env.RENDER_EXTERNAL_URL;
    process.env.PORT = '4000';
    expect(correo.urlApp()).toBe('http://localhost:4000');
    process.env.RENDER_EXTERNAL_URL = 'https://vital.onrender.com/';
    expect(correo.urlApp()).toBe('https://vital.onrender.com');
    process.env.APP_URL = 'https://vitaltraining.app';
    expect(correo.urlApp()).toBe('https://vitaltraining.app');
  });
});

describe('plantillas', () => {
  test('escapan el HTML de los nombres para evitar inyecciones', () => {
    const p = plantillas.alertaSalud({ atleta: '<script>alert(1)</script>', problemas: ['Fatiga alta (9/10)'], url: 'https://x' });
    expect(p.html).not.toContain('<script>');
    expect(p.html).toContain('&lt;script&gt;');
  });

  test('cada correo trae asunto, HTML, texto plano y el enlace', () => {
    for (const p of [
      plantillas.bienvenida({ nombre: 'Carlos Ruiz', url: 'https://app' }),
      plantillas.restablecer({ nombre: 'Carlos Ruiz', url: 'https://app/?restablecer=abc', minutos: 60 }),
      plantillas.alertaCarga({ nombre: 'Carlos Ruiz', cambioPorcentaje: 90, paraAtleta: true, url: 'https://app' }),
      plantillas.alertaCarga({ nombre: 'Carlos Ruiz', cambioPorcentaje: 90, paraAtleta: false, url: 'https://app' }),
    ]) {
      expect(p.asunto).toBeTruthy();
      expect(p.html).toContain('https://app');
      expect(p.texto).toContain('https://app');
    }
  });
});

describe('recuperar contraseña y avisos (integración)', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const auth = require('../servidor/api/auth/auth.service');
  const avisos = require('../servidor/api/avisos');
  const historial = require('../servidor/api/panel/historial.service');
  const ids = {};
  const tokenDe = c => /restablecer=([a-f0-9]{64})/.exec(c.texto)?.[1];

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    const { rows } = await query('SELECT id, email FROM usuarios');
    for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
  }, 30000);

  beforeEach(() => {
    delete process.env.BREVO_API_KEY;
    correo.enviados.length = 0;
  });

  test('un correo no registrado no recibe nada (y no se revela)', async () => {
    await auth.solicitarRestablecimiento('nadie@vital.com');
    await auth.solicitarRestablecimiento('no-es-un-correo');
    expect(correo.enviados).toHaveLength(0);
  });

  test('el enlace cambia la contraseña una sola vez', async () => {
    await auth.solicitarRestablecimiento('CARLOS@vital.com');
    expect(correo.enviados).toHaveLength(1);
    expect(correo.enviados[0].para).toBe('carlos@vital.com');
    const token = tokenDe(correo.enviados[0]);
    expect(token).toBeTruthy();

    expect(await auth.restablecerPassword(token, 'corta')).toMatchObject({ status: 400 });
    expect(await auth.restablecerPassword(token, 'nuevaClave123')).toEqual({ ok: true });
    expect(await auth.login('carlos@vital.com', 'nuevaClave123')).toHaveProperty('token');
    expect((await auth.login('carlos@vital.com', 'futbol123')).status).toBe(401);
    expect(await auth.restablecerPassword(token, 'otraClave123')).toMatchObject({ status: 400 }); // ya usado
  });

  test('la nueva contraseña no puede ser igual a la anterior (y el enlace sigue sirviendo)', async () => {
    await auth.solicitarRestablecimiento('maria@vital.com');
    const token = tokenDe(correo.enviados[0]);
    expect(await auth.restablecerPassword(token, 'nutri123')).toMatchObject({ status: 400, error: expect.stringMatching(/distinta/) });
    expect(await auth.restablecerPassword(token, 'otraClaveMaria1')).toEqual({ ok: true });
  });

  test('pedir un enlace nuevo anula el anterior', async () => {
    await auth.solicitarRestablecimiento('diego@vital.com');
    await auth.solicitarRestablecimiento('diego@vital.com');
    const [viejo, nuevo] = correo.enviados.map(tokenDe);
    expect(await auth.restablecerPassword(viejo, 'claveDiego123')).toMatchObject({ status: 400 });
    expect(await auth.restablecerPassword(nuevo, 'claveDiego123')).toEqual({ ok: true });
  });

  test('un enlace caducado o inventado no sirve', async () => {
    await auth.solicitarRestablecimiento('pedro@vital.com');
    const token = tokenDe(correo.enviados[0]);
    await query("UPDATE restablecimientos SET expira = $1 WHERE usado = false", [new Date(Date.now() - 60000).toISOString()]);
    expect(await auth.restablecerPassword(token, 'clavePedro123')).toMatchObject({ status: 400 });
    expect(await auth.restablecerPassword('f'.repeat(64), 'clavePedro123')).toMatchObject({ status: 400 });
    expect(await auth.restablecerPassword('<script>', 'clavePedro123')).toMatchObject({ status: 400 });
  });

  test('la alerta de salud llega a los médicos', async () => {
    await avisos.alertaSalud(ids.carlos, ['Fatiga alta (9/10)', 'Sueño insuficiente (3/10)']);
    expect(correo.enviados.map(c => c.para)).toEqual(['medico@vital.com']);
    expect(correo.enviados[0].texto).toContain('Fatiga alta (9/10)');
  });

  test('sin problemas de salud no se envía nada', async () => {
    await avisos.alertaSalud(ids.carlos, []);
    expect(correo.enviados).toHaveLength(0);
  });

  test('la carga en riesgo alto avisa al atleta y a los médicos, como mucho una vez por semana', async () => {
    const dia = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
    // 3 semanas suaves y una última semana muy dura
    for (let n = 27; n >= 1; n--)
      await query('INSERT INTO cumplimiento (user_id, fecha, dia_semana, estado, rpe, duracion_minutos) VALUES ($1, $2, $3, $4, $5, $6)',
        [ids.diego, dia(n), 'd' + n, 'completo', n <= 7 ? 9 : 4, n <= 7 ? 110 : 45]);

    expect(await historial.revisarCargaAlta(ids.diego)).toBe(true);
    expect(correo.enviados.map(c => c.para).sort()).toEqual(['diego@vital.com', 'medico@vital.com']);
    const { rows } = await query("SELECT mensaje FROM alertas WHERE user_id = $1 AND tipo = 'carga'", [ids.diego]);
    expect(rows).toHaveLength(1);

    correo.enviados.length = 0;
    expect(await historial.revisarCargaAlta(ids.diego)).toBe(false); // ya avisado esta semana
    expect(correo.enviados).toHaveLength(0);
  });

  test('con carga normal no se avisa', async () => {
    expect(await historial.revisarCargaAlta(ids.carlos)).toBe(false);
    expect(correo.enviados).toHaveLength(0);
  });
});
