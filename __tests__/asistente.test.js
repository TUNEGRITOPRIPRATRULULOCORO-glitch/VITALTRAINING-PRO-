// Asistente de chat: integración con pg-mem. Claude se simula (no se gasta dinero en los tests).
const mockCrear = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error { constructor(status, mensaje) { super(mensaje); this.status = status; } }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  function Anthropic() { return { beta: { messages: { create: (...args) => mockCrear(...args) } } }; }
  return Object.assign(Anthropic, { APIError, AuthenticationError, RateLimitError });
});
const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const asistente = require('../servidor/api/ia/asistente');

const CLAVE_ORIGINAL = process.env.ANTHROPIC_API_KEY;
let carlos;
const textoClaude = texto => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: texto }] });

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await setupDatabase();
  const { rows } = await query("SELECT id FROM usuarios WHERE email = 'carlos@vital.com'");
  carlos = Number(rows[0].id);
}, 30000);

beforeEach(async () => {
  mockCrear.mockReset();
  delete process.env.ANTHROPIC_API_KEY;
  await asistente.borrarConversacion(carlos);
});
afterAll(() => {
  if (CLAVE_ORIGINAL === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = CLAVE_ORIGINAL;
});

describe('modo básico (sin clave de Claude)', () => {
  test('saluda y entiende de qué se le habla', async () => {
    const hola = await asistente.conversar(carlos, 'Hola!');
    expect(hola).toMatchObject({ modo: 'basico', respuesta: expect.stringMatching(/Vita/) });

    expect(asistente.detectarTema('¿Puedo entrenar hoy?')).toBe('entrenar_hoy');
    expect(asistente.detectarTema('dormí fatal anoche')).toBe('sueno');
    expect(asistente.detectarTema('qué como antes del partido')).toBe('partido');
    expect(asistente.detectarTema('quiero una rutina de gimnasio')).toBe('entrenamiento_personalizado');

    const r = await asistente.conversar(carlos, '¿Puedo entrenar hoy?');
    expect(r.modo).toBe('basico');
    expect(r.respuesta.length).toBeGreaterThan(20);
    expect(mockCrear).not.toHaveBeenCalled();
  });

  test('guarda la conversación en orden', async () => {
    await asistente.conversar(carlos, 'hola');
    await asistente.conversar(carlos, 'cuántas calorías llevo');
    const h = await asistente.historial(carlos);
    expect(h.map(m => m.rol)).toEqual(['atleta', 'asistente', 'atleta', 'asistente']);
    expect(h[2].texto).toBe('cuántas calorías llevo');
  });

  test('un mensaje vacío no se guarda', async () => {
    expect(await asistente.conversar(carlos, '   ')).toMatchObject({ status: 400 });
    expect(await asistente.historial(carlos)).toHaveLength(0);
  });
});

describe('con Claude', () => {
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'clave-de-prueba'; });

  test('envía la conversación y los datos del atleta, y devuelve su respuesta', async () => {
    mockCrear.mockResolvedValue(textoClaude('¡Hola Carlos! Hoy te toca entrenar suave. 💪'));
    const r = await asistente.conversar(carlos, '¿Qué hago hoy?');
    expect(r).toEqual({ modo: 'claude', respuesta: '¡Hola Carlos! Hoy te toca entrenar suave. 💪' });

    const peticion = mockCrear.mock.calls[0][0];
    expect(peticion.model).toBe('claude-opus-5-5');
    expect(peticion.fallbacks).toBe('default');
    expect(peticion.system[0].text).toMatch(/Eres Vita/);
    expect(peticion.system[1].text).toMatch(/Carlos/);
    expect(peticion.system[1].text).toMatch(/Fútbol/);
    expect(peticion.messages).toEqual([{ role: 'user', content: '¿Qué hago hoy?' }]);
  });

  test('la conversación enviada siempre empieza con un mensaje del atleta', async () => {
    await query("INSERT INTO ia_mensajes (user_id, rol, texto) VALUES ($1, 'asistente', 'mensaje viejo')", [carlos]);
    mockCrear.mockResolvedValue(textoClaude('Claro.'));
    await asistente.conversar(carlos, 'y mañana?');
    expect(mockCrear.mock.calls[0][0].messages[0]).toEqual({ role: 'user', content: 'y mañana?' });
  });

  test('si Claude falla, responde el modo básico', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCrear.mockRejectedValue(new Anthropic.RateLimitError(429, 'demasiadas'));
    const r = await asistente.conversar(carlos, '¿Puedo entrenar hoy?');
    expect(r.modo).toBe('basico');
    expect(r.respuesta.length).toBeGreaterThan(20);
    console.error.mockRestore();
  });

  test('si Claude rechaza la pregunta, contesta con amabilidad', async () => {
    mockCrear.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    const r = await asistente.conversar(carlos, 'algo raro');
    expect(r).toMatchObject({ modo: 'claude', respuesta: expect.stringMatching(/médico/) });
  });
});

test('empezar de nuevo borra la conversación', async () => {
  await asistente.conversar(carlos, 'hola');
  await asistente.borrarConversacion(carlos);
  expect(await asistente.historial(carlos)).toEqual([]);
});
