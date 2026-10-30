/**
 * Módulo AVISOS — decide a quién avisar por correo y con qué plantilla.
 * Tablas propias: ninguna (lee contactos del módulo usuarios).
 *
 * Todas las funciones son "disparar y olvidar": nunca lanzan errores, para que
 * un correo fallido no rompa el registro, la salud o el entrenamiento que lo provocó.
 */
const correo     = require('../../../servicios/correo');
const plantillas = require('../../../servicios/correo/plantillas');
const usuarios   = require('../usuarios');
const equipos    = require('../equipos');

const ROLES_MEDICOS = ['Medico', 'Médico'];

/** Médicos que llevan a ese atleta (con equipos creados, solo los de su equipo). */
async function medicosDe(atletaId) {
  const medicos = await usuarios.contactosPorRol(ROLES_MEDICOS);
  const conAcceso = await Promise.all(medicos.map(m => equipos.puedeVerAtleta({ id: m.id, rol: 'Medico' }, atletaId)));
  return medicos.filter((_, i) => conAcceso[i]);
}

async function enviar(destinatario, plantilla) {
  if (!destinatario?.email) return;
  await correo.enviarCorreo({ para: destinatario.email, nombre: destinatario.nombre, ...plantilla });
}

async function bienvenida(usuario) {
  try {
    await enviar(usuario, plantillas.bienvenida({ nombre: usuario.nombre, url: correo.urlApp() }));
  } catch (err) {
    console.error('Aviso de bienvenida:', err.message);
  }
}

async function restablecerPassword(usuario, token, minutos) {
  try {
    const url = `${correo.urlApp()}/?restablecer=${token}`;
    await enviar(usuario, plantillas.restablecer({ nombre: usuario.nombre, url, minutos }));
  } catch (err) {
    console.error('Aviso de contraseña:', err.message);
  }
}

/** A los médicos, cuando un atleta registra valores de salud preocupantes. */
async function alertaSalud(userId, problemas) {
  try {
    if (!problemas.length) return;
    const atleta = await usuarios.contacto(userId);
    if (!atleta) return;
    const medicos = await medicosDe(userId);
    const plantilla = plantillas.alertaSalud({ atleta: atleta.nombre, problemas, url: correo.urlApp() });
    await Promise.all(medicos.map(m => enviar(m, plantilla)));
  } catch (err) {
    console.error('Aviso de salud:', err.message);
  }
}

/** Al atleta y a los médicos, cuando la carga de entrenamiento entra en riesgo alto. */
async function alertaCarga(userId, carga) {
  try {
    const atleta = await usuarios.contacto(userId);
    if (!atleta) return;
    const url = correo.urlApp();
    const medicos = await medicosDe(userId);
    await Promise.all([
      enviar(atleta, plantillas.alertaCarga({ nombre: atleta.nombre, cambioPorcentaje: carga.cambioPorcentaje, paraAtleta: true, url })),
      ...medicos.map(m => enviar(m, plantillas.alertaCarga({ nombre: atleta.nombre, cambioPorcentaje: carga.cambioPorcentaje, paraAtleta: false, url }))),
    ]);
  } catch (err) {
    console.error('Aviso de carga:', err.message);
  }
}

module.exports = { bienvenida, restablecerPassword, alertaSalud, alertaCarga };
