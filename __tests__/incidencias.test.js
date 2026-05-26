jest.mock('../data/db');
const { query } = require('../data/db');
const incSvc  = require('../api/incidencias/incidencias.service');
const nutrSvc = require('../api/nutricionista/nutricionista.service');

const HOY = new Date().toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

// ─── incidencias.listar ───────────────────────────────────────────────────────
describe('incidencias — listar', () => {
  const rows = [
    { id: 1, user_id: 1, estado: 'abierta',  prioridad: 'alta',  comentarios: [] },
    { id: 2, user_id: 1, estado: 'cerrada',  prioridad: 'media', comentarios: [] },
    { id: 3, user_id: 2, estado: 'abierta',  prioridad: 'baja',  comentarios: [] }
  ];

  test('retorna todas las incidencias sin filtros', async () => {
    query.mockResolvedValueOnce({ rows });
    expect(await incSvc.listar()).toHaveLength(3);
  });

  test('filtra por userId', async () => {
    query.mockResolvedValueOnce({ rows: rows.filter(r => r.user_id === 1) });
    expect(await incSvc.listar({ userId: 1 })).toHaveLength(2);
  });

  test('filtra por estado', async () => {
    query.mockResolvedValueOnce({ rows: rows.filter(r => r.estado === 'cerrada') });
    expect(await incSvc.listar({ estado: 'cerrada' })).toHaveLength(1);
  });

  test('filtra por prioridad', async () => {
    query.mockResolvedValueOnce({ rows: rows.filter(r => r.prioridad === 'alta') });
    expect(await incSvc.listar({ prioridad: 'alta' })).toHaveLength(1);
  });
});

// ─── incidencias.crear ────────────────────────────────────────────────────────
describe('incidencias — crear', () => {
  test('crea una incidencia con estado abierta', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, titulo: 'No carga el panel', estado: 'abierta', categoria: 'Técnico', prioridad: 'alta', comentarios: [] }] });
    const user = { id: 1, nombre: 'Carlos' };
    const res  = await incSvc.crear({ titulo: 'No carga el panel', categoria: 'Técnico', prioridad: 'alta' }, user);
    expect(res.titulo).toBe('No carga el panel');
    expect(res.estado).toBe('abierta');
    expect(res.userId).toBe(1);
    expect(res.comentarios).toEqual([]);
  });

  test('usa valores por defecto si faltan campos', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, titulo: 'Bug', estado: 'abierta', categoria: 'Soporte', prioridad: 'media', descripcion: '', comentarios: [] }] });
    const res = await incSvc.crear({ titulo: 'Bug' }, { id: 2, nombre: 'Maria' });
    expect(res.categoria).toBe('Soporte');
    expect(res.prioridad).toBe('media');
    expect(res.descripcion).toBe('');
  });
});

// ─── incidencias.actualizarEstado ─────────────────────────────────────────────
describe('incidencias — actualizarEstado', () => {
  test('cambia el estado de la incidencia', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1, estado: 'cerrada', comentarios: [] }] });
    const res = await incSvc.actualizarEstado(10, 'cerrada');
    expect(res.estado).toBe('cerrada');
  });

  test('retorna null si la incidencia no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await incSvc.actualizarEstado(999, 'cerrada')).toBeNull();
  });
});

// ─── incidencias.agregarComentario ────────────────────────────────────────────
describe('incidencias — agregarComentario', () => {
  test('agrega comentario a la incidencia', async () => {
    query.mockResolvedValueOnce({ rows: [{ comentarios: [] }] }); // SELECT comentarios
    query.mockResolvedValueOnce({ rows: [] });                    // UPDATE
    const res = await incSvc.agregarComentario(5, 'Revisado', { nombre: 'Admin' });
    expect(res.texto).toBe('Revisado');
    expect(res.autor).toBe('Admin');
  });

  test('usa "Admin" por defecto si user no tiene nombre', async () => {
    query.mockResolvedValueOnce({ rows: [{ comentarios: [] }] });
    query.mockResolvedValueOnce({ rows: [] });
    const res = await incSvc.agregarComentario(6, 'Ok', null);
    expect(res.autor).toBe('Admin');
  });

  test('retorna null si la incidencia no existe', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // SELECT returns empty
    expect(await incSvc.agregarComentario(999, 'Hola', {})).toBeNull();
  });
});

// ─── nutricionista ────────────────────────────────────────────────────────────
describe('nutricionista — listarFutbolistas', () => {
  test('retorna solo futbolistas activos con datos agregados', async () => {
    query.mockResolvedValueOnce({ rows: [
      { id: 1, nombre: 'Carlos', rol: 'Futbolista', estado: 'Activo', email: 'carlos@vital.com', totalComidas: 2, totalRutinas: 1, ultimaSalud: null }
    ]});
    const res = await nutrSvc.listarFutbolistas();
    expect(res).toHaveLength(1);
    expect(res[0].nombre).toBe('Carlos');
    expect(res[0].password).toBeUndefined();
    expect(res[0].totalComidas).toBe(2);
    expect(res[0].totalRutinas).toBe(1);
  });
});

describe('nutricionista — detalleFutbolista', () => {
  test('retorna null si el usuario no es futbolista', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Admin', rol: 'Administrador', password: 'h' }] });
    expect(await nutrSvc.detalleFutbolista(1)).toBeNull();
  });

  test('retorna el detalle completo del futbolista', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 5, nombre: 'Diego', rol: 'Futbolista', password: 'h', estado: 'Activo' }] }); // usuario
    query.mockResolvedValueOnce({ rows: [] });  // perfiles
    query.mockResolvedValueOnce({ rows: [] });  // salud
    query.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 5, nombre: 'Arepa', createdAt: HOY }] }); // comidas
    query.mockResolvedValueOnce({ rows: [] });  // rutinas
    query.mockResolvedValueOnce({ rows: [] });  // alertas
    query.mockResolvedValueOnce({ rows: [] });  // notas
    const res = await nutrSvc.detalleFutbolista(5);
    expect(res.nombre).toBe('Diego');
    expect(res.password).toBeUndefined();
    expect(res.comidas).toHaveLength(1);
  });
});

describe('nutricionista — agregarNota', () => {
  test('agrega nota al futbolista', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 5, nutricionistaId: 2, nutricionistaNombre: 'Maria', texto: 'Buena evolución', fecha: '23/05/2026' }] });
    const res = await nutrSvc.agregarNota(5, { id: 2, nombre: 'Maria' }, 'Buena evolución');
    expect(res.texto).toBe('Buena evolución');
    expect(res.userId).toBe(5);
    expect(res.nutricionistaId).toBe(2);
  });
});

describe('nutricionista — registrarComida', () => {
  test('registra comida para el futbolista', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 5, nombre: 'Ensalada', tipo: 'Almuerzo', calorias: 300 }] });
    const res = await nutrSvc.registrarComida(5, { nombre: 'Admin' }, { nombre: 'Ensalada', tipo: 'Almuerzo', calorias: 300 });
    expect(res.nombre).toBe('Ensalada');
    expect(res.userId).toBe(5);
  });
});

describe('nutricionista — registrarRutina', () => {
  test('registra rutina para el futbolista', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, userId: 5, nombre: 'Cardio', tipo: 'cardio', duracionMinutos: 45 }] });
    const res = await nutrSvc.registrarRutina(5, { nombre: 'Admin' }, { nombre: 'Cardio', tipo: 'cardio', duracionMinutos: 45 });
    expect(res.nombre).toBe('Cardio');
    expect(res.duracionMinutos).toBe(45);
    expect(res.userId).toBe(5);
  });
});