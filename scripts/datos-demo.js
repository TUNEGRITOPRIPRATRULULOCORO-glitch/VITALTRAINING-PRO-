/**
 * Carga datos de ejemplo en la base local para ver la app con contenido:
 * fichas deportivas, planes, 4 semanas de sesiones, salud, mensajes y un ticket.
 *
 *   npm run demo                 (en local)
 *   DATOS_DEMO=true al arrancar  (en el hosting, donde no hay consola)
 *
 * Solo carga datos si la base aún no tiene sesiones registradas (no duplica datos).
 * Para empezar de cero: borra base-de-datos/datos-locales/ y vuelve a ejecutarlo.
 */
require('dotenv').config();
const { query } = require('../base-de-datos/db');
const { setupDatabase } = require('../base-de-datos/setup');
const perfilMedico = require('../servidor/api/perfilMedico/perfilMedico.service');

const dia = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const haceMinutos = min => new Date(Date.now() - min * 60000).toISOString();
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ATLETAS = [
  // Carlos sube mucho la carga la última semana (para ver el aviso de riesgo)
  { email: 'carlos@vital.com', deporte: 'Fútbol', posicion: 'Delantero', peso: 74, altura: 181, nacimiento: '2003-03-14', lado: 'Derecho', sexo: 'Hombre', objetivo: 'Mejorar rendimiento deportivo', cargaAlta: true, salud: [6, 7, 5] },
  { email: 'diego@vital.com', deporte: 'Baloncesto', posicion: 'Base', peso: 80, altura: 188, nacimiento: '2001-08-02', lado: 'Izquierda', sexo: null, objetivo: 'Ganar masa muscular', cargaAlta: false, salud: [3, 8, 8] },
];

async function cargarDatosDemo() {
  const { rows: [{ total }] } = await query('SELECT COUNT(*) AS total FROM cumplimiento');
  if (Number(total) > 0) {
    console.log('ℹ️  La base ya tiene sesiones registradas: no se cargan datos de ejemplo.');
    return;
  }

  const { rows: usuarios } = await query('SELECT id, email FROM usuarios');
  const id = email => Number(usuarios.find(u => u.email === email)?.id);
  const faltan = ['admin', 'maria', 'medico', 'carlos', 'diego'].filter(n => !id(`${n}@vital.com`));
  if (faltan.length) {
    console.log(`ℹ️  No se cargan datos de ejemplo: faltan las cuentas de prueba (${faltan.join(', ')}).`);
    return;
  }

  for (const a of ATLETAS) {
    const userId = id(a.email);
    await query(
      'UPDATE usuarios SET deporte_principal = $1, posicion = $2, peso = $3, altura = $4, fecha_nacimiento = $5, pie = $6, objetivo = $7 WHERE id = $8',
      [a.deporte, a.posicion, a.peso, a.altura, a.nacimiento, a.lado, a.objetivo, userId]
    );
    // Diego queda sin sexo para que se vea el aviso de "faltan datos" en su plan de comidas
    if (a.sexo) await query('INSERT INTO perfiles (user_id, sexo) VALUES ($1, $2)', [userId, a.sexo]);
    const perfil = await perfilMedico.guardar(userId, { condiciones: [], alergias: [], preferencia: 'Sin restricciones' }, a.posicion, a.deporte);
    await query('UPDATE perfiles_medicos SET creado_en = $1 WHERE user_id = $2', [dia(27) + 'T10:00:00Z', userId]);

    // Sesiones del plan en las últimas 4 semanas (alguna a medias y alguna saltada)
    const diasEntreno = perfil.rutinaSemanal.semana.filter(d => d.ejercicios.length).map(d => d.dia);
    for (let n = 27; n >= 1; n--) {
      const nombre = DIAS[new Date(dia(n) + 'T00:00:00Z').getUTCDay()];
      if (!diasEntreno.includes(nombre) || n % 9 === 0) continue;
      const ultimaSemana = n <= 7;
      await query(
        'INSERT INTO cumplimiento (user_id, fecha, dia_semana, tipo, estado, rpe, duracion_minutos) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, dia(n), nombre, 'Plan', n % 5 === 0 ? 'parcial' : 'completo',
         a.cargaAlta && ultimaSemana ? 9 : 5, a.cargaAlta && ultimaSemana ? 100 : 60]
      );
    }
    const [fatiga, sueno, recuperacion] = a.salud;
    for (let n = 5; n >= 0; n--)
      await query('INSERT INTO salud (user_id, fecha, fatiga, sueno, recuperacion) VALUES ($1, $2, $3, $4, $5)',
        [userId, dia(n), fatiga, sueno, recuperacion]);
  }

  const [admin, maria, medico, carlos] = ['admin', 'maria', 'medico', 'carlos'].map(n => id(`${n}@vital.com`));
  const charla = [
    [carlos, maria, 'Hola María, ¿puedo cambiar la cena de hoy por pescado?', 300, true],
    [maria, carlos, '¡Claro Carlos! Pescado a la plancha con arroz integral está perfecto.', 280, true],
    [carlos, maria, 'Genial, gracias. Otra cosa: esta semana me siento muy cansado.', 30, false],
    [medico, carlos, 'Carlos, vi que tu carga subió mucho esta semana. Mañana haz solo recuperación activa.', 90, true],
    [medico, maria, 'María, Carlos tiene riesgo alto de carga. ¿Puedes subirle los carbohidratos esta semana?', 45, false],
    [medico, admin, 'El expediente de Diego no muestra el historial de salud completo.', 20, false],
    [maria, admin, 'No puedo ver las alertas de un paciente desde el panel.', 60, false],
  ];
  for (const [de, para, texto, min, leido] of charla)
    await query('INSERT INTO mensajes (remitente_id, destinatario_id, texto, leido, created_at) VALUES ($1, $2, $3, $4, $5)',
      [de, para, texto, leido, haceMinutos(min)]);

  await query(
    `INSERT INTO incidencias (user_id, titulo, usuario, categoria, prioridad, estado, fecha, descripcion, comentarios)
     VALUES ($1, 'La app no guarda mi foto de perfil', 'Carlos Ruiz', 'Error de app', 'media', 'abierta', $2, '', '[]')`,
    [carlos, new Date().toLocaleDateString('es-CO')]
  );

  console.log('✅ Datos de ejemplo cargados.');
}

module.exports = { cargarDatosDemo };

// Ejecutado directamente con "npm run demo"
if (require.main === module) {
  setupDatabase()
    .then(cargarDatosDemo)
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
