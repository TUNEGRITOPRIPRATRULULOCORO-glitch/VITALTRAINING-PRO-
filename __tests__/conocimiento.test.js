// Lo que Vita sabe sin Claude: técnica de cada deporte y cómo usar la app (y lo que NO debe robarse).
const { respuestaTecnica, respuestaAyudaApp, respuestaBasica, deporteMencionado } = require('../servidor/api/ia/conocimiento');

describe('técnica por deporte', () => {
  test('la pregunta del receptor de béisbol', () => {
    // Tal cual la escribió el usuario: "lanar" mal escrito y su deporte en la app es otro
    const r = respuestaTecnica('como puedo lanar mas duro la pelota si soy receptor', 'Fútbol');
    expect(r).toMatch(/Para un receptor/);
    expect(respuestaTecnica('soy receptor, ¿cómo le tiro más fuerte?', 'Fútbol')).toMatch(/Para un receptor/);
    const bien = respuestaTecnica('como puedo lanzar mas duro la pelota si soy receptor', 'Béisbol');
    expect(bien).toMatch(/receptor/);
    expect(bien).toMatch(/pop time/);
  });

  test('el deporte de la pregunta manda sobre el del atleta', () => {
    expect(deporteMencionado('¿cómo lanzo más duro en béisbol?')).toBe('Béisbol');
    expect(respuestaTecnica('¿cómo lanzo más duro en béisbol?', 'Fútbol')).toMatch(/lanzar más duro/);
    expect(respuestaTecnica('soy catcher, ¿cómo tiro más rápido a segunda?', 'Fútbol')).toMatch(/receptor/);
  });

  test('sin decir el deporte, usa el del atleta', () => {
    expect(respuestaTecnica('¿cómo pego más fuerte?', 'Boxeo')).toMatch(/potencia del golpe/);
    expect(respuestaTecnica('¿cómo salto más?', 'Baloncesto')).toMatch(/saltar más/);
    expect(respuestaTecnica('¿cómo pateo más fuerte?', 'Fútbol')).toMatch(/patear/);
    expect(respuestaTecnica('quiero nadar más rápido', 'Natación')).toMatch(/crol/);
  });

  test('si nombra un deporte pero no algo que conozca, dice qué puede preguntar', () => {
    expect(respuestaTecnica('¿cómo mejoro en béisbol?', 'Fútbol')).toMatch(/lanzo más duro siendo receptor/);
  });

  test('no se roba preguntas de salud, carga o comidas', () => {
    for (const [texto, deporte] of [
      ['estoy cansado, ¿puedo entrenar fuerte hoy?', 'Fútbol'],
      ['¿cómo mejoro mi sueño?', 'Running'],
      ['¿qué como antes del partido?', 'Fútbol'],
      ['me duele la espalda', 'Natación'],
      ['¿me puedo saltar una comida?', 'Baloncesto'],
      ['¿cuántas calorías necesito?', 'Boxeo'],
    ]) expect(respuestaTecnica(texto, deporte)).toBeNull();
  });
});

describe('lo básico para el atleta', () => {
  test('responde lo importante y lo urgente', () => {
    expect(respuestaBasica('¿cómo caliento antes de jugar?')).toMatch(/movilidad dinámica/);
    expect(respuestaBasica('me dio un calambre')).toMatch(/estira suave/);
    expect(respuestaBasica('¿cuánta agua debo tomar?')).toMatch(/35 ml por kg/);
    expect(respuestaBasica('¿qué como antes de entrenar?')).toMatch(/2-3 h antes/);
    expect(respuestaBasica('qué como después de entrenar')).toMatch(/proteína/);
    expect(respuestaBasica('me golpeé la cabeza en el partido')).toMatch(/urgencias/);
    expect(respuestaBasica('me torcí el tobillo')).toMatch(/médico/);
    expect(respuestaBasica('¿puedo tomar creatina?')).toMatch(/nutricionista/);
  });
  test('no responde lo que no conoce', () => {
    expect(respuestaBasica('¿puedo entrenar hoy?')).toBeNull();
    expect(respuestaBasica('¿cómo voy esta semana?')).toBeNull();
  });
});

describe('ayuda de la app', () => {
  test('responde cómo usar cada parte', () => {
    expect(respuestaAyudaApp('¿cómo escaneo un producto?')).toMatch(/Escanear código de barras/);
    expect(respuestaAyudaApp('¿cómo conecto mi reloj?')).toMatch(/Mi reloj/);
    expect(respuestaAyudaApp('¿dónde pongo el código de mi equipo?')).toMatch(/código de 6 letras/);
    expect(respuestaAyudaApp('quiero cambiar mi contraseña')).toMatch(/Mi cuenta/);
    expect(respuestaAyudaApp('¿cómo cambio el día de partido?')).toMatch(/Mi Plan/);
    expect(respuestaAyudaApp('no me aparece mi alergia, ¿dónde la pongo?')).toMatch(/Actualizar perfil/);
    expect(respuestaAyudaApp('¿cómo activo las notificaciones?')).toMatch(/Notificaciones/);
    expect(respuestaAyudaApp('¿qué puedes hacer?')).toMatch(/técnica/);
  });

  test('lo que no sabía: tickets, foto, modo oscuro, borrar, privacidad, qué significa cada cosa', () => {
    expect(respuestaAyudaApp('como abro un ticket')).toMatch(/Nuevo ticket/);
    expect(respuestaAyudaApp('la app no funciona')).toMatch(/Soporte técnico/);
    expect(respuestaAyudaApp('como cambio mi foto de perfil')).toMatch(/Cambiar foto/);
    expect(respuestaAyudaApp('quiero el modo oscuro')).toMatch(/luna/);
    expect(respuestaAyudaApp('¿cómo borro una comida?')).toMatch(/✕/);
    expect(respuestaAyudaApp('¿quién ve mis datos?')).toMatch(/profesionales de tu equipo/);
    expect(respuestaAyudaApp('¿qué es la carga?')).toMatch(/minutos × esfuerzo/);
    expect(respuestaAyudaApp('¿qué es el RPE?')).toMatch(/1 \(muy suave/);
    expect(respuestaAyudaApp('perdí mi racha')).toMatch(/días seguidos/);
  });

  test('no se roba lo que responde el análisis del atleta', () => {
    for (const texto of ['estoy con mucha fatiga', '¿cómo voy esta semana?', '¿puedo entrenar hoy?', '¿cómo bajo mi peso?', 'la clave para correr más'])
      expect(respuestaAyudaApp(texto)).toBeNull();
  });
});
