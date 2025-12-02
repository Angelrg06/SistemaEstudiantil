// services/notificaciones.service.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class NotificacionesService {
    
    /**
     * 🟢 Crear notificación para estudiante (cuando se califica su entrega)
     */
    static async crearNotificacionDocente(id_entrega, id_docente, mensaje) {
        try {
            console.log(`📨 Creando notificación para docente ${id_docente}, entrega ${id_entrega}`);
            
            const notificacion = await prisma.notificacion.create({
                data: {
                    mensaje: mensaje,
                    tipo: 'entrega_nueva',
                    fecha_envio: new Date(),
                    id_entrega: id_entrega,
                    id_docente: id_docente,
                    // Obtener id_actividad desde la entrega
                    id_actividad: await this.obtenerIdActividadDeEntrega(id_entrega)
                },
                include: {
                    entrega: {
                        include: {
                            estudiante: {
                                select: {
                                    nombre: true,
                                    apellido: true
                                }
                            }
                        }
                    }
                }
            });

            console.log(`✅ Notificación creada para docente: ${notificacion.id_notificacion}`);
            return notificacion;
        } catch (error) {
            console.error('❌ Error creando notificación para docente:', error);
            return null;
        }
    }

    /**
 * 🟢 Crear notificación automática cuando se crea una entrega (para docente)
 */
static async notificarNuevaEntrega(id_entrega) {
    try {
        const entrega = await prisma.entrega.findUnique({
            where: { id_entrega },
            include: {
                actividad: {
                    include: {
                        docente: true
                    }
                },
                estudiante: true
            }
        });

        if (!entrega) {
            throw new Error('Entrega no encontrada');
        }

        const mensaje = `🎓 Nueva entrega de ${entrega.estudiante.nombre} ${entrega.estudiante.apellido} en "${entrega.actividad.titulo}" - Intento ${entrega.intento}`;
        
        return await prisma.notificacion.create({
            data: {
                mensaje,
                tipo: 'entrega_nueva',
                fecha_envio: new Date(),
                id_actividad: entrega.id_actividad,
                id_docente: entrega.actividad.id_docente,
                id_entrega: id_entrega
            }
        });
    } catch (error) {
        console.error('❌ Error creando notificación de nueva entrega:', error);
        return null;
    }
}

/**
 * 🟢 Crear notificación automática cuando se califica una entrega (para estudiante)
 */
static async notificarCalificacion(id_entrega, calificacion, comentario) {
    try {
        const entrega = await prisma.entrega.findUnique({
            where: { id_entrega },
            include: {
                actividad: true,
                estudiante: true
            }
        });

        if (!entrega) {
            throw new Error('Entrega no encontrada');
        }

        const mensaje = `📝 Tu entrega en "${entrega.actividad.titulo}" ha sido calificada: ${calificacion} - ${comentario}`;
        
        // Verificar que la actividad tenga un docente asociado
        if (!entrega.actividad.id_docente) {
            console.warn('⚠️ Actividad sin docente asociado, no se puede crear notificación');
            return null;
        }

        return await prisma.notificacion.create({
            data: {
                mensaje,
                tipo: 'calificacion',
                fecha_envio: new Date(),
                id_actividad: entrega.id_actividad,
                id_docente: entrega.actividad.id_docente,
                id_entrega: id_entrega
            }
        });
    } catch (error) {
        console.error('❌ Error creando notificación de calificación:', error);
        return null;
    }
}

    /**
     * 🟢 Crear notificación para docente (cuando un estudiante entrega)
     */
    static async crearNotificacionDocente(id_entrega, id_docente, id_estudiante) {
        try {
            const entrega = await prisma.entrega.findUnique({
                where: { id_entrega },
                include: {
                    actividad: true,
                    estudiante: true
                }
            });

            if (!entrega) {
                throw new Error('Entrega no encontrada');
            }

            const notificacion = await prisma.notificacion.create({
                data: {
                    mensaje: `Nueva entrega de ${entrega.estudiante.nombre} ${entrega.estudiante.apellido} en "${entrega.actividad.titulo}"`,
                    tipo: 'entrega',
                    fecha_envio: new Date(),
                    id_actividad: entrega.id_actividad,
                    id_docente: id_docente,
                    id_entrega: id_entrega
                }
            });

            console.log(`✅ Notificación creada para docente ${id_docente}`);
            return notificacion;
        } catch (error) {
            console.error('❌ Error creando notificación para docente:', error);
            return null;
        }
    }
  static async crearNotificacionEstudiante(id_entrega, mensaje, tipo = 'calificacion') {
        try {
            console.log(`📨 Creando notificación para estudiante, entrega ${id_entrega}`);
            
            // Obtener datos de la entrega
            const entrega = await prisma.entrega.findUnique({
                where: { id_entrega },
                include: {
                    actividad: {
                        select: {
                            id_docente: true,
                            id_actividad: true
                        }
                    }
                }
            });

            if (!entrega) {
                throw new Error('Entrega no encontrada');
            }

            const notificacion = await prisma.notificacion.create({
                data: {
                    mensaje: mensaje,
                    tipo: tipo,
                    fecha_envio: new Date(),
                    id_entrega: id_entrega,
                    id_docente: entrega.actividad.id_docente,
                    id_actividad: entrega.actividad.id_actividad
                }
            });

            console.log(`✅ Notificación creada para estudiante: ${notificacion.id_notificacion}`);
            return notificacion;
        } catch (error) {
            console.error('❌ Error creando notificación para estudiante:', error);
            return null;
        }
    }
    /**
     * 🟢 Obtener notificaciones recientes de un docente
     */
     static async obtenerNotificacionesEstudiante(id_estudiante, limite = 50) {
        try {
            const notificaciones = await prisma.notificacion.findMany({
                where: {
                    entrega: {
                        id_estudiante: id_estudiante
                    }
                },
                include: {
                    docente: {
                        select: {
                            nombre: true,
                            apellido: true
                        }
                    },
                    actividad: {
                        select: {
                            titulo: true
                        }
                    },
                    entrega: {
                        select: {
                            intento: true
                        }
                    }
                },
                orderBy: { fecha_envio: 'desc' },
                take: limite
            });

            return notificaciones.map(notif => ({
                id_notificacion: notif.id_notificacion,
                mensaje: notif.mensaje,
                tipo: notif.tipo || 'sistema',
                fecha_envio: notif.fecha_envio,
                docente: notif.docente ? 
                    `${notif.docente.nombre} ${notif.docente.apellido}` : 'Sistema',
                actividad: notif.actividad?.titulo || 'Actividad no disponible',
                id_entrega: notif.id_entrega,
                intento: notif.entrega?.intento || 1
            }));
        } catch (error) {
            console.error('❌ Error obteniendo notificaciones del estudiante:', error);
            return [];
        }
    }

    /**
     * 🟢 Obtener notificaciones recientes de un estudiante
     */
    // CORRECCIÓN: Función simplificada para obtener notificaciones de estudiante
