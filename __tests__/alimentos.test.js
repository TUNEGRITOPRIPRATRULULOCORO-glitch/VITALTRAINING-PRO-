// Escáner de código de barras: reglas puras + búsqueda con pg-mem (Open Food Facts se sustituye por uno falso).
const calc = require('../servidor/api/alimentos/alimentos.calculos');

const COCA = {
  product_name: 'Coca-Cola', brands: 'Coca-Cola, The Coca-Cola Company', serving_quantity: 330,
  nutriments: { 'energy-kcal_100g': 42.4, proteins_100g: 0, carbohydrates_100g: 10.6, fat_100g: 0 },
};

describe('reglas del escáner', () => {
  test('valida el dígito de control', () => {
    expect(calc.codigoValido('5449000000996')).toBe(true);   // EAN-13
    expect(calc.codigoValido('5449000000997')).toBe(false);  // un dígito mal escrito
    expect(calc.codigoValido('96385074')).toBe(true);        // EAN-8
    expect(calc.codigoValido('036000291452')).toBe(true);    // UPC-A
    expect(calc.codigoValido('12345')).toBe(false);
    expect(calc.codigoValido('abc')).toBe(false);
  });

  test('pasa un producto de Open Food Facts a nuestro formato', () => {
    expect(calc.desdeOpenFoodFacts('5449000000996', COCA)).toEqual({
      codigo: '5449000000996', nombre: 'Coca-Cola', marca: 'Coca-Cola',
      kcal100: 42.4, proteina100: 0, carbohidratos100: 10.6, grasa100: 0, porcionG: 330,
    });
    // Sin kcal: se calculan desde los kJ; el nombre en español tiene prioridad
    const avena = calc.desdeOpenFoodFacts('1', { product_name: 'Oats', product_name_es: 'Avena', nutriments: { energy_100g: 1590 } });
    expect(avena).toMatchObject({ nombre: 'Avena', kcal100: 380, proteina100: null, porcionG: null });
    expect(calc.desdeOpenFoodFacts('1', { product_name: 'Sin datos', nutriments: {} })).toBeNull();
    expect(calc.desdeOpenFoodFacts('1', null)).toBeNull();
  });

  test('calcula la porción', () => {
    const p = calc.desdeOpenFoodFacts('5449000000996', COCA);
    expect(calc.porcion(p, 330)).toEqual({ gramos: 330, calorias: 140, proteina: 0, carbohidratos: 35, grasa: 0 });
    expect(calc.porcion({ kcal100: 380, proteina100: null }, 40)).toMatchObject({ calorias: 152, proteina: null });
  });

  test('valida lo escrito a mano desde la etiqueta', () => {
    expect(calc.validarManual({ nombre: 'Arepa', kcal100: '210', proteina100: '5.5' }))
      .toMatchObject({ nombre: 'Arepa', kcal100: 210, proteina100: 5.5, grasa100: null });
    expect(() => calc.validarManual({ nombre: 'Arepa' })).toThrow(/calorías/);
    expect(() => calc.validarManual({ nombre: 'Arepa', kcal100: 2000 })).toThrow(/entre 0 y 900/);
    expect(() => calc.validarManual({ kcal100: 100 })).toThrow(/nombre/);
  });
});

describe('búsqueda de productos', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const svc = require('../servidor/api/alimentos/alimentos.service');
  let consultas = [];
  let respuesta = COCA;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await setupDatabase();
    svc._usarConsulta(async codigo => {
      consultas.push(codigo);
      if (respuesta instanceof Error) throw respuesta;
      return respuesta;
    });
  }, 30000);
  afterAll(() => { console.log.mockRestore(); console.error.mockRestore(); });
  beforeEach(() => { consultas = []; respuesta = COCA; });

  test('consulta Open Food Facts una vez y luego responde desde nuestra base', async () => {
    const r = await svc.buscar('5449000000996');
    expect(r).toMatchObject({ encontrado: true, producto: { nombre: 'Coca-Cola', kcal100: 42.4, fuente: 'openfoodfacts' } });
    const otra = await svc.buscar('5449000000996');
    expect(otra.producto).toMatchObject({ nombre: 'Coca-Cola', kcal100: 42.4, porcionG: 330 });
    expect(consultas).toEqual(['5449000000996']);
  });

  test('pasado un mes se vuelve a consultar; si Open Food Facts falla, usa lo guardado', async () => {
    await query("UPDATE alimentos_codigos SET actualizado = '2020-01-01' WHERE codigo = '5449000000996'");
    respuesta = new Error('sin internet');
    const r = await svc.buscar('5449000000996');
    expect(r.producto.nombre).toBe('Coca-Cola');
    expect(consultas).toHaveLength(1);
  });

  test('código no válido, producto inexistente y servicio caído', async () => {
    await expect(svc.buscar('5449000000997')).rejects.toMatchObject({ status: 400 });
    respuesta = null;
    expect(await svc.buscar('7702001041022')).toEqual({ encontrado: false, codigo: '7702001041022' });
    respuesta = new Error('timeout');
    await expect(svc.buscar('96385074')).rejects.toMatchObject({ status: 503 });
  });

  test('el club escribe un producto: queda para todos y solo lo corrige su autor o la nutricionista', async () => {
    const atleta = { id: 1001, rol: 'Atleta' }, otro = { id: 1002, rol: 'Atleta' }, nutri = { id: 1003, rol: 'Nutricionista' };
    respuesta = null;
    const p = await svc.guardarManual('7702001041022', { nombre: 'Avena en hojuelas', marca: 'Quaker', kcal100: 380, proteina100: 13 }, atleta);
    expect(p).toMatchObject({ codigo: '7702001041022', fuente: 'club', kcal100: 380 });
    expect((await svc.buscar('7702001041022')).producto).toMatchObject({ nombre: 'Avena en hojuelas', fuente: 'club' });
    expect(consultas).toHaveLength(0); // lo del club no caduca

    await expect(svc.guardarManual('7702001041022', { nombre: 'Otra cosa', kcal100: 1 }, otro)).rejects.toMatchObject({ status: 409 });
    await svc.guardarManual('7702001041022', { nombre: 'Avena en hojuelas', kcal100: 375 }, atleta);
    await svc.guardarManual('7702001041022', { nombre: 'Avena Quaker', kcal100: 372 }, nutri);
    expect((await svc.buscar('7702001041022')).producto).toMatchObject({ nombre: 'Avena Quaker', kcal100: 372 });
    await expect(svc.guardarManual('5449000000996', { nombre: 'Coca', kcal100: 1 }, otro)).rejects.toMatchObject({ status: 409 });
  });
});
