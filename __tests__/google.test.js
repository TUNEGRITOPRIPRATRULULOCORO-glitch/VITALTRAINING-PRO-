// Entrar con Google (integración con pg-mem). La verificación de la credencial con Google se simula.
jest.mock('../servidor/api/auth/google', () => ({ verificar: jest.fn(), clientId: jest.fn(() => 'cliente-de-prueba') }));
const google = require('../servidor/api/auth/google');
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const auth = require('../servidor/api/auth/auth.service');

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
}, 30000);

beforeEach(() => google.verificar.mockReset());

test('una credencial que Google no valida no entra', async () => {
  google.verificar.mockResolvedValue(null);
  expect(await auth.loginGoogle('falsa')).toMatchObject({ status: 401 });
});

test('si el correo ya tiene cuenta, inicia sesión con esa cuenta', async () => {
  google.verificar.mockResolvedValue({ email: 'carlos@vital.com', nombre: 'Carlos' });
  const r = await auth.loginGoogle('credencial');
  expect(r.token).toBeTruthy();
  expect(r.usuario).toMatchObject({ email: 'carlos@vital.com' });
  expect(r.usuario.password).toBeUndefined();
});

test('una cuenta inactiva no entra con Google', async () => {
  await query("UPDATE usuarios SET estado = 'Inactivo' WHERE email = 'pedro@vital.com'");
  google.verificar.mockResolvedValue({ email: 'pedro@vital.com', nombre: 'Pedro' });
  expect(await auth.loginGoogle('credencial')).toMatchObject({ status: 403 });
});

test('un correo nuevo pide completar el registro y luego entra sin contraseña', async () => {
  google.verificar.mockResolvedValue({ email: 'nueva@gmail.com', nombre: 'Ana Nueva' });
  expect(await auth.loginGoogle('credencial')).toEqual({ nuevo: true, nombre: 'Ana Nueva', email: 'nueva@gmail.com' });

  const r = await auth.registro({
    nombre: 'Ana Nueva', email: 'otro@correo.com', googleCredencial: 'credencial',
    deporte: 'Natación', posicion: 'Fondista', frecuencia: '4-5 veces por semana', pie: 'Ambos', objetivo: 'Mantener forma física',
    fechaNacimiento: '2004-03-15', sexo: 'Mujer',
  });
  expect(r.token).toBeTruthy();
  // El correo es el que verificó Google, no el que venga en el formulario
  expect(r.usuario).toMatchObject({ email: 'nueva@gmail.com', deporte_principal: 'Natación' });

  const otra = await auth.loginGoogle('credencial');
  expect(otra.usuario.email).toBe('nueva@gmail.com');
});

test('el registro con Google falla si la credencial no es válida', async () => {
  google.verificar.mockResolvedValue(null);
  const r = await auth.registro({ nombre: 'X Y', googleCredencial: 'mala', deporte: 'Boxeo' });
  expect(r).toMatchObject({ status: 401 });
});
