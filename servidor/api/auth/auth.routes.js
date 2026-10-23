/**
 * POST /api/auth/login       → Iniciar sesión
 * POST /api/auth/registro    → Crear cuenta de atleta (envía correo de bienvenida)
 * POST /api/auth/olvide      → Pedir enlace para cambiar la contraseña { email }
 * POST /api/auth/restablecer → Cambiar la contraseña con el enlace { token, password }
 */
const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl      = require('./auth.controller');

function limite(max, mensaje) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    message: { error: mensaje },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

const loginLimiter = limite(10, 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.');
// Cada petición puede enviar un correo: límite bajo para que no se use para hacer spam
const olvideLimiter = limite(5, 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.');
const restablecerLimiter = limite(10, 'Demasiados intentos. Intenta de nuevo en 15 minutos.');

router.post('/login',       loginLimiter,       ctrl.postLogin);
router.post('/registro',                        ctrl.postRegistro);
router.post('/olvide',      olvideLimiter,      ctrl.postOlvide);
router.post('/restablecer', restablecerLimiter, ctrl.postRestablecer);

module.exports = router;
