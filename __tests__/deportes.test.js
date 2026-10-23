// Deportes nuevos y día de partido: unitarios + integración con pg-mem (perfil y planes).
const { DEPORTES } = require('../servidor/compartido/deportes');
const { generarRutina, RUTINAS } = require('../servidor/api/perfilMedico/rutinas');
const nutricion = require('../servidor/api/perfilMedico/nutricion');

const SIN_CONDICIONES = { condiciones: [] };
const nombres = rutina => rutina.semana.flatMap(d => d.ejercicios.map(e => e.nombre));

describe('deportes de la app', () => {
  test('cada deporte tiene rutinas (y ninguno sobra)', () => {
    expect(Object.keys(RUTINAS).sort()).toEqual([...DEPORTES].sort());
  });

  test('un deporte nuevo usa su propia rutina, no la de fútbol', () => {
    for (const deporte of ['Béisbol', 'Atletismo', 'Running', 'Natación', 'Boxeo', 'Estar en forma']) {
      const r = generarRutina(SIN_CONDICIONES, null, deporte);
      expect(r.deporte).toBe(deporte);
      expect(nombres(r)).not.toContain('Rondo 4 contra 2');
    }
  });

  test('cada deporte trabaja lo que más necesita', () => {
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Lanzador', 'Béisbol'))).toContain('Rotación externa de hombro con banda');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Velocidad', 'Atletismo'))).toContain('Nórdico de isquiotibiales');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Maratón', 'Running'))).toContain('Tirada larga a ritmo suave');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Fondista', 'Natación'))).toContain('Rotación externa de hombro con banda');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Competición', 'Boxeo'))).toContain('Sombra (shadow boxing)');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Recreativo', 'Boxeo'))).not.toContain('Sparring técnico controlado');
  });

  test('gimnasio: ganar músculo entrena cada grupo 2 veces por semana y no tiene partido', () => {
    const r = generarRutina(SIN_CONDICIONES, 'Ganar músculo', 'Gimnasio', 'Sábado');
    expect(r.diaPartido).toBeNull();
    const dias = grupo => r.semana.filter(d => d.ejercicios.some(e => e.nombre === grupo)).length;
    expect(dias('Press de banca con mancuernas')).toBe(2);
    expect(dias('Prensa de piernas')).toBe(2);
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Fuerza', 'Gimnasio'))).toContain('Peso muerto 3 × 5');
    expect(nombres(generarRutina(SIN_CONDICIONES, 'Definir', 'Gimnasio'))).toContain('Cinta inclinada caminando rápido');
  });

  test('"Estar en forma" no tiene partido y el principiante empieza con bajo impacto', () => {
    const r = generarRutina(SIN_CONDICIONES, 'Principiante', 'Estar en forma', 'Jueves');
    expect(r.diaPartido).toBeNull();
    expect(r.descripcion).toMatch(/estar en forma · nivel principiante/);
    expect(r.semana.flatMap(d => d.ejercicios).every(e => e.impacto !== 'alto')).toBe(true);
  });

  test('las condiciones médicas también filtran los deportes nuevos', () => {
    const conRodilla = nombres(generarRutina({ condiciones: ['Condromalacia rotuliana (rodilla del corredor)'] }, 'Saltos', 'Atletismo'));
    expect(conRodilla).not.toContain('Multisaltos horizontales (bounding)');
  });
});

