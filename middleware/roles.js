function requireRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
    }
    next();
  };
}

function requireOwnerOrRol(...roles) {
  return (req, res, next) => {
    const userId = Number(req.params.userId);
    if (Number(req.user.id) === userId || roles.includes(req.user.rol)) return next();
    return res.status(403).json({ error: 'No tienes permiso para acceder a estos datos.' });
  };
}

module.exports = { requireRol, requireOwnerOrRol };