import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: '1h' }
  );
};
