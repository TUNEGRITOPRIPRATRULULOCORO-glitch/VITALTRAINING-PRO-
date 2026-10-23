const svc = require('./auth.service');
const google = require('./google');
const avisos = require('../avisos');

async function postLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });

    const resultado = await svc.login(email, password);
    if (resultado.error) return res.status(resultado.status).json({ error: resultado.error });

    res.json({ ok: true, user: resultado.usuario, token: resultado.token });
  } catch (err) {
    console.error('❌ Login:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function postRegistro(req, res) {
  try {
    const { nombre, email, password, googleCredencial } = req.body;
    if (!nombre || (!googleCredencial && (!email || !password)))
      return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos.' });

    const resultado = await svc.registro(req.body);
    if (resultado.error) return res.status(resultado.status).json({ error: resultado.error });

    res.status(201).json({ ok: true, user: resultado.usuario, ...(resultado.token ? { token: resultado.token } : {}) });
    avisos.bienvenida(resultado.usuario); // después de responder; un fallo no afecta al registro
  } catch (err) {
    console.error('❌ Registro:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

async function postGoogle(req, res) {
  try {
    const resultado = await svc.loginGoogle(req.body?.credencial);
    if (resultado.error) return res.status(resultado.status).json({ error: resultado.error });
    if (resultado.nuevo) return res.json({ ok: true, nuevo: true, nombre: resultado.nombre, email: resultado.email });
    res.json({ ok: true, user: resultado.usuario, token: resultado.token });
  } catch (err) {
    console.error('❌ Login con Google:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

/** Datos públicos que necesita la pantalla de inicio (sin secretos). */
function getConfig(req, res) {
  res.json({ googleClientId: google.clientId() });
}

// Respuesta idéntica exista o no el correo, para no revelar quién tiene cuenta
const RESPUESTA_OLVIDE = { ok: true, mensaje: 'Si el correo está registrado, te enviamos un enlace para cambiar tu contraseña.' };

async function postOlvide(req, res) {
  try {
    await svc.solicitarRestablecimiento(req.body?.email);
    res.json(RESPUESTA_OLVIDE);
  } catch (err) {
    console.error('❌ Recuperar contraseña:', err.message);
    res.json(RESPUESTA_OLVIDE);
  }
}

async function postRestablecer(req, res) {
  try {
    const resultado = await svc.restablecerPassword(req.body?.token, req.body?.password);
    if (resultado.error) return res.status(resultado.status).json({ error: resultado.error });
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Restablecer contraseña:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { postLogin, postRegistro, postGoogle, getConfig, postOlvide, postRestablecer };
