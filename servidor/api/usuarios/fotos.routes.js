/**
 * Fotos de perfil (cualquier usuario con sesión gestiona la suya):
 * PUT    /api/cuenta/foto   → Subir o cambiar mi foto { foto: "data:image/jpeg;base64,..." }
 * DELETE /api/cuenta/foto   → Quitar mi foto
 * GET    /api/fotos/:userId → La imagen, o 404 si no tiene foto (solo con sesión iniciada;
 *                              la interfaz la pide con el token y la muestra como blob)
 */
const express = require('express');
const svc     = require('./fotos.service');

const cuenta = express.Router();

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

module.exports = { cuenta, ver };
