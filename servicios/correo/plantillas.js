/**
 * Plantillas de los correos. Cada función devuelve { asunto, html, texto }.
 * El HTML usa estilos en línea porque muchos clientes de correo ignoran las hojas de estilo.
 */

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function base({ titulo, parrafos, boton, pie }) {
  const cuerpo = parrafos.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">${p}</p>`).join('');
  const accion = boton
    ? `<p style="margin:24px 0"><a href="${escapar(boton.url)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escapar(boton.texto)}</a></p>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f0fdf4;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dcfce7">
      <tr><td style="background:linear-gradient(135deg,#16a34a,#0891b2);background-color:#16a34a;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700">VitalTraining</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a">${titulo}</h1>
        ${cuerpo}${accion}
        ${pie ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#64748b">${pie}</p>` : ''}
      </td></tr>
    </table>
    <p style="font-size:11px;color:#94a3b8;margin:14px 0 0">Recibes este correo por tu cuenta en VitalTraining.</p>
  </td></tr></table></body></html>`;
}

function bienvenida({ nombre, url }) {
  const n = escapar(nombre.split(' ')[0]);
  return {
    asunto: '¡Bienvenido a VitalTraining! 🏅',
    html: base({
      titulo: `¡Hola, ${n}!`,
      parrafos: [
        'Tu cuenta ya está lista. Para empezar:',
        '1. Completa tu <strong>perfil médico</strong> para generar tu rutina y tu plan de comidas.<br>2. Registra cada día cómo te sientes en <strong>Mi Salud</strong>.<br>3. Haz tus primeros <strong>tests físicos</strong> para tener una marca de referencia.',
      ],
      boton: { texto: 'Entrar a VitalTraining', url },
    }),
    texto: `¡Hola, ${nombre}! Tu cuenta en VitalTraining ya está lista. Completa tu perfil médico, registra tu salud cada día y haz tus primeros tests físicos. Entra en ${url}`,
  };
}

function restablecer({ nombre, url, minutos }) {
  const n = escapar(nombre.split(' ')[0]);
  return {
    asunto: 'Cambia tu contraseña de VitalTraining',
    html: base({
      titulo: 'Recupera tu contraseña',
      parrafos: [
        `Hola, ${n}. Recibimos una solicitud para cambiar la contraseña de tu cuenta.`,
        `Pulsa el botón para elegir una nueva. El enlace sirve <strong>una sola vez</strong> y caduca en <strong>${minutos} minutos</strong>.`,
      ],
      boton: { texto: 'Elegir nueva contraseña', url },
      pie: 'Si no fuiste tú, ignora este correo: tu contraseña seguirá siendo la misma.',
    }),
    texto: `Hola, ${nombre}. Para elegir una nueva contraseña entra en: ${url} (sirve una vez y caduca en ${minutos} minutos). Si no fuiste tú, ignora este correo.`,
  };
}

function alertaSalud({ atleta, problemas, url }) {
  const lista = problemas.map(p => `• ${escapar(p)}`).join('<br>');
  return {
    asunto: `⚠️ ${atleta}: alerta de salud`,
    html: base({
      titulo: 'Alerta de salud de un atleta',
      parrafos: [`<strong>${escapar(atleta)}</strong> registró hoy valores que conviene revisar:`, lista],
      boton: { texto: 'Ver expediente', url },
      pie: 'Te llega porque eres parte del equipo médico de VitalTraining.',
    }),
    texto: `${atleta} registró hoy: ${problemas.join('; ')}. Revisa su expediente en ${url}`,
  };
}

function alertaCarga({ nombre, cambioPorcentaje, paraAtleta, url }) {
  const cambio = cambioPorcentaje > 0 ? `+${cambioPorcentaje} %` : `${cambioPorcentaje} %`;
  if (paraAtleta) {
    const n = escapar(nombre.split(' ')[0]);
    return {
      asunto: '🔴 Tu carga de entrenamiento está muy alta',
      html: base({
        titulo: `${n}, baja un poco el ritmo`,
        parrafos: [
          `Esta semana entrenaste <strong>${cambio}</strong> por encima de tu semana normal. Subir tanto de golpe aumenta el riesgo de lesión.`,
          '<strong>Qué hacer:</strong> baja la intensidad durante 2 o 3 días y prioriza dormir bien.',
        ],
        boton: { texto: 'Ver mi carga', url },
      }),
      texto: `${nombre}, esta semana entrenaste ${cambio} por encima de lo normal. Baja la intensidad 2 o 3 días. Más detalles en ${url}`,
    };
  }
  return {
    asunto: `🔴 ${nombre}: riesgo alto por carga de entrenamiento`,
    html: base({
      titulo: 'Riesgo alto por carga',
      parrafos: [`La carga de <strong>${escapar(nombre)}</strong> esta semana está <strong>${cambio}</strong> por encima de su media del último mes (ratio agudo:crónico > 1,5).`],
      boton: { texto: 'Ver expediente', url },
      pie: 'Te llega porque eres parte del equipo médico de VitalTraining.',
    }),
    texto: `La carga de ${nombre} esta semana está ${cambio} por encima de su media (ratio > 1,5). Revisa su expediente en ${url}`,
  };
}

module.exports = { bienvenida, restablecer, alertaSalud, alertaCarga, escapar };
