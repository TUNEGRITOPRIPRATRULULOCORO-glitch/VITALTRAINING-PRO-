const { generarRutina, RUTINAS, EJERCICIOS } = require('../servidor/api/perfilMedico/rutinas');

const SIN_CONDICIONES = { condiciones: [] };
const nombres = rutina => rutina.semana.flatMap(d => d.ejercicios.map(e => e.nombre));

describe('catálogo de rutinas', () => {
  const todas = Object.entries(RUTINAS).flatMap(([deporte, posiciones]) =>
    Object.keys(posiciones).map(posicion => [deporte, posicion]));

  test('cada grupo usado en las semanas existe en el catálogo de ejercicios', () => {
    for (const [deporte, posicion] of todas) {
      for (const sesion of RUTINAS[deporte][posicion].semana)
        for (const grupo of sesion.grupos)
          expect({ deporte, posicion, grupo, existe: grupo in EJERCICIOS }).toMatchObject({ existe: true });
    }
  });

  test.each(todas)('%s · %s: semana de lunes a domingo con domingo de descanso', (deporte, posicion) => {
    const r = generarRutina(SIN_CONDICIONES, posicion, deporte);
    expect(r.semana.map(d => d.dia)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
    expect(r.semana[6]).toMatchObject({ descanso: true, ejercicios: [] });
    expect(r.semana.slice(0, 6).every(d => d.ejercicios.length > 0)).toBe(true);
    expect(r.notas[0]).toMatch(/^🎯 /);
  });
});

describe('rutinas por deporte y posición', () => {
  test('el fútbol incluye la prevención con más evidencia (Nórdico y Copenhague)', () => {
    for (const posicion of Object.keys(RUTINAS['Fútbol'])) {
      const ej = nombres(generarRutina(SIN_CONDICIONES, posicion, 'Fútbol'));
      expect(ej).toEqual(expect.arrayContaining(['Nórdico de isquiotibiales', 'Copenhague de aductores']));
    }
  });

  test('el portero entrena estiradas y saltos; el lateral, sprints repetidos', () => {
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Portero', 'Fútbol'))).toContain('Estiradas laterales sobre colchoneta');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Lateral', 'Fútbol'))).toContain('Sprints repetidos 6 × 30 m');
  });

  test('el baloncesto siempre trabaja tobillo y aterrizaje', () => {
    for (const posicion of Object.keys(RUTINAS['Baloncesto'])) {
      const ej = nombres(generarRutina(SIN_CONDICIONES, posicion, 'Baloncesto'));
      expect(ej).toContain('Equilibrio a una pierna sobre cojín');
    }
  });

  test('el pívot hace juego interior y el base manejo de balón', () => {
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Pívot', 'Baloncesto'))).toContain('Juego de pies en el poste bajo');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Base', 'Baloncesto'))).toContain('Dribbling con ambas manos en zigzag');
  });

  test('el tenis siempre trabaja el hombro; dobles prioriza la red', () => {
    for (const posicion of Object.keys(RUTINAS['Tenis'])) {
      expect(nombres(generarRutina(SIN_CONDICIONES, posicion, 'Tenis'))).toContain('Rotación externa de hombro con banda');
    }
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Dobles', 'Tenis'))).toContain('Voleas rápidas en la red');
  });

  test('ya no da a un jugador de baloncesto la rutina de mediocampista de fútbol', () => {
    const r = generarRutina(SIN_CONDICIONES, 'Base', 'Baloncesto');
    expect(r).toMatchObject({ deporte: 'Baloncesto', posicion: 'Base' });
    expect(nombres(r)).not.toContain('Rondo 4 contra 2');
  });

  test('posición desconocida usa la de referencia de su deporte; deporte desconocido usa fútbol', () => {
    expect(generarRutina(SIN_CONDICIONES, null, 'Tenis').posicion).toBe('Individuales');
    expect(generarRutina(SIN_CONDICIONES, 'Lo que sea', 'Baloncesto').posicion).toBe('Alero');
    expect(generarRutina(SIN_CONDICIONES, 'Delantero', 'Curling').deporte).toBe('Fútbol');
  });
});

describe('adaptación a condiciones médicas', () => {
  test('quita los ejercicios contraindicados', () => {
    const conPubalgia = nombres(generarRutina({ condiciones: ['Pubalgia deportiva'] }, 'Delantero', 'Fútbol'));
    expect(conPubalgia).not.toContain('Copenhague de aductores');
    expect(conPubalgia).not.toContain('Remate de primera');

    const conRodilla = nombres(generarRutina({ condiciones: ['Condromalacia rotuliana (rodilla del corredor)'] }, 'Pívot', 'Baloncesto'));
    expect(conRodilla).not.toContain('Saltos repetidos al aro (tip drill)');
  });

  test('añade notas de seguridad según la condición', () => {
    const r = generarRutina({ condiciones: ['Asma inducida por ejercicio', 'Epicondilitis (codo de tenista)'] }, 'Individuales', 'Tenis');
    expect(r.notas.join(' ')).toMatch(/inhalador/);
    expect(r.notas.join(' ')).toMatch(/Codo de tenista/);
    expect(r.descripcion).toMatch(/adaptada a condiciones/);
  });

  test('respeta las series propias de cada ejercicio', () => {
    const nordico = generarRutina(SIN_CONDICIONES, 'Lateral', 'Fútbol').semana
      .flatMap(d => d.ejercicios).find(e => e.nombre === 'Nórdico de isquiotibiales');
    expect(nordico).toMatchObject({ series: 3, repeticiones: 6 });
  });
});
