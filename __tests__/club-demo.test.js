// Club de demostración: se crea completo una sola vez, cuenta lo que la demo necesita y se borra limpio.
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const club = require('../scripts/club-demo');

const idDe = async alias => Number((await query('SELECT id FROM usuarios WHERE email = $1', [`${alias}@${club.DOMINIO}`])).rows[0]?.id);

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
}, 30000);
afterAll(() => console.log.mockRestore());

test('crea el club con su historia y no lo duplica', async () => {
  const r = await club.crearClubDemo({ password: 'clave-demo-123' });
  expect(r.creado).toBe(true);
  expect(r.cuentas).toHaveLength(8);
  expect((await club.crearClubDemo({ password: 'clave-demo-123' })).creado).toBe(false);

  const santiago = await idDe('santiago');
  const cuenta = async (sql, id) => Number((await query(sql, [id])).rows[0].n);
  expect(await cuenta('SELECT COUNT(*) AS n FROM salud WHERE user_id = $1', santiago)).toBe(28);
  expect(await cuenta('SELECT COUNT(*) AS n FROM sesiones_reloj WHERE user_id = $1', santiago)).toBe(4);
  expect(await cuenta('SELECT COUNT(*) AS n FROM series WHERE user_id = $1 AND verificado = true', santiago)).toBeGreaterThan(0);
  expect(await cuenta("SELECT COUNT(*) AS n FROM comidas WHERE user_id = $1 AND notas LIKE '%código%'", santiago)).toBeGreaterThan(3);
  expect(await cuenta('SELECT COUNT(*) AS n FROM evaluaciones WHERE user_id = $1 AND verificado = true', santiago)).toBe(12);

  const logros = await require('../servidor/api/logros/logros.service').obtener(santiago, { id: santiago, rol: 'Atleta' });
  const ganados = logros.logros.filter(l => l.conseguido);
  expect(ganados.length).toBeGreaterThan(8);
  expect(ganados.some(l => l.nuevo)).toBe(false); // ya celebrados: la demo no abre con 10 ventanas
  expect(ganados.map(l => l.clave)).toEqual(expect.arrayContaining(['racha_14', 'reloj_1', 'verificada']));

  const rendimiento = require('../servidor/api/rendimiento');
  expect((await rendimiento.obtenerResumen(await idDe('juanpablo'))).carga.riesgo).toBe('alto');
  expect((await rendimiento.obtenerResumen(await idDe('mateo'))).estadoMedico.estado).toBe('no_apto');
  expect((await rendimiento.obtenerResumen(await idDe('camila'))).carga.riesgo).not.toBe('alto'); // solo Juan Pablo da la alerta
  const camila = await idDe('camila');
  const deVuelta = await require('../servidor/api/logros/logros.service').obtener(camila, { id: camila, rol: 'Atleta' });
  expect(deVuelta.logros.find(l => l.clave === 'regreso').conseguido).toBe(true);

  // Con la contraseña elegida se entra
  const auth = require('../servidor/api/auth/auth.service');
  expect((await auth.login(`santiago@${club.DOMINIO}`, 'clave-demo-123')).token).toBeTruthy();
  expect((await auth.login(`santiago@${club.DOMINIO}`, 'demo12345')).status).toBe(401);
}, 120000);

test('si sus datos son de hace días, se renueva', async () => {
  const santiago = await idDe('santiago');
  await query('DELETE FROM salud WHERE user_id = $1 AND fecha >= $2', [santiago, require('../servidor/compartido/fechas').sumarDias(require('../servidor/compartido/fechas').hoyISO(), -3)]);
  expect((await club.crearClubDemo({ password: 'clave-demo-123' })).creado).toBe(true);
  expect(await idDe('santiago')).not.toBe(santiago);
  const { rows } = await query(`SELECT COUNT(*) AS n FROM usuarios WHERE email LIKE '%@${club.DOMINIO}'`);
  expect(Number(rows[0].n)).toBe(8);
}, 120000);

test('los correos al dominio de prueba nunca se envían', async () => {
  const correo = require('../servicios/correo');
  expect(await correo.enviarCorreo({ para: `profe@${club.DOMINIO}`, asunto: 'x', html: 'x', texto: 'x' }))
    .toEqual({ ok: false, motivo: 'dominio-de-prueba' });
});

test('se borra sin dejar rastro', async () => {
  expect((await club.borrarClubDemo()).borradas).toBe(8);
  const { rows } = await query(`SELECT COUNT(*) AS n FROM usuarios WHERE email LIKE '%@${club.DOMINIO}'`);
  expect(Number(rows[0].n)).toBe(0);
  expect(Number((await query('SELECT COUNT(*) AS n FROM equipos WHERE nombre = $1', [club.EQUIPO])).rows[0].n)).toBe(0);
  expect(Number((await query("SELECT COUNT(*) AS n FROM alimentos_codigos WHERE fuente = 'club'")).rows[0].n)).toBe(0);
});
