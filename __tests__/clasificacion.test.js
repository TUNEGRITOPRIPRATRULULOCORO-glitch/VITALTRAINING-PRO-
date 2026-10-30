// Clasificación: cálculos unitarios y servicio integrado con la base pg-mem real.
const calc = require('../servidor/api/clasificacion/clasificacion.calculos');

describe('puntos de constancia', () => {
  test('salud, sesiones y comidas suman sus puntos', () => {
    const r = calc.puntosConstancia([1, 2], {
      salud: [{ user_id: 1, fecha: 'a' }, { user_id: 1, fecha: 'b' }],
      cumplimiento: [{ user_id: 1, fecha: 'a', estado: 'completo' }, { user_id: 2, fecha: 'a', estado: 'parcial' }],
      rutinas: [{ user_id: 2, fecha: 'b' }],
      comidas: [{ user_id: 1, fecha: 'a' }, { user_id: 1, fecha: 'a' }],
    });
    expect(r['1']).toEqual({ puntos: 20 + 30 + 10, salud: 2, sesiones: 1, comidas: 2 });
    expect(r['2']).toEqual({ puntos: 15 + 15, salud: 0, sesiones: 2, comidas: 0 });
  });

  test('no se suman puntos apuntando de más', () => {
    const r = calc.puntosConstancia([1], {
      salud: [{ user_id: 1, fecha: 'a' }, { user_id: 1, fecha: 'a' }],                        // un registro por día
      cumplimiento: [{ user_id: 1, fecha: 'a', estado: 'parcial' }, { user_id: 1, fecha: 'a', estado: 'completo' }],
      rutinas: [{ user_id: 1, fecha: 'a' }],                                                   // una sesión por día
      comidas: Array.from({ length: 9 }, () => ({ user_id: 1, fecha: 'a' })),                  // máximo 4 comidas
    });
    expect(r['1']).toEqual({ puntos: 10 + 30 + 20, salud: 1, sesiones: 1, comidas: 4 });
  });

  test('ordenar: los empates comparten puesto', () => {
    const lista = calc.ordenar([{ nombre: 'A', puntos: 5 }, { nombre: 'B', puntos: 9 }, { nombre: 'C', puntos: 5 }, { nombre: 'D', puntos: 1 }]);
    expect(lista.map(f => `${f.posicion}${f.nombre}`)).toEqual(['1B', '2A', '2C', '4D']);
  });

  test('fuera del equipo solo nombre e inicial', () => {
    expect(calc.nombreCorto('Diego Torres Pérez')).toBe('Diego T.');
    expect(calc.nombreCorto('Ana')).toBe('Ana');
  });
});

