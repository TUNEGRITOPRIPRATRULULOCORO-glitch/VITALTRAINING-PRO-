/**
 * Fotos de perfil (cualquier usuario con sesión gestiona la suya):
 * GET    /api/cuenta/yo     → Mis datos actuales (nombre, correo, rol, deporte) para refrescar la sesión
 * PUT    /api/cuenta/foto   → Subir o cambiar mi foto { foto: "data:image/jpeg;base64,..." }
 * DELETE /api/cuenta/foto   → Quitar mi foto
 * GET    /api/fotos/:userId → La imagen, o 404 si no tiene foto (solo con sesión iniciada;
 *                              la interfaz la pide con el token y la muestra como blob)
 *
 * Mi cuenta (cualquier rol):
 * PUT    /api/cuenta/password → Cambiar la contraseña { actual, nueva }
 * GET    /api/cuenta/datos    → Descargar todos mis datos (JSON)
 * DELETE /api/cuenta          → Borrar mi cuenta y todos mis datos { password }
 */
const express = require('express');
const svc     = require('./fotos.service');

const cuenta = express.Router();

// El nombre guardado en la sesión puede quedarse viejo si un admin lo cambia; la interfaz lo refresca con esto
cuenta.get('/yo', async (req, res) => {
  try {
    const yo = await require('./usuarios.service').datosPropios(req.user.id);
    if (!yo) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(yo);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo tu cuenta.' });
  }
});

cuenta.put('/foto', async (req, res) => {
  try {
    const { bytes } = await svc.guardar(req.user.id, req.body?.foto);
    res.json({ ok: true, bytes, version: Date.now() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Error guardando la foto.' });
  }
});

cuenta.delete('/foto', async (req, res) => {
  try {
    await svc.borrar(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error quitando la foto.' });
  }
});

const ver = express.Router();

ver.get('/:userId', async (req, res) => {
  try {
    const foto = await svc.obtener(req.params.userId);
    if (!foto) return res.status(404).end();
    res.set({
      'Content-Type': foto.mime,
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(foto.bytes);
  } catch (err) {
    res.status(500).end();
  }
});

// Piden la contraseña: pocos intentos por persona para que no sirvan para adivinarla
const intentosCuenta = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: req => `cuenta-${req.user.id}`,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const cuentaSvc = require('./cuenta.service');
const fallo = (res, err, porDefecto) => res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });

cuenta.put('/password', intentosCuenta, async (req, res) => {
  try {
    await cuentaSvc.cambiarPassword(req.user.id, req.body || {});
    res.json({ ok: true });
  } catch (err) {
    fallo(res, err, 'Error cambiando la contraseña.');
  }
});

cuenta.get('/datos', async (req, res) => {
  try {
    const datos = await cuentaSvc.exportar(req.user.id);
    res.set('Content-Disposition', `attachment; filename="vitaltraining-mis-datos-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(datos);
  } catch (err) {
    fallo(res, err, 'Error preparando tus datos.');
  }
});

cuenta.delete('/', intentosCuenta, async (req, res) => {
  try {
    await cuentaSvc.borrar(req.user.id, req.body || {});
    res.json({ ok: true });
  } catch (err) {
    fallo(res, err, 'Error borrando la cuenta.');
  }
});

module.exports = { cuenta, ver };
