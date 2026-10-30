// El clasificador en Node.js debe dar lo mismo que el modelo de scikit-learn que lo entrenó
const { clasificar, informacion, preprocesar, ngramas } = require('../servidor/api/ia/clasificador');
const muestras = require('../ml/resultados/muestras_prediccion.json');

describe('igual que scikit-learn', () => {
  test.each(muestras.map(m => [m.texto, m]))('"%s"', (texto, esperado) => {
    const r = clasificar(texto);
    expect(r.intencion).toBe(esperado.intencion);
    expect(r.confianza).toBeCloseTo(esperado.confianza, 4);
  });
});

describe('preprocesado', () => {
  test('minúsculas y sin tildes, como strip_accents="unicode"', () => {
    expect(preprocesar('DORMÍ Fatal, Mañana ¿SÁBADO?')).toBe('dormi fatal, manana ¿sabado?');
  });

  test('trozos de letras por palabra con un espacio a cada lado', () => {
    expect(ngramas('hoy', 2, 3)).toEqual([' h', 'ho', 'oy', 'y ', ' ho', 'hoy', 'oy ']);
    expect(ngramas('a', 2, 4)).toEqual([' a', 'a ', ' a ']); // palabra corta: el trozo de 4 no existe
  });
});

describe('uso', () => {
  test('entiende frases con errores o sin tildes', () => {
    expect(clasificar('dormi pesimo anoche').intencion).toBe('sueno');
    expect(clasificar('PUEDO ENTRENAR HOY').intencion).toBe('entrenar_hoy');
  });

  test('devuelve un ranking de probabilidades que suma 1', () => {
    const r = clasificar('qué como antes del partido');
    expect(r.ranking).toHaveLength(informacion().clases.length);
    expect(r.ranking.reduce((s, x) => s + x.probabilidad, 0)).toBeCloseTo(1, 6);
    expect(r.ranking[0].probabilidad).toBeGreaterThanOrEqual(r.ranking[1].probabilidad);
  });

  test('marca como no segura una frase sin sentido', () => {
    expect(clasificar('asdfgh qwerty').segura).toBe(false);
  });

  test('publica sus métricas', () => {
    const info = informacion();
    expect(info.metricas.precision_prueba).toBeGreaterThan(0.7);
    expect(info.umbral).toBeGreaterThan(0);
  });
});
