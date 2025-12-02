// services/notificaciones.service.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class NotificacionesService {
    
    /**
     * 🟢 Crear notificación para estudiante (cuando se califica su entrega)
     */
    static async crearNotificacionEstudiante(id_entrega, id_estudiante, id_docente, mensaje) {
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
                    mensaje: mensaje,
                    tipo: 'calificacion',
                    fecha_envio: new Date(),
                    id_actividad: entrega.id_actividad,
                    id_docente: id_docente,
                    id_entrega: id_entrega
                },
                include: {
                    docente: {
                        select: {
                            nombre: true,
                            apellido: true
                        }
                    }
                }
            });

            console.log(`✅ Notificación creada para estudiante ${id_estudiante}`);
            return notificacion;
        } catch (error) {
            console.error('❌ Error creando notificación para estudiante:', error);
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

    /**
     * 🟢 Obtener notificaciones recientes de un docente
     */
    static async obtenerNotificacionesDocente(id_docente, limite = 20) {
        try {
            const notificaciones = await prisma.notificacion.findMany({
                where: {
                    id_docente: id_docente
                },
                include: {
                    actividad: {
                        select: {
                            titulo: true,
                            tipo: true
                        }
                    },
                    entrega: {
                        include: {
                            estudiante: {
                                select: {
                                    nombre: true,
                                    apellido: true,
                                    codigo: true
                                }
                            }
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
                actividad: notif.actividad?.titulo || null,
                estudiante: notif.entrega?.estudiante || null,
                id_entrega: notif.id_entrega
            }));
        } catch (error) {
            console.error('❌ Error obteniendo notificaciones del docente:', error);
            return [];
        }
    }

    /**
     * 🟢 Obtener notificaciones recientes de un estudiante
     */
    static async obtenerNotificacionesEstudiante(id_estudiante, limite = 15) {
        try {
            const entregas = await prisma.entrega.findMany({
                where: {
                    id_estudiante: id_estudiante,
                    notificacion: {
                        isNot: null
                    }
                },
                include: {
                    notificacion: {
                        include: {
                            docente: {
                                select: {
                                    nombre: true,
                                    apellido: true
                                }
                            }
                        }
                    },
                    actividad: {
                        select: {
                            titulo: true
                        }
                    }
                },
                orderBy: {
                    notificacion: {
                        fecha_envio: 'desc'
                    }
                }
            });

            return entregas
                .filter(entrega => entrega.notificacion !== null)
                .map(entrega => ({
                    id_notificacion: entrega.notificacion.id_notificacion,
                    mensaje: entrega.notificacion.mensaje,
                    tipo: entrega.notificacion.tipo,
                    fecha_envio: entrega.notificacion.fecha_envio,
                    docente: entrega.notificacion.docente 
                        ? `${entrega.notificacion.docente.nombre} ${entrega.notificacion.docente.apellido}`
                        : 'Sistema',
                    actividad: entrega.actividad.titulo,
                    id_entrega: entrega.id_entrega
                }))
                .slice(0, limite);
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
                where: { id_notificacion }
            });
            return true;
        } catch (error) {
            console.error('❌ Error eliminando notificación:', error);
            return false;
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