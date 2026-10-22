// Validación: unitaria. Guardado: integración con la base pg-mem real.
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const svc = require('../servidor/api/usuarios/fotos.service');

const dataUrl = (mime, bytes) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 7)]);
const PNG  = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(100)]);

describe('validarFoto', () => {
  test.each([['image/jpeg', JPEG], ['image/png', PNG], ['image/webp', WEBP]])('acepta %s real', (mime, bytes) => {
    expect(svc.validarFoto(dataUrl(mime, bytes))).toMatchObject({ mime });
  });

  test('rechaza formatos no permitidos', () => {
    expect(() => svc.validarFoto(dataUrl('image/gif', Buffer.from('GIF89a')))).toThrow(/Formato no permitido/);
    expect(() => svc.validarFoto(dataUrl('image/svg+xml', Buffer.from('<svg/>')))).toThrow();
  });

  test('rechaza un archivo que dice ser imagen pero no lo es', () => {
    expect(() => svc.validarFoto(dataUrl('image/png', Buffer.from('<script>alert(1)</script>')))).toThrow(/no es una imagen/);
    expect(() => svc.validarFoto(dataUrl('image/jpeg', PNG))).toThrow(/no es una imagen/);
  });

  test('rechaza fotos de más de 300 KB con status 413', () => {
    const grande = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(svc.REGLAS.maxBytes)]);
    expect(() => svc.validarFoto(dataUrl('image/jpeg', grande))).toThrow(expect.objectContaining({ status: 413 }));
  });

  test('rechaza texto que no es un data URL', () => {
    expect(() => svc.validarFoto('hola')).toThrow();
    expect(() => svc.validarFoto(undefined)).toThrow();
    expect(() => svc.validarFoto('data:image/jpeg;base64,@@@')).toThrow();
  });
});

describe('guardar, obtener y borrar', () => {
  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
  }, 30000);
  afterAll(() => console.log.mockRestore());

  test('sin foto devuelve null', async () => {
    expect(await svc.obtener(1)).toBeNull();
    expect(await svc.obtener('abc')).toBeNull();
  });

  test('guarda, reemplaza y borra la foto de un usuario', async () => {
    await svc.guardar(1, dataUrl('image/png', PNG));
    await svc.guardar(1, dataUrl('image/jpeg', JPEG)); // reemplaza, no duplica
    const foto = await svc.obtener(1);
    expect(foto.mime).toBe('image/jpeg');
    expect(foto.bytes.equals(JPEG)).toBe(true);
    const { rows } = await query('SELECT COUNT(*) AS n FROM fotos_perfil WHERE user_id = 1');
    expect(Number(rows[0].n)).toBe(1);

    await svc.borrar(1);
    expect(await svc.obtener(1)).toBeNull();
  });
});
