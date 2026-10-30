/**
 * GET  /api/alimentos/codigo/:codigo → Producto por código de barras (nuestra base u Open Food Facts)
 * POST /api/alimentos/codigo/:codigo → Guardar un producto escrito a mano desde la etiqueta
 *
 * Cualquier usuario con sesión: la base de productos es común para todo el club.
 */
const router = require('express').Router();
const svc    = require('./alimentos.service');

function fallo(res, err, mensaje) {
  if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
  console.error('Alimentos:', err.message);
  res.status(500).json({ ok: false, error: mensaje });
}

router.get('/codigo/:codigo', async (req, res) => {
  try { res.json({ ok: true, ...(await svc.buscar(req.params.codigo)) }); }
  catch (err) { fallo(res, err, 'Error buscando el producto.'); }
});

router.post('/codigo/:codigo', async (req, res) => {
  try { res.status(201).json({ ok: true, producto: await svc.guardarManual(req.params.codigo, req.body, req.user) }); }
  catch (err) { fallo(res, err, 'Error guardando el producto.'); }
});

module.exports = router;