static async obtenerNotificacionesEstudiante(id_estudiante, limite = 50) {
    try {
        const notificaciones = await prisma.notificacion.findMany({
            where: {
                entrega: {
                    id_estudiante: id_estudiante
                }
            },
            include: {
                docente: {
                    select: {
                        nombre: true,
                        apellido: true
                    }
                },
                actividad: {
                    select: {
                        titulo: true
                    }
                },
                entrega: {
                    select: {
                        intento: true
                    }
                }
            },
            orderBy: {
                fecha_envio: 'desc'
            },
            take: limite
        });

        return notificaciones.map(notif => ({
            id_notificacion: notif.id_notificacion,
            mensaje: notif.mensaje,
            tipo: notif.tipo,
            fecha_envio: notif.fecha_envio,
            docente: notif.docente 
                ? `${notif.docente.nombre} ${notif.docente.apellido}`
                : 'Sistema',
            actividad: notif.actividad?.titulo || 'Actividad no disponible',
            id_entrega: notif.id_entrega,
            intento: notif.entrega?.intento || 1
        }));
    } catch (error) {
        console.error('❌ Error obteniendo notificaciones del estudiante:', error);
        return [];
    }
}

    /**
     * 🟢 Marcar notificación como leída (eliminar)
     */
    static async marcarComoLeida(id_notificacion) {
        try {
            await prisma.notificacion.delete({
                where: { id_notificacion: id_notificacion }
            });
            return true;
        } catch (error) {
            console.error('❌ Error eliminando notificación:', error);
            return false;
        }
    }

/**
     * 🟢 Contador de notificaciones no leídas para DOCENTE
     */
    static async contarNotificacionesDocente(id_docente) {
        try {
            const count = await prisma.notificacion.count({
                where: {
                    id_docente: id_docente,
                    fecha_envio: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
                    }
                }
            });
            return count;
        } catch (error) {
            console.error('❌ Error contando notificaciones docente:', error);
            return 0;
        }
    }

    /**
     * 🟢 Obtener contador de notificaciones no leídas
     */
    static async obtenerContadorNotificacionesDocente(id_docente) {
        try {
            const count = await prisma.notificacion.count({
                where: {
                    id_docente: id_docente,
                    fecha_envio: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
                    }
                }
            });
            return count;
        } catch (error) {
            console.error('❌ Error obteniendo contador de notificaciones:', error);
            return 0;
        }
    }

    /**
     * 🟢 Contador de notificaciones no leídas para DOCENTE
     */
    static async contarNotificacionesDocente(id_docente) {
        try {
            const count = await prisma.notificacion.count({
                where: {
                    id_docente: id_docente,
                    fecha_envio: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
                    }
                }
            });
            return count;
        } catch (error) {
            console.error('❌ Error contando notificaciones docente:', error);
            return 0;
        }
    }

    /**
     * 🟢 Contador de notificaciones no leídas para ESTUDIANTE
     */
    static async contarNotificacionesEstudiante(id_estudiante) {
        try {
            const count = await prisma.notificacion.count({
                where: {
                    entrega: {
                        id_estudiante: id_estudiante
                    },
                    fecha_envio: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
                    }
                }
            });
            return count;
        } catch (error) {
            console.error('❌ Error contando notificaciones estudiante:', error);
            return 0;
        }
    }

    // 🔧 Método auxiliar privado
    static async obtenerIdActividadDeEntrega(id_entrega) {
        const entrega = await prisma.entrega.findUnique({
            where: { id_entrega },
            select: { id_actividad: true }
        });
        return entrega?.id_actividad;
    }

    static async obtenerContadorNotificacionesEstudiante(id_estudiante) {
        try {
            const entregasConNotif = await prisma.entrega.findMany({
                where: {
                    id_estudiante: id_estudiante,
                    notificacion: {
                        isNot: null
                    }
                },
                select: {
                    notificacion: {
                        select: {
                            id_notificacion: true
                        }
                    }
                }
            });

            return entregasConNotif.filter(e => e.notificacion !== null).length;
        } catch (error) {
            console.error('❌ Error obteniendo contador de notificaciones:', error);
            return 0;
        }
    }
}