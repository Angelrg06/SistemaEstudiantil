//Importamos dependencias
import { PrismaClient } from "@prisma/client";
import supabaseService from '../services/supabase.service.js';
const prisma = new PrismaClient();

//Importar metodo para obtener el codigo del estudiante logueado
import { getEstudianteByUsuario } from '../services/estudiante.service.js';


//Crear nueva entrega
export const crearEntrega = async (req, res) => {

    try {
        console.log('Iniciando proceso de entrega');

        //Obtener datos de la petición
        const { id_actividad } = req.body;
        const archivo = req.file; //Archivo procesado para Multer
        const id_usuario = req.user.id; //ID del usuario desde el token

        //req.file contiene el archivo que Multer procesó
        //Viene del FormData que envía Angular

        //Validad si existe el archivo
        if (!archivo) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo'
            })
        }

        //Verificar si el archivo que se recibe y su tamaño
        console.log(`Archivo recibido: ${archivo.originalname} (${archivo.size} bytes)`);

        //Obtenemos el id del estudiante
        const estudiante = await getEstudianteByUsuario(id_usuario);

        if (!estudiante) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró el perfil de estudiante'
            });
        }

        const id_estudiante = estudiante.id_estudiante;
        //Verificar que obtiene el id del estudiante logueado
        console.log(`Estudiante encontrado - ID: ${id_estudiante}`);

        //Subir archivo a Supabase
        console.log('Subiendo archivo a Supabase');
        const archivoData = await supabaseService.subirArchivo(
            archivo.buffer,             //Contenido del archivo en memoria
            archivo.originalname,       //Nombre original
            'entregas',                 //Carpeta en Supabase 
            archivo.mimetype            //Tipo MIME
        );

        //Guardar en PostgreSQL
        console.log('Guardando en PostgreSQL');

        // Guardamos solo la URL de Supabase en PostgreSQL, NO el archivo completo
        // Esto hace que la base de datos sea más rápida y liviana

        const entrega = await prisma.entrega.create({

            data: {
                archivo: archivoData.url, //URL pública de Supabase
                archivo_ruta: archivoData.ruta, //Ruta interna en Supabase
                fecha_entrega: new Date(),
                id_actividad: parseInt(id_actividad),
                id_estudiante: id_estudiante
            },
            include: {
                actividad: {
                    select: { id_actividad: true, titulo: true, tipo: true, descripcion: true }
                },
                estudiante: {
                    select: { id_estudiante: true, nombre: true, apellido: true, codigo: true }
                }
            }

        });

        console.log('Entrega creada exitosamente');

        //Enviar respuesta
        res.json({
            success: true,
            message: 'Entrega enviada correctamente',
            data: entrega
        })

    } catch (error) {
        // Manejar errores específicos de Prisma
        if (error.code === 'P2002') {
            return res.status(400).json({
                success: false,
                error: 'Ya has entregado esta actividad anteriormente'
            });
        }

        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                error: 'La actividad no existe'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al procesar la entrega: ' + error.message
        });
    };

}

//Descargar los archivos
export const descargarArchivo = async (req, res) => {
    try {
        const { ruta } = req.params;
        console.log(`Solicitando descarga: ${ruta}`);

        // Creamos una URL firmada que expira en 1 hora
        // Esto es más seguro que usar la URL pública directamente

        const { data, error } = await supabaseService.supabase.storage
            .from('archivos')
            .createSignedUrl(ruta, 3600); // 3600 segundos = 1 hora

        if (error) throw error;

        res.json({
            success: true,
            data: {
                downloadUrl: data.signedUrl,
                expiresAt: new Date(Date.now() + 3600 * 1000)
            }
        });

    } catch (error) {
        console.error('Error descargando archivo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener archivo'
        });
    }
};