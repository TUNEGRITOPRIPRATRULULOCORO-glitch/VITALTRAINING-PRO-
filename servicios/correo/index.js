/**
 * Envío de correos.
 *
 * Con BREVO_API_KEY y CORREO_REMITENTE en el entorno se envían de verdad con Brevo
 * (API HTTP, sin dependencias extra). Sin configurar, la app sigue funcionando:
 * los correos se muestran en la consola del servidor y se guardan en `enviados`
 * (útil en desarrollo y en los tests).
 *
 * Un correo que falla nunca rompe la acción que lo provocó (registro, alerta...).
 */
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const MAX_GUARDADOS = 50;

const enviados = []; // solo en modo consola

function configurado() {
  return Boolean(process.env.BREVO_API_KEY && process.env.CORREO_REMITENTE);
}

/** Dirección pública de la app, para los enlaces de los correos. */
function urlApp() {
  const url = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`;
  return url.replace(/\/+$/, '');
}

/**
 * @param {{ para: string, nombre?: string, asunto: string, html: string, texto: string }} correo
 * @returns {Promise<{ ok: boolean, modo?: string, motivo?: string }>}
 */
async function enviarCorreo({ para, nombre, asunto, html, texto }) {
  if (!para) return { ok: false, motivo: 'sin-destinatario' };

  if (!configurado()) {
    enviados.push({ para, nombre, asunto, html, texto, fecha: new Date().toISOString() });
    if (enviados.length > MAX_GUARDADOS) enviados.shift();
    if (process.env.NODE_ENV !== 'test') {
      console.log(`✉️  [correo sin enviar: falta BREVO_API_KEY] Para ${para} · ${asunto}`);
      // En desarrollo se muestra el texto (con sus enlaces) para poder probar sin Brevo.
      // En producción no: los enlaces de contraseña no deben quedar en los registros.
      if (process.env.NODE_ENV !== 'production') console.log(`   ${texto}`);
    }
    return { ok: true, modo: 'consola' };
  }

  try {
    const respuesta = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.CORREO_REMITENTE, name: process.env.CORREO_NOMBRE || 'Vital Sports' },
        to: [{ email: para, ...(nombre ? { name: nombre } : {}) }],
        subject: asunto,
        htmlContent: html,
        textContent: texto,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!respuesta.ok) {
      console.error(`❌ Correo no enviado a ${para} (${respuesta.status}):`, (await respuesta.text()).slice(0, 200));
      return { ok: false, motivo: 'proveedor' };
    }
    return { ok: true, modo: 'brevo' };
  } catch (err) {
    console.error(`❌ Correo no enviado a ${para}:`, err.message);
    return { ok: false, motivo: 'red' };
  }
}

/** Envía sin hacer esperar a quien lo llama ni propagar errores. */
function enviarEnSegundoPlano(correo) {
  enviarCorreo(correo).catch(() => {});
}

module.exports = { enviarCorreo, enviarEnSegundoPlano, configurado, urlApp, enviados };
