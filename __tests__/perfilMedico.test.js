jest.mock('../base-de-datos/db');
const { query } = require('../base-de-datos/db');
const svc = require('../servidor/api/perfilMedico/perfilMedico.service');

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

// ─── obtener ──────���────────────────────────────────────────────────────────────
describe('listarAtletas', () => {
  test('devuelve atletas con el estado de su ficha médica', async () => {
    const atletas = [{ id: 5, nombre: 'Carlos', email: 'carlos@vital.com', completado: true }];
    query.mockResolvedValueOnce({ rows: atletas });
    expect(await svc.listarAtletas()).toEqual(atletas);
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN perfiles_medicos');
  });
});

describe('obtener', () => {
  test('devuelve el perfil existente del usuario', async () => {
    query.mockResolvedValueOnce({ rows: [{
      user_id: 10, condiciones: [], alergias: [],
      preferencias: 'Vegano (sin productos animales)',
      completado: true, plan_alimenticio: null, rutina_semanal: null,
      creado_en: new Date().toISOString()
    }]});
    const resultado = await svc.obtener(10);
    expect(resultado.userId).toBe(10);
    expect(resultado.preferencias).toBe('Vegano (sin productos animales)');
    expect(resultado.completado).toBe(true);
  });

  test('devuelve null cuando el usuario no tiene perfil', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await svc.obtener(99)).toBeNull();
  });

  test('devuelve null cuando no hay filas en la base de datos', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await svc.obtener(1)).toBeNull();
  });
});