describe('servicio (integración)', () => {
  const { query } = require('../base-de-datos/db');
  const { setupDatabase } = require('../base-de-datos/setup');
  const svc = require('../servidor/api/clasificacion/clasificacion.service');
  const equipos = require('../servidor/api/equipos/equipos.service');
  const { hoyISO } = require('../servidor/compartido/fechas');
  const ids = {};
  const yo = nombre => ({ id: ids[nombre], rol: 'Atleta' });

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await setupDatabase();
    // Tres futbolistas: Carlos, Diego (lo pasamos a fútbol) y Ana
    await query("UPDATE usuarios SET deporte_principal = 'Fútbol' WHERE email = 'diego@vital.com'");
    await query("INSERT INTO usuarios (nombre, email, password, rol, deporte_principal) VALUES ('Ana Gómez', 'ana@vital.com', 'x', 'Atleta', 'Fútbol')");
    const { rows } = await query('SELECT id, email FROM usuarios');
    for (const u of rows) ids[u.email.split('@')[0]] = Number(u.id);
    const hoy = hoyISO();
    await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1, $2, 3, 8, 8)', [ids.ana, hoy]);
    await query("INSERT INTO cumplimiento (user_id, fecha, dia_semana, estado) VALUES ($1, $2, 'Lunes', 'completo')", [ids.ana, hoy]);
    await query("INSERT INTO comidas (user_id, nombre, tipo, fecha) VALUES ($1, 'Avena', 'desayuno', $2)", [ids.carlos, hoy]);
    // Tests: Carlos hombre salta 40 cm, Ana mujer 34 cm (más mérito para su escala)
    await query("INSERT INTO perfiles (user_id, sexo, peso) VALUES ($1, 'Hombre', 80), ($2, 'Mujer', 60)", [ids.carlos, ids.ana]);
    await query("INSERT INTO evaluaciones (user_id, prueba, valor, fecha) VALUES ($1, 'cmj', 40, $3), ($2, 'cmj', 34, $3)", [ids.carlos, ids.ana, hoy]);
  }, 30000);

  afterAll(() => console.log.mockRestore());

  test('constancia de la semana en todo el deporte, con nombres cortos fuera del equipo', async () => {
    const r = await svc.constancia(yo('carlos'), { ambito: 'deporte' });
    expect(r).toMatchObject({ ambito: 'deporte', titulo: 'Todo Fútbol', periodo: 'semana' });
    expect(r.filas.map(f => [f.posicion, f.nombre, f.puntos])).toEqual([[1, 'Ana G.', 40], [2, 'Carlos Ruiz', 5], [3, 'Diego T.', 0]]);
    expect(r.yo).toMatchObject({ esYo: true, posicion: 2 });
  });

  test('marcas: el salto se ordena por la escala de su sexo, no por centímetros', async () => {
    const r = await svc.marcas(yo('carlos'), { ambito: 'deporte', clave: 'test:cmj' });
    expect(r.filas.map(f => f.nombre)).toEqual(['Ana G.', 'Carlos Ruiz']);
    expect(r.filas[0].rango.etiqueta).toMatch(/Esmeralda|Rubí/);
    expect(r.filas[1]).toMatchObject({ marca: '40 cm', rango: { etiqueta: 'Platino I' } });
    await expect(svc.marcas(yo('carlos'), { clave: 'test:nado50' })).rejects.toMatchObject({ status: 400 });
  });

  test('fuerza: máximo estimado relativo al peso', async () => {
    await query("INSERT INTO series (user_id, ejercicio, fecha, peso, repeticiones) VALUES ($1, 'Peso muerto 3 × 5', $2, 120, 5)", [ids.carlos, hoyISO()]);
    const r = await svc.marcas(yo('ana'), { ambito: 'deporte', clave: 'fuerza:pesoMuerto' });
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0].marca).toMatch(/120 kg × 5 · 1,75 × su peso/);
  });

  test('con equipo compite con su equipo, y quien elige no aparecer no sale', async () => {
    const e = await equipos.crear({ nombre: 'Sub-20' });
    await equipos.agregarMiembro(e.id, ids.carlos);
    await equipos.agregarMiembro(e.id, ids.ana);
    let r = await svc.constancia(yo('carlos'), { ambito: 'equipo' });
    expect(r).toMatchObject({ ambito: 'equipo', titulo: 'Sub-20' });
    expect(r.filas.map(f => f.nombre)).toEqual(['Ana Gómez', 'Carlos Ruiz']); // en su equipo, nombre completo

    await svc.cambiarVisible(ids.ana, false);
    r = await svc.constancia(yo('carlos'), { ambito: 'equipo' });
    expect(r.filas.map(f => f.nombre)).toEqual(['Carlos Ruiz']);
    expect((await svc.constancia(yo('ana'), { ambito: 'equipo' })).filas.some(f => f.esYo)).toBe(true); // ella sí se ve
    expect((await svc.opciones(yo('ana'))).visible).toBe(false);
  });

  test('sin equipo, "equipo" cae a todo el deporte', async () => {
    expect((await svc.constancia(yo('diego'), { ambito: 'equipo' })).ambito).toBe('deporte');
  });
});

describe('marcas justas', () => {
  const { query } = require('../base-de-datos/db');
  const svc = require('../servidor/api/clasificacion/clasificacion.service');

  test('sin sexo indicado no se compite en marcas, y se avisa', async () => {
    const { rows } = await query("SELECT id FROM usuarios WHERE email = 'diego@vital.com'");
    const diego = Number(rows[0].id);
    await query("INSERT INTO evaluaciones (user_id, prueba, valor, fecha) VALUES ($1, 'cmj', 60, '2026-10-01')", [diego]);
    const r = await svc.marcas({ id: diego, rol: 'Atleta' }, { ambito: 'deporte', clave: 'test:cmj' });
    expect(r.filas.some(f => f.esYo)).toBe(false);
    expect(r.faltaDato).toMatch(/sexo/);
  });
});
