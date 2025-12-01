import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 🟢 Obtener chats del estudiante
export const getChatsByEstudiante = async (id_estudiante) => {
  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id_estudiante },
      select: { id_usuario: true }
    });

    if (!estudiante) throw new Error("Estudiante no encontrado");

    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { id_remitente: estudiante.id_usuario },
          { id_destinatario: estudiante.id_usuario },
        ],
      },
      include: {
        remitente: {
          select: {
            id_usuario: true, correo: true, rol: true,
            docente: { select: { nombre: true, apellido: true } },
            estudiante: { select: { nombre: true, apellido: true } }
          }
        },
        destinatario: {
          select: {
            id_usuario: true, correo: true, rol: true,
            docente: { select: { nombre: true, apellido: true } },
            estudiante: { select: { nombre: true, apellido: true } }
          }
        },
        curso: { select: { nombre: true } },
        seccion: { select: { nombre: true } },
        mensajes: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { contenido: true, fecha: true, id_remitente: true }
        }
      },
      orderBy: { mensajes: { _count: 'desc' } }
    });

    return chats.map(chat => {
      const esRemitente = chat.id_remitente === estudiante.id_usuario;
      const otroUsuario = esRemitente ? chat.destinatario : chat.remitente;
      const usuarioInfo = otroUsuario.docente || otroUsuario.estudiante;
      
      return {
        id_chat: chat.id_chat,
        docente: usuarioInfo,
        curso: chat.curso?.nombre,
        seccion: chat.seccion?.nombre,
        ultimo_mensaje: chat.mensajes[0]?.contenido,
        fecha_ultimo_mensaje: chat.mensajes[0]?.fecha,
        total_mensajes: chat.mensajes?.length || 0
      };
    });
  } catch (error) {
    console.error("❌ Error en getChatsByEstudiante:", error);
    throw error;
  }
};

// 🟢 Obtener docentes disponibles para el estudiante
export const getDocentesByEstudiante = async (id_estudiante) => {
  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id_estudiante },
      include: {
        seccion: {
          include: {
            docentes: {
              include: {
                usuario: {
                  select: { id_usuario: true, correo: true }
                }
              }
            }
          }
        }
      }
    });

    if (!estudiante) throw new Error("Estudiante no encontrado");

    return estudiante.seccion.docentes.map(docente => ({
      id_docente: docente.id_docente,
      id_usuario: docente.id_usuario,
      nombre: docente.nombre,
      apellido: docente.apellido,
      correo: docente.usuario.correo,
      seccion: estudiante.seccion.nombre
    }));
  } catch (error) {
    console.error("❌ Error en getDocentesByEstudiante:", error);
    throw error;
  }
};