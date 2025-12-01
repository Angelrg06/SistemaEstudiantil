import multer from 'multer';

// 🟢 CONFIGURACIÓN UNIFICADA PARA TODOS LOS UPLOADS
const multerConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    console.log(`🔍 Validando archivo: ${file.originalname} (${file.mimetype})`);
    
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      console.log(`✅ Archivo aceptado: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`❌ Tipo de archivo rechazado: ${file.mimetype}`);
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    }
  }
};

// 🟢 MIDDLEWARES ESPECÍFICOS
export const uploadMensaje = multer(multerConfig).single('archivo');
export const uploadEntrega = multer(multerConfig).single('archivo');

export default multerConfig;