// backend/src/middlewares/checkAdmin.middleware.js
export const checkAdmin = (req, res, next) => {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Solo admins.' });
  }
  next();
};
