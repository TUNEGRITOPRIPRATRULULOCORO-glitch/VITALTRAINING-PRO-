jest.mock('../data/db');
const { query } = require('../data/db');
const svc = require('../api/perfilMedico/perfilMedico.service');

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

// ─── obtener ──────���────────────────────────────────────────────────────────────
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