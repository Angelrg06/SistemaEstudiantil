// entrega.Controller.js - VERSIÓN CORREGIDA
import { PrismaClient } from "@prisma/client";
import { NotificacionesService } from '../services/notificaciones.service.js';
import supabaseService from '../services/supabase.service.js';
const prisma = new PrismaClient();

// Importar metodo para obtener el codigo del estudiante logueado
import { getEstudianteByUsuario } from '../services/estudiante.service.js';

// Crear nueva entrega
export const crearEntrega = async (req, res) => {
    try {
        console.log('🚀 Iniciando proceso de entrega');

        // Obtener datos de la petición
        const { id_actividad } = req.body;
        if (!id_actividad) {
            return res.status(400).json({ 
                success: false,
                error: "ID de actividad requerido" 
            });
        }
        
        const comentario_estudiante = req.body.comentario_estudiante || null;
        const archivo = req.file; // Archivo procesado para Multer
        const id_usuario = req.user.id_usuario; // ID del usuario desde el token

        // Validar si existe el archivo
        if (!archivo) {
            return res.status(400).json({
                success: false,
                error: 'No se proporcionó ningún archivo'
            });
        }

        console.log(`📁 Archivo recibido: ${archivo.originalname} (${archivo.size} bytes)`);

        // Obtener el id del estudiante
        const estudiante = await getEstudianteByUsuario(id_usuario);
        if (!estudiante) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró el perfil de estudiante'
            });
        }

        const id_estudiante = estudiante.id_estudiante;
        console.log(`👨‍🎓 Estudiante encontrado - ID: ${id_estudiante}`);

        // ✅ MOVER ESTO: Validar existencia de la actividad y obtener max_intentos
        const actividad = await prisma.actividad.findUnique({
            where: { id_actividad: Number(id_actividad) },
            select: { 
                id_actividad: true, 
                titulo: true, 
                max_intentos: true,
                fecha_fin: true // Para validar fecha límite
            }
        });

        if (!actividad) {
            return res.status(404).json({
                success: false, // ✅ CORREGIR: debe ser false
                error: 'La actividad no existe'
            });
        }

        // ✅ AHORA SÍ podemos usar actividad
        const maxIntentos = actividad.max_intentos || 3;

        // Validar fecha límite (opcional)
        const fechaFin = new Date(actividad.fecha_fin);
        const ahora = new Date();
        if (ahora > fechaFin) {
            return res.status(400).json({
                success: false,
                error: 'La fecha límite para esta actividad ha expirado'
            });
        }

        // Determinar el siguiente intento para este estudiante y actividad
        const ultimaEntrega = await prisma.entrega.findFirst({
            where: { 
                id_estudiante, 
                id_actividad: Number(id_actividad) 
            },
            orderBy: { intento: 'desc' },
            select: { intento: true }
        });

        const nextIntento = ultimaEntrega ? ultimaEntrega.intento + 1 : 1;

        console.log(`📊 Último intento: ${ultimaEntrega ? ultimaEntrega.intento : 0}, siguiente intento: ${nextIntento}, max: ${maxIntentos}`);

        // Verificar si se excede el número de intentos
        if (nextIntento > maxIntentos) {
            return res.status(400).json({
                success: false,
                error: `Has superado el número máximo de intentos (${maxIntentos}) para esta actividad.`
            });
        }

        // Subir archivo a Supabase
        console.log('☁️ Subiendo archivo a Supabase...');
        const archivoData = await supabaseService.subirArchivo(
            archivo.buffer,
            archivo.originalname,
            'entregas',
            archivo.mimetype
        );

        console.log('💾 Guardando en PostgreSQL...');

       const nuevaEntrega = await prisma.entrega.create({
    data: {
        archivo: archivoData.url,
        archivo_ruta: archivoData.ruta,
        fecha_entrega: new Date(),
        comentario_estudiante: comentario_estudiante,
        intento: nextIntento,
        id_actividad: parseInt(id_actividad),
        id_estudiante: id_estudiante,
        estado_entrega: 'ENTREGADO'
    },
    include: {
        actividad: {
            select: { 
                id_actividad: true, 
                titulo: true, 
                tipo: true, 
                descripcion: true,
                docente: {
                    select: {
                        id_docente: true,
                        nombre: true,
                        apellido: true
                    }
                }
            }
        },
        estudiante: {
            select: { 
                id_estudiante: true, 
                nombre: true, 
                apellido: true, 
                codigo: true 
            }
        }
    }
});

console.log('✅ Entrega creada exitosamente - ID:', nuevaEntrega.id_entrega);

