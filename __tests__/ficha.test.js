const { fichaDeportiva, edadDesde } = require('../servidor/api/panel/ficha');

describe('fichaDeportiva', () => {
  const registro = {
    deporte_principal: 'Baloncesto', posicion: 'Base', peso: '63', altura: '172',
    fecha_nacimiento: '2003-05-10', pie: 'Derecha', frecuencia: '4-5 veces por semana'
  };

  test('sin Mi Perfil usa los datos del registro', () => {
    expect(fichaDeportiva(registro, null)).toMatchObject({
      deporte: 'Baloncesto', posicion: 'Base', peso: 63, altura: 172, lateralidad: 'Derecha'
    });
  });

  test('lo guardado en Mi Perfil gana sobre el registro', () => {
    const f = fichaDeportiva(registro, { posicion: 'Escolta', peso: 65, altura: null, edad: 24 });
    expect(f).toMatchObject({ posicion: 'Escolta', peso: 65, altura: 172, edad: 24 });
  });

  test('0 o vacío cuentan como "sin dato" (el formulario guarda 0 si el campo queda vacío)', () => {
    const f = fichaDeportiva({ peso: 0, altura: '' }, { peso: 0, edad: 0 });
    expect(f).toMatchObject({ peso: null, altura: null, edad: null, posicion: null });
  });

  test('sin deporte usa Fútbol', () => {
    expect(fichaDeportiva({}).deporte).toBe('Fútbol');
  });
});

describe('edadDesde', () => {
  const hoy = new Date('2026-10-22T12:00:00Z');
  test('calcula años cumplidos', () => {
    expect(edadDesde('2003-05-10', hoy)).toBe(23);
    expect(edadDesde('2003-10-22', hoy)).toBe(23); // cumple hoy
    expect(edadDesde('2003-10-23', hoy)).toBe(22); // cumple mañana
  });
  test('sin fecha o fecha inválida devuelve null', () => {
    expect(edadDesde(null, hoy)).toBeNull();
    expect(edadDesde('no-es-fecha', hoy)).toBeNull();
  });
});
