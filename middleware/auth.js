const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vt-super-secret-key-2026';

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión.' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' });
  }
};
