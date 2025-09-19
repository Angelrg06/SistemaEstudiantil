// backend/src/middlewares/checkRole.middleware.js
export const checkRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    next();
  };
};