describe('día de partido', () => {
  const tipo = (r, dia) => r.semana.find(d => d.dia === dia).tipo;

  test('por defecto se compite el sábado y el domingo se descansa', () => {
    const r = generarRutina(SIN_CONDICIONES, 'Delantero', 'Fútbol');
    expect(r.diaPartido).toBe('Sábado');
    expect(tipo(r, 'Domingo')).toBe('Descanso completo');
  });

  test('la semana se mueve al día elegido: víspera suave y descanso al día siguiente', () => {
    const sabado = generarRutina(SIN_CONDICIONES, 'Delantero', 'Fútbol');
    const miercoles = generarRutina(SIN_CONDICIONES, 'Delantero', 'Fútbol', 'Miércoles');
    expect(miercoles.diaPartido).toBe('Miércoles');
    expect(tipo(miercoles, 'Miércoles')).toBe(tipo(sabado, 'Sábado'));
    expect(tipo(miercoles, 'Martes')).toBe(tipo(sabado, 'Viernes'));
    expect(tipo(miercoles, 'Jueves')).toBe('Descanso completo');
    expect(miercoles.semana.map(d => d.dia)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
  });

  test('da consejos de víspera, sueño y recuperación con los días correctos', () => {
    const notas = generarRutina(SIN_CONDICIONES, 'Base', 'Baloncesto', 'Domingo').notas.join(' ');
    expect(notas).toMatch(/Compites el domingo/);
    expect(notas).toMatch(/El sábado entrena suave/);
    expect(notas).toMatch(/Duerme 8-9 h/);
    expect(notas).toMatch(/El lunes es para recuperar/);
  });

  test('"Ninguno" quita el partido y deja una sesión normal', () => {
    const r = generarRutina(SIN_CONDICIONES, 'Delantero', 'Fútbol', 'Ninguno');
    expect(r.diaPartido).toBeNull();
    expect(r.semana.some(d => /partido/i.test(d.tipo))).toBe(false);
    expect(r.notas.join(' ')).not.toMatch(/Compites/);
  });

  test('el plan de comidas pone la recarga la víspera y el día fuerte el día del partido', () => {
    const tipos = nutricion.tiposDeDia(generarRutina(SIN_CONDICIONES, 'Delantero', 'Fútbol', 'Miércoles'));
    expect(tipos[1]).toBe('precompetencia'); // martes
    expect(tipos[2]).toBe('partido');        // miércoles
    expect(tipos[3]).toBe('descanso');       // jueves
  });
});

describe('día de partido guardado en el perfil (integración)', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const perfil = require('../servidor/api/panel/perfil.service');
  const perfilMedico = require('../servidor/api/perfilMedico/perfilMedico.service');
  let carlos;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    const { rows } = await query("SELECT id FROM usuarios WHERE email = 'carlos@vital.com'");
    carlos = Number(rows[0].id);
  }, 30000);

  test('se guarda, se lee y solo acepta días válidos', async () => {
    await perfil.actualizarPerfil(carlos, { diaPartido: 'Jueves' });
    expect((await perfil.obtenerPerfil(carlos)).diaPartido).toBe('Jueves');
    await perfil.actualizarPerfil(carlos, { diaPartido: 'Juernes' });
    expect((await perfil.obtenerPerfil(carlos)).diaPartido).toBe('Jueves');
  });

  test('no acepta deportes que no existen', async () => {
    await perfil.actualizarPerfil(carlos, { deportePrincipal: 'Curling' });
    const { rows } = await query('SELECT deporte_principal FROM usuarios WHERE id = $1', [carlos]);
    expect(rows[0].deporte_principal).not.toBe('Curling');
  });

  test('la rutina y las comidas guardadas se reorganizan con el día de partido', async () => {
    await perfil.actualizarPerfil(carlos, { diaPartido: 'Jueves' });
    const ficha = await perfilMedico.obtenerFicha(carlos);
    expect(ficha.diaPartido).toBe('Jueves');
    const guardado = await perfilMedico.guardar(carlos, { condiciones: [], alergias: [] }, ficha.posicion, ficha.deporte, ficha);
    expect(guardado.rutinaSemanal.diaPartido).toBe('Jueves');
    expect(guardado.planAlimenticio.semana.find(d => d.dia === 'Miércoles').tipoDia).toBe('precompetencia');

    await perfil.actualizarPerfil(carlos, { diaPartido: 'Domingo' });
    const refrescado = await perfilMedico.refrescarPlanes(carlos, await perfilMedico.obtener(carlos), await perfilMedico.obtenerFicha(carlos));
    expect(refrescado.rutinaSemanal.diaPartido).toBe('Domingo');
  });
});
