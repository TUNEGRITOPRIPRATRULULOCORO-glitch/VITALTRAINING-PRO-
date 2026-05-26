const svc = require('./auth.service');

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
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
      return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos.' });

    const resultado = await svc.registro(req.body);
    if (resultado.error) return res.status(resultado.status).json({ error: resultado.error });

    res.status(201).json({ ok: true, user: resultado.usuario });
  } catch (err) {
    console.error('❌ Registro:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = { postLogin, postRegistro };
