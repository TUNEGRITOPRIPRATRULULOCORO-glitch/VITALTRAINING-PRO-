// Citas con el médico o el nutricionista: quién puede pedirla, horas, estados y avisos (pg-mem).
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const citas = require('../servidor/api/citas/citas.service');
const equipos = require('../servidor/api/equipos/equipos.service');
const { sumarDias } = require('../servidor/compartido/fechas');

let carlos, diego, maria, medico, pedro;
const usuario = async (email) => {
  const { rows: [u] } = await query('SELECT id, rol, nombre FROM usuarios WHERE email = $1', [email]);
  return { id: Number(u.id), rol: u.rol, nombre: u.nombre };
};
const manana = () => sumarDias(citas.ahoraColombia().fecha, 1);

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  [carlos, diego, maria, medico, pedro] = await Promise.all(
    ['carlos@vital.com', 'diego@vital.com', 'maria@vital.com', 'medico@vital.com', 'pedro@vital.com'].map(usuario));
}, 30000);
afterAll(() => console.log.mockRestore());

test('sin equipos en el club, el atleta puede pedir cita con todos los médicos y nutricionistas', async () => {
  const lista = await citas.profesionalesDe(carlos);
  expect(lista.map(p => p.id)).toEqual(expect.arrayContaining([maria.id, medico.id, pedro.id]));
  expect(lista.every(p => ['Nutricionista', 'Medico', 'Médico'].includes(p.rol))).toBe(true);
  await expect(citas.profesionalesDe(maria)).rejects.toMatchObject({ status: 403 });
});

test('pedir cita: validaciones, hora ocupada y aviso', async () => {
  const base = { profesionalId: medico.id, fecha: manana(), hora: '09:00', modalidad: 'virtual', motivo: 'Molestia en la rodilla' };
  await expect(citas.pedir(carlos, { ...base, hora: '06:00' })).rejects.toThrow(/7:00/);
  await expect(citas.pedir(carlos, { ...base, fecha: '2020-01-01' })).rejects.toThrow(/ya pasó/);
  await expect(citas.pedir(carlos, { ...base, fecha: sumarDias(manana(), 90) })).rejects.toThrow(/60 días/);
  await expect(citas.pedir(carlos, { ...base, motivo: '' })).rejects.toThrow(/motivo/);

  const cita = await citas.pedir(carlos, base);
  expect(cita).toMatchObject({ estado: 'pendiente', hora: '09:00', modalidad: 'virtual', profesional: { id: medico.id }, atleta: { id: carlos.id } });
  await expect(citas.pedir(diego, base)).rejects.toMatchObject({ status: 409 });          // hora tomada
  expect(await citas.horasOcupadas(diego, medico.id, manana())).toContain('09:00');
  expect((await citas.listar(medico)).map(c => c.id)).toContain(cita.id);              // agenda del médico
  expect((await citas.listar(diego)).map(c => c.id)).not.toContain(cita.id);
});

test('estados: el profesional confirma o rechaza, los dos cancelan, el atleta recibe la alerta', async () => {
  const cita = await citas.pedir(carlos, { profesionalId: maria.id, fecha: manana(), hora: '10:30', motivo: 'Plan para el torneo' });
  await expect(citas.cambiarEstado(carlos, cita.id, { estado: 'confirmada' })).rejects.toMatchObject({ status: 409 }); // el atleta no confirma
  await expect(citas.cambiarEstado(pedro, cita.id, { estado: 'confirmada' })).rejects.toMatchObject({ status: 403 });  // no es su cita

  expect(await citas.cambiarEstado(maria, cita.id, { estado: 'confirmada', respuesta: 'Trae tu registro de comidas' }))
    .toMatchObject({ estado: 'confirmada', respuesta: 'Trae tu registro de comidas' });
  const { rows: alertas } = await query("SELECT mensaje FROM alertas WHERE user_id = $1 AND tipo = 'cita'", [carlos.id]);
  expect(alertas.at(-1).mensaje).toMatch(/confirmó tu cita/);

  expect(await citas.cambiarEstado(carlos, cita.id, { estado: 'cancelada' })).toMatchObject({ estado: 'cancelada' });
  await expect(citas.cambiarEstado(maria, cita.id, { estado: 'realizada' })).rejects.toMatchObject({ status: 409 });
  // Cancelada: la hora vuelve a estar libre
  expect(await citas.pedir(diego, { profesionalId: maria.id, fecha: manana(), hora: '10:30', motivo: 'Dudas de la dieta' })).toMatchObject({ estado: 'pendiente' });
});

test('con equipos: solo los de su equipo, y el administrador puede asignar profesionales a quien no tiene equipo', async () => {
  const e = await equipos.crear({ nombre: 'Citas FC' });
  await equipos.agregarMiembro(e.id, carlos.id);
  await equipos.agregarMiembro(e.id, medico.id);
  expect((await citas.profesionalesDe(carlos)).map(p => p.id)).toEqual([medico.id]);
  await expect(citas.pedir(carlos, { profesionalId: maria.id, fecha: manana(), hora: '12:00', motivo: 'Consulta' })).rejects.toMatchObject({ status: 403 });

  // Diego no tiene equipo: sin profesionales hasta que el admin le asigna a María
  expect(await citas.profesionalesDe(diego)).toEqual([]);
  expect((await equipos.listar()).sinEquipo.find(a => a.id === diego.id).asignados).toEqual([]);
  await equipos.asignar(diego.id, maria.id);
  expect((await citas.profesionalesDe(diego)).map(p => p.id)).toEqual([maria.id]);
  expect((await equipos.listar()).sinEquipo.find(a => a.id === diego.id).asignados).toEqual([expect.objectContaining({ id: maria.id })]);
  // La asignación también le da acceso a verlo y a escribirse
  expect(await equipos.puedeVerAtleta({ id: maria.id, rol: 'Nutricionista' }, diego.id)).toBe(true);
  expect(await equipos.puedenHablar({ id: diego.id, rol: 'Atleta' }, { id: maria.id, rol: 'Nutricionista' })).toBe(true);
  await expect(equipos.asignar(diego.id, carlos.id)).rejects.toMatchObject({ status: 400 });

  await equipos.quitarAsignacion(diego.id, maria.id);
  expect(await citas.profesionalesDe(diego)).toEqual([]);
  expect(await equipos.puedeVerAtleta({ id: maria.id, rol: 'Nutricionista' }, diego.id)).toBe(false);
});
