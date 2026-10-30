// Registro con equipo (unirse con código o crear el propio), datos del atleta y perfil médico con lo escrito a mano.
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const auth = require('../servidor/api/auth/auth.service');
const equipos = require('../servidor/api/equipos/equipos.service');
const { problemaFechaNacimiento } = require('../servidor/compartido/fechas');
const { competicionDe } = require('../servidor/compartido/deportes');

const atleta = (email, extra = {}) => ({
  nombre: 'Atleta Prueba', email, password: 'clave-segura-1', peso: 70, altura: 175,
  fechaNacimiento: '2004-06-01', sexo: 'Hombre', deporte: 'Fútbol', posicion: 'Delantero', ...extra,
});

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
}, 30000);
afterAll(() => console.log.mockRestore());

test('fecha de nacimiento: que exista, no futura y 5 años o más', () => {
  expect(problemaFechaNacimiento('2029-05-30', '2026-10-30')).toMatch(/futura/);
  expect(problemaFechaNacimiento('2021-10-31', '2026-10-30')).toMatch(/5 años/);
  expect(problemaFechaNacimiento('2021-10-30', '2026-10-30')).toBeNull();
  expect(problemaFechaNacimiento('2010-02-30', '2026-10-30')).toMatch(/no existe/);
  expect(problemaFechaNacimiento('1900-01-01', '2026-10-30')).toMatch(/año/);
  expect(problemaFechaNacimiento('', '2026-10-30')).toMatch(/Escribe/);
});

test('la competición se llama según el deporte', () => {
  expect(competicionDe('Boxeo')).toMatchObject({ dia: 'Día de sparring o pelea', pregunta: '¿Qué día tienes sparring o pelea?' });
  expect(competicionDe('Running').vispera).toBe('Víspera de carrera');
  expect(competicionDe().nombre).toBe('partido');
});

test('el registro del atleta exige fecha válida y sexo, y guarda sexo y día de competición', async () => {
  expect(await auth.registro(atleta('nino@x.com', { fechaNacimiento: '2024-01-01' }))).toMatchObject({ status: 400, error: expect.stringMatching(/5 años/) });
  expect(await auth.registro(atleta('sinsexo@x.com', { sexo: '' }))).toMatchObject({ status: 400, error: expect.stringMatching(/sexo/) });

  const r = await auth.registro(atleta('boxeador@x.com', { deporte: 'Boxeo', posicion: 'Competición', estilo: 'Pegador', diaPartido: 'Viernes' }));
  expect(r.usuario).toMatchObject({ rol: 'Atleta', estilo: 'Pegador' });
  const { rows: [p] } = await query('SELECT sexo, dia_partido FROM perfiles WHERE user_id = $1', [r.usuario.id]);
  expect(p).toEqual({ sexo: 'Hombre', dia_partido: 'Viernes' });

  // La rutina de boxeo incluye el trabajo de su estilo y su pelea cae el viernes
  const pm = require('../servidor/api/perfilMedico/perfilMedico.service');
  const ficha = await pm.obtenerFicha(r.usuario.id);
  const guardado = await pm.guardar(r.usuario.id, { condiciones: [], alergias: [] }, ficha.posicion, ficha.deporte, ficha);
  expect(guardado.rutinaSemanal.descripcion).toMatch(/pegador/);
  expect(guardado.rutinaSemanal.notas.join(' ')).toMatch(/Pegador: potencia/);
  expect(guardado.rutinaSemanal.semana.find(d => d.dia === 'Viernes').tipo).toMatch(/Combate/);
  expect(JSON.stringify(guardado.rutinaSemanal)).toMatch(/Golpes de potencia en saco pesado/);
});

test('crear equipo: la cuenta es de entrenador, el equipo nace con su código y el entrenador lo ve', async () => {
  const r = await auth.registro({ nombre: 'Profe Nuevo', email: 'profe-nuevo@x.com', password: 'clave-segura-1', modo: 'crear', equipoNombre: 'Boxeo Club Norte', equipoDeporte: 'Boxeo' });
  expect(r.usuario).toMatchObject({ rol: 'Entrenador', deporte_principal: 'Boxeo' });
  expect(r.equipo).toMatchObject({ nombre: 'Boxeo Club Norte', codigo: expect.stringMatching(/^[A-Z0-9]{6}$/) });

  const mios = await equipos.misEquipos({ id: r.usuario.id, rol: 'Entrenador' });
  expect(mios[0]).toMatchObject({ nombre: 'Boxeo Club Norte', codigo: r.equipo.codigo });

  // Otro equipo con el mismo nombre: no se crea la cuenta
  const repetido = await auth.registro({ nombre: 'Otro Profe', email: 'otro-profe@x.com', password: 'clave-segura-1', modo: 'crear', equipoNombre: 'boxeo club norte' });
  expect(repetido.status).toBe(409);
  expect((await query("SELECT COUNT(*) AS n FROM usuarios WHERE email = 'otro-profe@x.com'")).rows[0].n).toBe(0);

  // Unirse con el código: primero se ve el equipo, luego se crea la cuenta dentro de él
  expect(await auth.equipoPorCodigo(r.equipo.codigo.toLowerCase())).toEqual({ nombre: 'Boxeo Club Norte', deporte: 'Boxeo' });
  expect(await auth.equipoPorCodigo('ZZZZZZ')).toBeNull();
  const malo = await auth.registro(atleta('perdido@x.com', { modo: 'unirse', codigoEquipo: 'ZZZZZZ' }));
  expect(malo.status).toBe(404);

  const unido = await auth.registro(atleta('alumno@x.com', { modo: 'unirse', codigoEquipo: r.equipo.codigo, deporte: 'Boxeo', posicion: 'Recreativo' }));
  expect(unido.equipo).toEqual({ nombre: 'Boxeo Club Norte' });
  const visibles = await equipos.atletasVisibles({ id: r.usuario.id, rol: 'Entrenador' });
  expect(visibles.map(Number)).toEqual([Number(unido.usuario.id)]); // el entrenador solo ve a sus atletas
  // El atleta no ve el código ni a sus compañeros
  expect((await equipos.misEquipos({ id: unido.usuario.id, rol: 'Atleta' }))[0]).not.toHaveProperty('codigo');
});

test('perfil médico: condiciones y alergias escritas a mano, limpias; la alergia nueva quita platos', async () => {
  const pm = require('../servidor/api/perfilMedico/perfilMedico.service');
  const { rows: [u] } = await query("SELECT id FROM usuarios WHERE email = 'alumno@x.com'");
  const r = await pm.guardar(u.id, {
    condiciones: ['Asma alérgica', '  Escoliosis   leve ', 'escoliosis leve', 'x'],
    alergias: ['Aguacate', 'Huevo'],
    preferencia: 'algo raro',
  }, 'Recreativo', 'Boxeo', null);
  expect(r.condiciones).toEqual(['Asma alérgica', 'Escoliosis leve']);
  expect(r.alergias).toEqual(['Aguacate', 'Huevo']);
  expect(r.preferencias).toBe('Sin restricciones');
  const tomas = ['desayuno', 'meriendaMañana', 'almuerzo', 'meriendaTarde', 'cena'];
  const platos = r.planAlimenticio.semana.flatMap(d => tomas.map(t => `${d[t]?.nombre} ${d[t]?.desc || ''}`.toLowerCase()));
  expect(platos.length).toBe(35);
  expect(platos.some(p => p.includes('aguacate'))).toBe(false);
});
