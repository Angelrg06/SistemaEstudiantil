// utils/generateToken.js 
import jwt from 'jsonwebtoken';

export const generateToken = (userData) => {
  return jwt.sign(
    { 
      id_usuario: userData.id_usuario, 
      rol: userData.rol 
    },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};