// ─── guardar ─────��─────────────────────────────��───────────────────────────────
describe('guardar', () => {
  test('crea un perfil nuevo con datos normalizados', async () => {
    const perfil = await svc.guardar(5, {
      condiciones: [], alergias: [], preferencia: 'Sin restricciones'
    }, 'Delantero');
    expect(perfil.userId).toBe(5);
    expect(perfil.completado).toBe(true);
    expect(perfil.preferencias).toBe('Sin restricciones');
    expect(perfil.planAlimenticio).toBeDefined();
    expect(perfil.rutinaSemanal).toBeDefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  test('normaliza preferencia (singular) a preferencias (plural)', async () => {
    const perfil = await svc.guardar(6, {
      condiciones: [], alergias: [], preferencia: 'Vegano (sin productos animales)'
    }, 'Mediocampista');
    expect(perfil.preferencias).toBe('Vegano (sin productos animales)');
  });

  test('plan vegano no incluye comidas con carne ni pescado', async () => {
    const perfil = await svc.guardar(7, {
      condiciones: [], alergias: [], preferencia: 'Vegano (sin productos animales)'
    }, 'Extremo');

    const comidas = perfil.planAlimenticio.semana.flatMap(dia => [
      dia.desayuno?.nombre, dia.almuerzo?.nombre, dia.cena?.nombre
    ]).filter(Boolean);

    const carnePescado = ['pollo', 'res', 'pavo', 'cerdo', 'salmón', 'tilapia', 'atún', 'tuna', 'pechuga', 'lomo', 'carne', 'chorizo'];
    comidas.forEach(nombre => {
      const lower = nombre.toLowerCase();
      carnePescado.forEach(keyword => expect(lower).not.toContain(keyword));
    });
  });

  test('actualiza un perfil existente sin duplicar', async () => {
    const perfil = await svc.guardar(8, {
      condiciones: ['Diabetes tipo 2'], alergias: [], preferencias: 'Bajo en carbohidratos'
    }, 'Portero');
    expect(perfil.condiciones).toContain('Diabetes tipo 2');
    expect(query).toHaveBeenCalledTimes(1); // ON CONFLICT hace upsert en una sola query
  });

  test('plan filtra alimentos con alérgenos del usuario', async () => {
    const perfil = await svc.guardar(9, {
      condiciones: [], alergias: ['Pescado'], preferencia: 'Sin restricciones'
    }, 'Lateral');

    const comidas = perfil.planAlimenticio.semana.flatMap(dia => [
      dia.desayuno?.nombre, dia.almuerzo?.nombre, dia.cena?.nombre
    ]).filter(Boolean);

    comidas.forEach(nombre => {
      const lower = nombre.toLowerCase();
      expect(lower).not.toContain('salmón');
      expect(lower).not.toContain('tilapia');
      expect(lower).not.toContain('atún');
    });
  });

  test('alto en proteína prioriza opciones proteicas y mantiene los filtros de alergias', async () => {
    const perfil = await svc.guardar(12, {
      condiciones: [], alergias: ['Pescado'], preferencia: 'Alto en proteína'
    }, 'Delantero');

    const comidas = perfil.planAlimenticio.semana.flatMap(dia => [
      dia.desayuno, dia.meriendaMañana, dia.almuerzo, dia.meriendaTarde, dia.cena
    ]);

    expect(perfil.planAlimenticio.semana[0].almuerzo.proteina).toBeGreaterThanOrEqual(40);
    comidas.forEach(comida => {
      expect(comida.nombre.toLowerCase()).not.toMatch(/pescado|salmón|tilapia|atún|tuna/);
    });
  });

  test('dieta mediterránea prioriza comidas acordes sin omitir alergias', async () => {
    const perfil = await svc.guardar(14, {
      condiciones: [], alergias: ['Pescado'], preferencia: 'Dieta mediterránea'
    }, 'Mediocampista');

    const almuerzos = perfil.planAlimenticio.semana.map(dia => dia.almuerzo);
    expect(almuerzos[0].nombre).toContain('Bowl de quinoa');
    almuerzos.forEach(comida => {
      expect(comida.nombre.toLowerCase()).not.toMatch(/pescado|salmón|tilapia|atún|tuna/);
    });
  });

  // Todas las comidas de la semana de un plan
  const comidasDe = perfil => perfil.planAlimenticio.semana.flatMap(dia => [
    dia.desayuno, dia.meriendaMañana, dia.almuerzo, dia.meriendaTarde, dia.cena
  ]);
  const SIN_OPCION = 'Sin opción segura disponible en el catálogo';

  test('con todas las alergias a la vez sigue habiendo un plato seguro en cada comida', async () => {
    const perfil = await svc.guardar(13, {
      condiciones: [], alergias: svc.ALERGIAS, preferencia: 'Sin restricciones'
    }, 'Mediocampista');

    const comidas = comidasDe(perfil);
    expect(comidas.some(comida => comida.nombre === SIN_OPCION)).toBe(false);
    // Carne y pollo no son alérgenos: pueden aparecer. Ningún ingrediente de la lista de alergias, sí.
    const noSonAlergenos = ['carne', 'ave'];
    comidas.forEach(comida => expect(comida.contiene.filter(i => !noSonAlergenos.includes(i))).toEqual([]));
  });

  test('sin huevo ni lácteos la semana queda completa y sin esos ingredientes', async () => {
    const perfil = await svc.guardar(15, {
      condiciones: [], alergias: ['Huevo', 'Lácteos / Lactosa'], preferencia: 'Sin restricciones'
    }, 'Lateral');

    comidasDe(perfil).forEach(comida => {
      expect(comida.nombre).not.toBe(SIN_OPCION);
      expect(comida.contiene).not.toContain('huevo');
      expect(comida.contiene).not.toContain('lacteos');
    });
  });

  test('una persona vegana con alergia a la soya y al gluten tiene todas sus comidas', async () => {
    const perfil = await svc.guardar(16, {
      condiciones: [], alergias: ['Soya / Soja', 'Gluten (trigo, cebada, centeno)'], preferencia: 'Vegano (sin productos animales)'
    }, 'Mediocampista');

    const animales = ['carne', 'ave', 'pescado', 'mariscos', 'huevo', 'lacteos'];
    comidasDe(perfil).forEach(comida => {
      expect(comida.nombre).not.toBe(SIN_OPCION);
      expect(comida.contiene.filter(i => [...animales, 'soya', 'gluten'].includes(i))).toEqual([]);
    });
    expect(perfil.planAlimenticio.notas.join(' ')).toMatch(/B12/);
  });

  test('la intolerancia a la lactosa marcada como condición también quita los lácteos', async () => {
    const perfil = await svc.guardar(17, {
      condiciones: ['Intolerancia a la lactosa'], alergias: [], preferencia: 'Sin restricciones'
    }, 'Portero');
    comidasDe(perfil).forEach(comida => expect(comida.contiene).not.toContain('lacteos'));
  });

  test('pescetariano: pescado sí, carne y pollo no', async () => {
    const perfil = await svc.guardar(18, {
      condiciones: [], alergias: [], preferencia: 'Pescetariano (pescado sí, carne no)'
    }, 'Delantero');
    comidasDe(perfil).forEach(comida => {
      expect(comida.contiene).not.toContain('carne');
      expect(comida.contiene).not.toContain('ave');
    });
  });

  test('rutina semanal tiene 7 días', async () => {
    const perfil = await svc.guardar(11, {
      condiciones: [], alergias: [], preferencia: 'Sin restricciones'
    }, 'Defensa Central');
    expect(perfil.rutinaSemanal.semana.length).toBe(7);
  });
});

// ─── catálogos exportados ─────────────────────────────────────────────────────
describe('catálogos', () => {
  test('CONDICIONES tiene al menos 5 categorías', () => {
    expect(Object.keys(svc.CONDICIONES).length).toBeGreaterThanOrEqual(5);
  });

  test('ALERGIAS es un array no vacío', () => {
    expect(Array.isArray(svc.ALERGIAS)).toBe(true);
    expect(svc.ALERGIAS.length).toBeGreaterThan(0);
  });

  test('PREFERENCIAS incluye opción vegana', () => {
    const vegano = svc.PREFERENCIAS.find(p => p.toLowerCase().includes('vegano'));
    expect(vegano).toBeDefined();
  });
});

// ─── recálculo automático ─────────────────────────────────────────────────────
describe('refrescarPlanes', () => {
  const ficha = { peso: 74, altura: 181, edad: 23, sexo: 'Hombre', deporte: 'Fútbol', posicion: 'Delantero' };
  const datos = { condiciones: [], alergias: [], preferencias: 'Sin restricciones' };

  test('si cambian los datos del atleta, regenera rutina y comidas y las guarda', async () => {
    const viejo = { ...datos, rutinaSemanal: { semana: [] }, planAlimenticio: { semana: [] } };
    const nuevo = await svc.refrescarPlanes(5, viejo, ficha);
    expect(nuevo.rutinaSemanal.posicion).toBe('Delantero');
    expect(nuevo.planAlimenticio.base.peso).toBe(74);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE perfiles_medicos'), expect.any(Array));
  });

  test('si nada cambió no escribe en la base (aunque el orden de las claves sea otro)', async () => {
    const actual = await svc.refrescarPlanes(5, { ...datos, rutinaSemanal: null, planAlimenticio: null }, ficha);
    query.mockClear();
    // Simula lo que devuelve JSONB: mismas claves en otro orden
    const reordenar = v => Array.isArray(v) ? v.map(reordenar)
      : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).reverse().map(k => [k, reordenar(v[k])]))
      : v;
    const guardado = { ...datos, rutinaSemanal: reordenar(actual.rutinaSemanal), planAlimenticio: reordenar(actual.planAlimenticio) };
    await svc.refrescarPlanes(5, guardado, ficha);
    expect(query).not.toHaveBeenCalled();
  });

  test('sin perfil o sin ficha no hace nada', async () => {
    expect(await svc.refrescarPlanes(5, null, ficha)).toBeNull();
    expect(await svc.refrescarPlanes(5, datos, null)).toBe(datos);
    expect(query).not.toHaveBeenCalled();
  });
});
