const svc = require('./mensajes.service');

// Los errores con status (400/403/404) son de validación y su mensaje se puede mostrar
function responderError(res, err, porDefecto) {
  res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });
}

async function getContactos(req, res) {
  try {
    res.json({ ok: true, contactos: await svc.listarContactos(req.user) });
  } catch (err) {
    responderError(res, err, 'Error cargando contactos.');
  }
}

async function getNoLeidos(req, res) {
  try {
    res.json({ ok: true, ...(await svc.noLeidos(req.user)) });
  } catch (err) {
    responderError(res, err, 'Error contando mensajes.');
  }
}

async function getConversacion(req, res) {
  try {
    res.json({ ok: true, ...(await svc.conversacion(req.user, req.params.otroId)) });
  } catch (err) {
    responderError(res, err, 'Error cargando la conversación.');
  }
}

async function postMensaje(req, res) {
  try {
    const mensaje = await svc.enviar(req.user, req.params.otroId, req.body?.texto);
    res.status(201).json({ ok: true, mensaje });
  } catch (err) {
    responderError(res, err, 'Error enviando el mensaje.');
  }
}

module.exports = { getContactos, getNoLeidos, getConversacion, postMensaje };
