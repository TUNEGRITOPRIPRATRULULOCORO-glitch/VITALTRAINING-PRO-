/**
 * POST /api/auth/login    → Iniciar sesión
 * POST /api/auth/registro → Crear cuenta de Futbolista
 */
const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('./auth.controller');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',    loginLimiter, ctrl.postLogin);
router.post('/registro', ctrl.postRegistro);

module.exports = router;
