/**
 * Mi cuenta: cambiar la contraseña, descargar mis datos y borrar mi cuenta.
 * Descargar y borrar cumplen el derecho de acceso y supresión de los datos personales
 * (en Colombia, Ley 1581 de 2012), importante aquí porque hay datos de salud.
 */
const bcrypt = require('bcrypt');
const { query } = require('../../../base-de-datos/db');
const { olvidarCuenta } = require('../../compartido/middleware/auth');

const MIN_PASSWORD = 8;

function error(mensaje, status) {
  return Object.assign(new Error(mensaje), { status });
}

const PISTA_GOOGLE = 'Si entraste con Google y nunca creaste una contraseña, créala con "¿Olvidaste tu contraseña?" en la pantalla de entrada.';

async function comprobarPassword(userId, password) {
  const { rows } = await query('SELECT id, rol, password FROM usuarios WHERE id = $1', [Number(userId)]);
  const usuario = rows[0];
  if (!usuario) throw error('Usuario no encontrado.', 404);
  if (!password || !(await bcrypt.compare(String(password), usuario.password)))
    throw error(`La contraseña actual no es correcta. ${PISTA_GOOGLE}`, 400);
  return usuario;
}

async function cambiarPassword(userId, { actual, nueva } = {}) {
  await comprobarPassword(userId, actual);
  if (!nueva || String(nueva).length < MIN_PASSWORD) throw error(`La contraseña nueva debe tener al menos ${MIN_PASSWORD} caracteres.`, 400);
  if (String(nueva) === String(actual)) throw error('La contraseña nueva tiene que ser distinta de la actual.', 400);
  await query('UPDATE usuarios SET password = $1 WHERE id = $2', [await bcrypt.hash(String(nueva), 10), Number(userId)]);
  return true;
}

// Lo que se exporta de cada tabla (nunca contraseñas, tokens ni las notas clínicas privadas del médico)
const EXPORTAR = [
  ['perfil',               'SELECT nombre, edad, peso, altura, posicion, sexo, dia_partido FROM perfiles WHERE user_id = $1'],
  ['perfilMedico',         'SELECT condiciones, alergias, preferencias, plan_alimenticio, rutina_semanal, creado_en FROM perfiles_medicos WHERE user_id = $1'],
  ['salud',                'SELECT fecha, fatiga, sueno, recuperacion, notas FROM salud WHERE user_id = $1 ORDER BY fecha'],
  ['comidas',              'SELECT fecha, hora, nombre, tipo, calorias, proteina, notas, registrado_por FROM comidas WHERE user_id = $1 ORDER BY fecha, id'],
  ['entrenamientos',       'SELECT fecha, nombre, tipo, duracion_minutos, intensidad, rpe, descripcion, registrado_por FROM rutinas WHERE user_id = $1 ORDER BY fecha, id'],
  ['sesionesDelPlan',      'SELECT fecha, dia_semana, tipo, estado, rpe, duracion_minutos, notas FROM cumplimiento WHERE user_id = $1 ORDER BY fecha'],
  ['series',               'SELECT fecha, ejercicio, peso, repeticiones FROM series WHERE user_id = $1 ORDER BY fecha, id'],
  ['testsFisicos',         'SELECT fecha, prueba, valor, notas, registrado_por FROM evaluaciones WHERE user_id = $1 ORDER BY fecha, id'],
  ['rangos',               'SELECT clave, paso, fecha FROM rangos WHERE user_id = $1'],
  ['lesiones',             'SELECT zona, tipo, gravedad, restriccion, fecha_inicio, alta_estimada, fecha_alta, indicaciones, registrado_por FROM lesiones WHERE user_id = $1 ORDER BY fecha_inicio'],
  ['notasDelMedico',       'SELECT texto, autor_nombre, created_at FROM notas_clinicas WHERE user_id = $1 AND visible_atleta = true ORDER BY created_at'],
  ['notasDelNutricionista','SELECT texto, nutricionista_nombre, fecha FROM notas_nutricionista WHERE user_id = $1 ORDER BY created_at'],
  ['alertas',              'SELECT fecha, tipo, mensaje, leida FROM alertas WHERE user_id = $1 ORDER BY created_at'],
  ['equipos',              'SELECT e.nombre, e.deporte FROM equipo_miembros m JOIN equipos e ON e.id = m.equipo_id WHERE m.user_id = $1'],
  ['mensajes',             'SELECT m.created_at, de.nombre AS de, para.nombre AS para, m.texto FROM mensajes m JOIN usuarios de ON de.id = m.remitente_id JOIN usuarios para ON para.id = m.destinatario_id WHERE m.remitente_id = $1 OR m.destinatario_id = $1 ORDER BY m.created_at'],
  ['logros',               'SELECT clave, fecha FROM logros WHERE user_id = $1 ORDER BY fecha'],
  ['conversacionConVita',  'SELECT rol, texto, created_at FROM ia_mensajes WHERE user_id = $1 ORDER BY id'],
  ['tickets',              'SELECT titulo, categoria, prioridad, estado, descripcion, comentarios, fecha FROM incidencias WHERE user_id = $1 ORDER BY created_at'],
];

/** Todos mis datos en un solo objeto (para descargarlos como archivo JSON). */
async function exportar(userId) {
  const id = Number(userId);
  const { rows: [cuenta] } = await query(
    'SELECT id, nombre, email, rol, estado, deporte_principal, peso, altura, fecha_nacimiento, posicion, objetivo, fecha_registro FROM usuarios WHERE id = $1',
    [id]
  );
  if (!cuenta) throw error('Usuario no encontrado.', 404);
  const datos = { generado: new Date().toISOString(), app: 'VitalTraining', cuenta };
  const resultados = await Promise.all(EXPORTAR.map(([, sql]) => query(sql, [id]).then(r => r.rows)));
  EXPORTAR.forEach(([clave], i) => { datos[clave] = clave === 'perfil' || clave === 'perfilMedico' ? resultados[i][0] || null : resultados[i]; });
  return datos;
}

/**
 * Borra la cuenta y, en cascada, todos sus datos. Pide la contraseña.
 * Un administrador no puede borrarse a sí mismo (lo hace otro administrador desde Usuarios).
 */
async function borrar(userId, { password } = {}) {
  const usuario = await comprobarPassword(userId, password);
  if (usuario.rol === 'Administrador')
    throw error('Un administrador no puede borrar su propia cuenta: pídeselo a otro administrador desde Usuarios.', 403);
  await query('DELETE FROM usuarios WHERE id = $1', [Number(userId)]);
  olvidarCuenta(Number(userId)); // su sesión deja de valer al instante
  return true;
}

module.exports = { cambiarPassword, exportar, borrar, EXPORTAR };
