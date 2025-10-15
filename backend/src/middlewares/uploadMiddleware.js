//Importamos el Muler
//Multer es un middleware que procesa los archivos en las peticiones HTTP
import multer from 'multer';

//memoryStorage guarda el archivo en memoria RAM temporalmente
const storage = multer.memoryStorage();

//Configuramos el Multer
const upload = multer({
    storage: storage, //Acá hacemos uso de la RAM
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
    },
    fileFilter: (req, file, cb) => {
        //Esta función validará los archivos que puede aceptar el sistema
        //cb es un callback que dice si aceptar o rechazar el archivo

        //Definimos los archivos que serán permitidos
        const allowdTypes = [
            'application/pdf',                          // PDF
            'application/msword',                       // DOC
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
            'application/zip',                          // ZIP
            'application/x-rar-compressed',             // RAR
            'image/jpeg', 'image/png', 'image/jpg'      // Imágenes
        ]

        //Validamos los archivos
        if (allowdTypes.includes(file.mimetype)) {
            console.log(`Archivo aceptado: ${file.originalname} (${file.mimetype})`);
            cb(null, true);
        } else {
            console.log(`Tipo de archivo rechazado: ${file.mimetype}`);
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
        }
    }
});

//upload.single('archivo') significa que esperamos un solo archivo
//en el campo lamado 'archivo' del formData
export default upload;