// 🟢 GENERAR NOTIFICACIÓN AUTOMÁTICA PARA EL DOCENTE
try {
    await NotificacionesService.crearNotificacionDocente(
        nuevaEntrega.id_entrega,
        nuevaEntrega.actividad.docente.id_docente,
        `Nueva entrega de ${nuevaEntrega.estudiante.nombre} ${nuevaEntrega.estudiante.apellido} en "${nuevaEntrega.actividad.titulo}" - Intento ${nuevaEntrega.intento}`
    );
    console.log('🔔 Notificación enviada al docente');
} catch (notifError) {
    console.error('⚠️ Error al crear notificación:', notifError);
    // No fallamos la entrega si la notificación falla
}


        // Enviar respuesta
        res.json({
            success: true,
            message: 'Entrega enviada correctamente',
            data: entrega
        });

    } catch (error) {
        console.error('🔥 ERROR DETECTADO EN crearEntrega:', error);
        
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
            error: 'Error al procesar la entrega: ' + error.message,
        });
    }
};

// Descargar los archivos
export const descargarArchivo = async (req, res) => {
    try {
        const { ruta } = req.params;
        console.log(`📥 Solicitando descarga: ${ruta}`);

        const { data, error } = await supabaseService.supabase.storage
            .from('archivos')
            .createSignedUrl(ruta, 3600);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                downloadUrl: data.signedUrl,
                expiresAt: new Date(Date.now() + 3600 * 1000)
            }
        });

    } catch (error) {
        console.error('❌ Error descargando archivo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener archivo'
        });
    }
};

// 🟢 NUEVAS FUNCIONES AGREGADAS
export const getMisEntregas = async (req, res) => {
    try {
        const id_curso = parseInt(req.params.id_curso);
        const id_usuario = req.user.id_usuario;

        console.log('📦 Obteniendo entregas del estudiante:', id_usuario, 'curso:', id_curso);

        // Obtener estudiante
        const estudiante = await getEstudianteByUsuario(id_usuario);
        if (!estudiante) {
            return res.status(404).json({
                success: false,
                error: 'Estudiante no encontrado'
            });
        }

        // Obtener entregas del estudiante para este curso
        const entregas = await prisma.entrega.findMany({
            where: {
                id_estudiante: estudiante.id_estudiante,
                actividad: {
                    id_curso: id_curso
                }
            },
            include: {
                actividad: {
                    select: {
                        id_actividad: true,
                        titulo: true,
                        tipo: true,
                        max_intentos: true
                    }
                },
                retroalimentacion: {
                    select: {
                        calificacion: true,
                        comentario: true,
                        fecha: true
                    }
                }
            },
            orderBy: {
                fecha_entrega: 'desc'
            }
        });

        res.json({
            success: true,
            data: entregas
        });

    } catch (error) {
        console.error('❌ Error obteniendo mis entregas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener entregas'
        });
    }
};

export const verificarIntentos = async (req, res) => {
    try {
        const id_actividad = parseInt(req.params.id_actividad);
        const id_usuario = req.user.id_usuario;

        console.log('🔍 Verificando intentos para actividad:', id_actividad);

        // Obtener estudiante
        const estudiante = await getEstudianteByUsuario(id_usuario);
        if (!estudiante) {
            return res.status(404).json({
                success: false,
                error: 'Estudiante no encontrado'
            });
        }

        // Obtener actividad
        const actividad = await prisma.actividad.findUnique({
            where: { id_actividad },
            select: {
                max_intentos: true,
                titulo: true
            }
        });

        if (!actividad) {
            return res.status(404).json({
                success: false,
                error: 'Actividad no encontrada'
            });
        }

        // Obtener entregas previas del estudiante
        const entregasPrevias = await prisma.entrega.findMany({
            where: {
                id_actividad,
                id_estudiante: estudiante.id_estudiante
            },
            select: {
                intento: true
            },
            orderBy: {
                intento: 'desc'
            }
        });

        const maxIntentos = actividad.max_intentos || 3;
        const intentoActual = entregasPrevias.length > 0 ? entregasPrevias[0].intento + 1 : 1;
        const intentosDisponibles = Math.max(0, maxIntentos - (intentoActual - 1));

        res.json({
            success: true,
            data: {
                max_intentos: maxIntentos,
                intento_actual: intentoActual,
                intentos_disponibles: intentosDisponibles,
                entregas_previas: entregasPrevias.length
            }
        });

    } catch (error) {
        console.error('❌ Error verificando intentos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar intentos'
        });
    }
};