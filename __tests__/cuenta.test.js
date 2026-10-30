// Mi cuenta: cambiar contraseña, descargar datos y borrar la cuenta (integración con pg-mem).
const bcrypt = require('bcrypt');
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/usuarios/cuenta.service');

const ids = {};

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  const { rows } = await query('SELECT id, email FROM usuarios');
  for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
}, 30000);

afterAll(() => console.log.mockRestore());

describe('cambiar contraseña', () => {
  test('pide la actual y una nueva válida y distinta', async () => {
    await expect(svc.cambiarPassword(ids.diego, { actual: 'mala', nueva: 'nueva-clave-1' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.cambiarPassword(ids.diego, { actual: 'futbol123', nueva: 'corta' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.cambiarPassword(ids.diego, { actual: 'futbol123', nueva: 'futbol123' })).rejects.toMatchObject({ status: 400 });

    await svc.cambiarPassword(ids.diego, { actual: 'futbol123', nueva: 'nueva-clave-1' });
    const { rows } = await query('SELECT password FROM usuarios WHERE id = $1', [ids.diego]);
    expect(await bcrypt.compare('nueva-clave-1', rows[0].password)).toBe(true);
  });
});

describe('descargar mis datos', () => {
  test('trae sus datos de todas las tablas, sin contraseña ni notas clínicas privadas', async () => {
    await query("INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1, '2026-10-01', 3, 8, 7)", [ids.carlos]);
    await query("INSERT INTO notas_clinicas (user_id, texto, visible_atleta) VALUES ($1, 'Visible', true), ($1, 'Privada', false)", [ids.carlos]);
    const datos = await svc.exportar(ids.carlos);
    expect(datos.cuenta).toMatchObject({ email: 'carlos@vital.com' });
    expect(datos.cuenta.password).toBeUndefined();
    expect(JSON.stringify(datos)).not.toMatch(/\$2[aby]\$/); // ningún hash de bcrypt
    expect(datos.salud).toHaveLength(1);
    expect(datos.notasDelMedico.map(n => n.texto)).toEqual(['Visible']);
    for (const [clave] of svc.EXPORTAR) expect(datos).toHaveProperty(clave);
  });
});

describe('borrar mi cuenta', () => {
  test('pide la contraseña y borra la cuenta con todos sus datos', async () => {
    await expect(svc.borrar(ids.carlos, { password: 'mala' })).rejects.toMatchObject({ status: 400 });
    await svc.borrar(ids.carlos, { password: 'futbol123' });
    expect((await query('SELECT id FROM usuarios WHERE id = $1', [ids.carlos])).rows).toHaveLength(0);
    expect((await query('SELECT id FROM salud WHERE user_id = $1', [ids.carlos])).rows).toHaveLength(0);
  });

  test('un administrador no puede borrarse a sí mismo', async () => {
    await expect(svc.borrar(ids.admin, { password: 'admin123' })).rejects.toMatchObject({ status: 403 });
  });
});

describe('mis datos en PDF', () => {
  test('genera un PDF con varias páginas cuando hay muchos datos', async () => {
    const { generarPdf } = require('../servidor/api/usuarios/cuenta.pdf');
    const datos = await svc.exportar(ids.diego);
    datos.comidas = Array.from({ length: 120 }, (_, i) => ({ fecha: '2026-10-01', tipo: 'almuerzo', nombre: `Plato ${i}`, calorias: 600 }));
    const pdf = await generarPdf(datos);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(2);
  });
});

test('el PDF no lleva emojis (la fuente no los tiene)', async () => {
  const { generarPdf } = require('../servidor/api/usuarios/cuenta.pdf');
  const datos = await svc.exportar(ids.diego);
  datos.alertas = [{ fecha: '30/10/2026', tipo: 'lesion', mensaje: '🩹 Tu médico registró una lesión ≈ 2 semanas' }];
  const pdf = await generarPdf(datos);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
});
