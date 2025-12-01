import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 🟢 AGREGAR: Función auxiliar para obtener tipo de archivo
function obtenerTipoArchivo(url) {
  if (!url) return 'application/octet-stream';
  
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (!extension) return 'application/octet-stream';
  
  const tipos = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  
  return tipos[extension] || 'application/octet-stream';
}

// Helper functions para convertir IDs
const obtenerIdUsuarioDocente = async (id_docente) => {
  const docente = await prisma.docente.findUnique({
    where: { id_docente },
    select: { id_usuario: true }
  });
  if (!docente) throw new Error(`Docente con ID ${id_docente} no encontrado`);
  return docente.id_usuario;
};

/**
 * 🟢 Obtener todos los chats del docente (lista de alumnos) - CORREGIDO
 */
export const getChatsByDocente = async (id_docente) => {
  try {
    console.log('🎯 Obteniendo chats para docente ID:', id_docente);
    
    // ✅ PRIMERO: Obtener el id_usuario del docente
    const id_usuario_docente = await obtenerIdUsuarioDocente(id_docente);
    console.log('🔁 ID Usuario del docente:', id_usuario_docente);
    
    // ✅ AHORA SÍ: Buscar chats por id_usuario
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { id_remitente: id_usuario_docente },
          { id_destinatario: id_usuario_docente },
        ],
      },
      include: {
        remitente: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true,
            docente: { // ✅ CORRECCIÓN: Usar 'docente' en singular
              select: { nombre: true, apellido: true, id_docente: true }
            },
            estudiante: { // ✅ CORRECCIÓN: Usar 'estudiante' en singular
              select: { nombre: true, apellido: true, id_estudiante: true }
            }
          }
        },
        destinatario: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true,
            docente: { // ✅ CORRECCIÓN: Usar 'docente' en singular
              select: { nombre: true, apellido: true, id_docente: true }
            },
            estudiante: { // ✅ CORRECCIÓN: Usar 'estudiante' en singular
              select: { nombre: true, apellido: true, id_estudiante: true }
            }
          }
        },
        curso: { select: { nombre: true } },
        seccion: { select: { nombre: true } },
        mensajes: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: {
            contenido: true,
            fecha: true,
            id_remitente: true
          }
        }
      },
      orderBy: {
        mensajes: {
          _count: 'desc'
        }
      }
    });

    console.log(`📊 Chats encontrados: ${chats.length}`);

    return chats.map(chat => {
      const esRemitente = chat.id_remitente === id_usuario_docente;
      const otroUsuario = esRemitente ? chat.destinatario : chat.remitente;
      
      // ✅ CORRECCIÓN: Usar las relaciones correctas
      const usuarioInfo = otroUsuario.estudiante || otroUsuario.docente;
      const ultimoMensaje = chat.mensajes[0];
      
      return {
        id_chat: chat.id_chat,
        usuario: {
          id_usuario: otroUsuario.id_usuario,
          correo: otroUsuario.correo,
          nombre: usuarioInfo?.nombre || 'Usuario',
          apellido: usuarioInfo?.apellido || '',
          rol: otroUsuario.rol,
          id_estudiante: usuarioInfo?.id_estudiante
        },
        curso: chat.curso?.nombre || 'Sin curso',
        seccion: chat.seccion?.nombre || 'Sin sección',
        ultimo_mensaje: ultimoMensaje?.contenido,
        fecha_ultimo_mensaje: ultimoMensaje?.fecha,
        iniciadoPorAlumno: chat.id_remitente !== id_usuario_docente && otroUsuario.rol === 'estudiante',
        metadata: {
          es_chat_activo: !!ultimoMensaje,
          total_mensajes: chat.mensajes?.length || 0
        }
      };
    });
  } catch (error) {
    console.error("❌ Error al obtener chats del docente:", error);
    throw new Error(`No se pudieron obtener los chats: ${error.message}`);
  }
};


/**
 * 🟢 Obtener todos los alumnos del docente (con y sin chat) - CORREGIDO
 */
export const getAlumnosByDocente = async (id_docente, id_seccion = null) => {
  try {
    console.log('🎯 Obteniendo alumnos para docente ID:', id_docente);
    
    // ✅ PRIMERO: Obtener el id_usuario del docente
    const id_usuario_docente = await obtenerIdUsuarioDocente(id_docente);
    console.log('🔁 ID Usuario del docente:', id_usuario_docente);
    
    // 1. Obtener las secciones del docente - CORREGIDO
    const whereSecciones = {
      docentes: {
        some: { id_docente: id_docente }
      }
    };

    if (id_seccion) {
      whereSecciones.id_seccion = id_seccion;
    }

    const seccionesDocente = await prisma.seccion.findMany({
      where: whereSecciones,
      select: {
        id_seccion: true,
        nombre: true,
        estudiantes: {
          select: {
            id_estudiante: true,
            nombre: true,
            apellido: true,
            id_usuario: true,
            // ✅ CORRECCIÓN: Remover la relación usuario si no existe
            // Si necesitas el correo, obtenerlo de otra forma
          }
        },
        // ✅ AGREGAR: Obtener información de cursos
        seccionesCurso: {
          include: {
            curso: {
              select: {
                id_curso: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Secciones del docente: ${seccionesDocente.length}`);

    // 2. Obtener información de usuarios para los estudiantes - NUEVO
    const idsUsuariosEstudiantes = [];
    seccionesDocente.forEach(seccion => {
      seccion.estudiantes.forEach(estudiante => {
        if (estudiante.id_usuario) {
          idsUsuariosEstudiantes.push(estudiante.id_usuario);
        }
      });
    });

    

    const usuariosEstudiantes = await prisma.usuario.findMany({
      where: {
        id_usuario: {
          in: idsUsuariosEstudiantes
        }
      },
      select: {
        id_usuario: true,
        correo: true,
        rol: true
      }
    });

    const usuariosMap = new Map();
    usuariosEstudiantes.forEach(usuario => {
      usuariosMap.set(usuario.id_usuario, usuario);
    });

    // 3. Procesar estudiantes con información de usuario - CORREGIDO
    const todosLosEstudiantes = [];
    seccionesDocente.forEach(seccion => {
      // Obtener cursos de la sección
      const cursosSeccion = seccion.seccionesCurso.map(sc => sc.curso?.nombre).filter(Boolean);
      
      seccion.estudiantes.forEach(estudiante => {
        const usuarioInfo = usuariosMap.get(estudiante.id_usuario);
        
        todosLosEstudiantes.push({
          ...estudiante,
          seccion_nombre: seccion.nombre,
          id_seccion: seccion.id_seccion,
          usuario: usuarioInfo || { correo: 'sin-correo@ejemplo.com', rol: 'estudiante' },
          cursos: cursosSeccion.length > 0 ? cursosSeccion : ['Sin curso']
        });
      });
    });

    console.log(`📊 Total estudiantes procesados: ${todosLosEstudiantes.length}`);

    // 4. Obtener chats existentes - CORREGIDO
    const chatsExistentes = await prisma.chat.findMany({
      where: {
        OR: [
          { id_remitente: id_usuario_docente },
          { id_destinatario: id_usuario_docente },
        ]
      },
      include: {
        mensajes: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: {
            contenido: true,
            fecha: true
          }
        },
        _count: {
          select: { mensajes: true }
        }
      }
    });

    console.log(`📊 Chats existentes: ${chatsExistentes.length}`);

    // 5. Procesar la información final - CORREGIDO
    const alumnosMap = new Map();

    todosLosEstudiantes.forEach(estudiante => {
      const usuario = estudiante.usuario;
      
      alumnosMap.set(estudiante.id_estudiante, {
        id_usuario: estudiante.id_usuario,
        id_estudiante: estudiante.id_estudiante,
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
        secciones: [estudiante.seccion_nombre],
        id_seccion: estudiante.id_seccion,
        cursos: estudiante.cursos,
        tieneChat: false,
        chatExistente: null
      });
    });

    // 6. Marcar estudiantes que tienen chats activos - CORREGIDO
    chatsExistentes.forEach(chat => {
      const esRemitente = chat.id_remitente === id_usuario_docente;
      const idOtroUsuario = esRemitente ? chat.id_destinatario : chat.id_remitente;
      
      // Buscar estudiante por id_usuario
      const estudianteConChat = todosLosEstudiantes.find(est => est.id_usuario === idOtroUsuario);
      
      if (estudianteConChat && chat._count.mensajes > 0) {
        const alumno = alumnosMap.get(estudianteConChat.id_estudiante);
        if (alumno) {
          alumno.tieneChat = true;
          alumno.chatExistente = {
            id_chat: chat.id_chat,
            curso: alumno.cursos[0],
            seccion: alumno.secciones[0],
            ultimo_mensaje: chat.mensajes[0]?.contenido,
            fecha_ultimo_mensaje: chat.mensajes[0]?.fecha,
            iniciadoPorAlumno: chat.id_remitente !== id_usuario_docente,
            totalMensajes: chat._count.mensajes
          };
        }
      }
    });

    // 7. Convertir a array y ordenar
    const alumnosArray = Array.from(alumnosMap.values());
    
    // Ordenar: primero los con chat, luego por nombre
    alumnosArray.sort((a, b) => {
      if (a.tieneChat && !b.tieneChat) return -1;
      if (!a.tieneChat && b.tieneChat) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    console.log(`✅ Encontrados ${alumnosArray.length} alumnos (${alumnosArray.filter(a => a.tieneChat).length} con chat activo)`);
    
    return alumnosArray;

  } catch (error) {
    console.error("❌ Error al obtener alumnos del docente:", error);
    console.error("📋 Stack trace:", error.stack);
    throw new Error(`No se pudieron obtener los alumnos: ${error.message}`);
  }
};

// chat.service.js - ACTUALIZAR métodos de obtención
export const getMensajesByChat = async (id_chat) => {
  try {
    const mensajes = await prisma.mensaje.findMany({
      where: { id_chat: Number(id_chat) },
      orderBy: { fecha: "asc" },
      select: {
        id_mensaje: true,
        contenido: true,
        fecha: true,
        id_remitente: true,
        archivo: true,
        archivo_ruta: true,
        remitente: {
          select: { 
            id_usuario: true, 
            correo: true, 
            rol: true,
            docente: {
              select: { 
                nombre: true, 
                apellido: true,
                id_docente: true  // 🟢 AGREGAR para identificar docente
              }
            },
            estudiante: {
              select: { 
                nombre: true, 
                apellido: true,
                id_estudiante: true  // 🟢 AGREGAR para identificar estudiante
              }
            }
          }
        }
      }
    });

    // 🟢 PROCESAR ARCHIVOS MEJORADO
    return mensajes.map(mensaje => {
      // Determinar tipo de remitente
      const esDocente = !!mensaje.remitente.docente;
      const remitenteInfo = esDocente ? 
        { ...mensaje.remitente.docente, tipo: 'docente' } : 
        { ...mensaje.remitente.estudiante, tipo: 'estudiante' };

      return {
        ...mensaje,
        remitente: {
          ...mensaje.remitente,
          info: remitenteInfo
        },
        archivo: mensaje.archivo ? {
          url: mensaje.archivo,
          ruta: mensaje.archivo_ruta,
          nombre: mensaje.archivo.split('/').pop() || 'archivo',
          tipo: obtenerTipoArchivo(mensaje.archivo),
          // 🟢 AGREGAR INFORMACIÓN ADICIONAL
          puedeDescargar: true,
          esArchivo: true
        } : null
      };
    });
  } catch (error) {
    console.error("❌ Error al obtener mensajes:", error);
    throw new Error(`No se pudieron obtener los mensajes: ${error.message}`);
  }
};

/**
 * 🟢 Obtener mensajes de un chat con paginación - CORREGIDO
 */
export const getMensajesByChatPaginado = async (id_chat, pagina = 1, limite = 50) => {
  try {
    const skip = (pagina - 1) * limite;
    
    const [mensajes, totalMensajes] = await Promise.all([
      prisma.mensaje.findMany({
        where: { id_chat: Number(id_chat) },
        orderBy: { fecha: "desc" },
        skip: skip,
        take: limite,
        select: {
          id_mensaje: true,
          contenido: true,
          fecha: true,
          id_remitente: true,
          remitente: {
            select: { 
              id_usuario: true, 
              correo: true, 
              rol: true,
              // ✅ CORRECCIÓN: Usar relaciones correctas
              docente: {
                select: { nombre: true, apellido: true }
              },
              estudiante: {
                select: { nombre: true, apellido: true }
              }
            }
          }
        }
      }),
      prisma.mensaje.count({
        where: { id_chat: Number(id_chat) }
      })
    ]);
    
    // Revertir para tener los más antiguos primero
    const mensajesOrdenados = mensajes.reverse();
    
    return {
      mensajes: mensajesOrdenados,
      paginacion: {
        paginaActual: pagina,
        porPagina: limite,
        totalMensajes: totalMensajes,
        totalPaginas: Math.ceil(totalMensajes / limite),
        tieneMas: (skip + limite) < totalMensajes,
        siguientePagina: (skip + limite) < totalMensajes ? pagina + 1 : null
      }
    };
  } catch (error) {
    console.error("❌ Error al obtener mensajes paginados:", error);
    throw new Error(`No se pudieron obtener los mensajes paginados: ${error.message}`);
  }
};



/**
 * 🟢 Enviar un mensaje nuevo
 */
// En chat.service.js - CORREGIR el método enviarMensaje
export const enviarMensaje = async ({ contenido, id_chat, id_remitente, archivo = null }) => {
  try {
    // 🟢 VALIDAR QUE EL CHAT EXISTE
    const chat = await prisma.chat.findUnique({
      where: { id_chat: Number(id_chat) },
      select: { id_chat: true }
    });

    if (!chat) {
      throw new Error(`Chat con ID ${id_chat} no encontrado`);
    }

    // 🟢 CORRECCIÓN: DEFINIR LA VARIABLE hace5Segundos
    const ahora = new Date();
    const hace5Segundos = new Date(ahora.getTime() - 5000); // 🟡 ESTA LÍNEA FALTABA

    // 🟢 PROTECCIÓN CONTRA MENSAJES DUPLICADOS
    const mensajeDuplicado = await prisma.mensaje.findFirst({
      where: {
        id_chat: Number(id_chat),
        id_remitente: Number(id_remitente),
        contenido: contenido?.trim() || '',
        fecha: {
          gte: hace5Segundos // 🟡 AHORA ESTÁ DEFINIDA
        }
      }
    });

    if (mensajeDuplicado) {
      console.log('⚠️ Mensaje duplicado detectado en servicio para chat:', id_chat);
      throw new Error('Mensaje duplicado detectado');
    }
    
    // 🟢 GUARDAR EN BD
    return await prisma.mensaje.create({
      data: { 
        contenido: contenido?.trim() || '', 
        id_chat: Number(id_chat), 
        id_remitente: Number(id_remitente),
        archivo: archivo?.url || null,
        archivo_ruta: archivo?.ruta || null
      },
      select: {
        id_mensaje: true,
        contenido: true,
        fecha: true,
        id_remitente: true,
        archivo: true,
        archivo_ruta: true,
        remitente: {
          select: { 
            id_usuario: true, 
            correo: true, 
            rol: true,
            docente: { select: { nombre: true, apellido: true } },
            estudiante: { select: { nombre: true, apellido: true } }
          }
        }
      }
    });
  } catch (error) {
    console.error("❌ Error al enviar mensaje:", error);
    throw new Error(`No se pudo enviar el mensaje: ${error.message}`);
  }
};

/**
 * 🟢 Crear chat si no existe entre docente y estudiante - VERSIÓN CORREGIDA
 */
export const crearChatSiNoExiste = async (id_docente, id_estudiante, id_curso = null, id_seccion = null) => {
  try {
    console.log('🆕 Creando/obteniendo chat:', { id_docente, id_estudiante, id_curso, id_seccion });

    // 🟢 MEJORA: Validar ambos usuarios existen
    const [docente, estudiante] = await Promise.all([
      prisma.docente.findUnique({
        where: { id_docente: id_docente },
        select: { 
          id_docente: true, 
          nombre: true, 
          apellido: true, 
          id_usuario: true 
        }
      }),
      prisma.estudiante.findUnique({
        where: { id_estudiante: id_estudiante },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              correo: true
            }
          },
          seccion: {
            include: {
              seccionesCurso: {
                include: {
                  curso: {
                    select: {
                      id_curso: true,
                      nombre: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    if (!docente) {
      throw new Error(`Docente con ID ${id_docente} no encontrado`);
    }
    if (!estudiante) {
      throw new Error(`Estudiante con ID ${id_estudiante} no encontrado`);
    }

    console.log(`✅ Usuarios validados: Docente ${docente.nombre}, Estudiante ${estudiante.nombre}`);

    // Buscar chat existente
    let chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { id_remitente: docente.id_usuario, id_destinatario: estudiante.id_usuario },
          { id_remitente: estudiante.id_usuario, id_destinatario: docente.id_usuario },
        ],
      },
      include: {
        remitente: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true,
            // ✅ CORRECCIÓN: Usar relaciones correctas
            docente: { select: { nombre: true, apellido: true } },
            estudiante: { select: { nombre: true, apellido: true } }
          }
        },
        destinatario: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true,
            // ✅ CORRECCIÓN: Usar relaciones correctas
            docente: { select: { nombre: true, apellido: true } },
            estudiante: { select: { nombre: true, apellido: true } }
          }
        },
        seccion: { 
          select: { 
            id_seccion: true,
            nombre: true
          } 
        },
        mensajes: {
          orderBy: { fecha: 'asc' },
          take: 50,
          select: {
            id_mensaje: true,
            contenido: true,
            fecha: true,
            id_remitente: true,
            remitente: {
              select: { 
                id_usuario: true, 
                correo: true, 
                rol: true 
              }
            }
          }
        },
        _count: {
          select: { mensajes: true }
        }
      }
    });

    // Si no existe, crear nuevo chat
    if (!chat) {
      console.log('🆕 Creando nuevo chat...');
      
      // ✅ CORRECCIÓN: Obtener curso y sección correctamente
      const primerCurso = estudiante.seccion?.seccionesCurso[0]?.curso;
      const cursoId = id_curso || primerCurso?.id_curso || null;
      const seccionId = id_seccion || estudiante.id_seccion || null;

      console.log(`📝 Datos para nuevo chat: cursoId=${cursoId}, seccionId=${seccionId}`);

      chat = await prisma.chat.create({
        data: { 
          id_remitente: docente.id_usuario, 
          id_destinatario: estudiante.id_usuario,
          id_curso: cursoId,
          id_seccion: seccionId
        },
        include: {
          remitente: {
            select: {
              id_usuario: true,
              correo: true,
              rol: true,
              // ✅ CORRECCIÓN: Usar relaciones correctas
              docente: { select: { nombre: true, apellido: true } },
              estudiante: { select: { nombre: true, apellido: true } }
            }
          },
          destinatario: {
            select: {
              id_usuario: true,
              correo: true,
              rol: true,
              // ✅ CORRECCIÓN: Usar relaciones correctas
              docente: { select: { nombre: true, apellido: true } },
              estudiante: { select: { nombre: true, apellido: true } }
            }
          },
          seccion: { 
            select: { 
              id_seccion: true,
              nombre: true
            } 
          },
          mensajes: {
            select: {
              id_mensaje: true,
              contenido: true,
              fecha: true,
              id_remitente: true,
              remitente: {
                select: { 
                  id_usuario: true, 
                  correo: true, 
                  rol: true 
                }
              }
            }
          },
          _count: {
            select: { mensajes: true }
          }
        }
      });

      console.log(`✅ Nuevo chat creado: ${chat.id_chat}`);
    } else {
      console.log(`🔍 Chat existente encontrado: ${chat.id_chat}`);
    }

    return chat;
  } catch (error) {
    console.error("❌ Error al crear/obtener chat:", error);
    console.error("📋 Stack trace:", error.stack);
    throw new Error(`No se pudo crear/obtener el chat: ${error.message}`);
  }
};

/**
 * 🟢 Obtener chat específico entre dos usuarios
 */
export const obtenerChatEntreUsuarios = async (id_usuario1, id_usuario2) => {
  try {
    return await prisma.chat.findFirst({
      where: {
        OR: [
          { id_remitente: id_usuario1, id_destinatario: id_usuario2 },
          { id_remitente: id_usuario2, id_destinatario: id_usuario1 },
        ],
      },
      include: {
        mensajes: {
          orderBy: { fecha: 'asc' },
          take: 100,
          select: {
            id_mensaje: true,
            contenido: true,
            fecha: true,
            id_remitente: true,
            remitente: {
              select: { 
                id_usuario: true, 
                correo: true, 
                rol: true 
              }
            }
          }
        },
        curso: { select: { nombre: true } },
        seccion: { select: { nombre: true } }
      }
    });
  } catch (error) {
    console.error("❌ Error al obtener chat entre usuarios:", error);
    throw new Error(`No se pudo obtener el chat entre usuarios: ${error.message}`);
  }
};

/**
 * 🟢 Obtener secciones del docente - CORREGIDO
 */
export const getSeccionesByDocente = async (id_docente) => {
  try {
    console.log('🔍 Buscando secciones para docente ID:', id_docente);
    
    const secciones = await prisma.seccion.findMany({
      where: {
        docentes: {
          some: { id_docente: id_docente }
        }
      },
      include: {
        seccionesCurso: {
          include: {
            curso: {
              select: { 
                id_curso: true,
                nombre: true 
              }
            }
          }
        },
        docentes: {
          where: { id_docente: id_docente },
          select: {
            id_docente: true,
            nombre: true,
            apellido: true
          }
        },
        _count: {
          select: {
            estudiantes: true,
            actividades: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`📋 Secciones encontradas: ${secciones.length}`);
    
    return secciones.map(seccion => {
      const primerCurso = seccion.seccionesCurso[0]?.curso;
      
      return {
        id_seccion: seccion.id_seccion,
        nombre: seccion.nombre,
        curso: primerCurso?.nombre || 'Sin curso asignado',
        id_curso: primerCurso?.id_curso,
        cursos: seccion.seccionesCurso.map(sc => sc.curso?.nombre).filter(Boolean),
        _count: seccion._count,
        metadata: {
          tiene_curso: seccion.seccionesCurso.length > 0,
          total_cursos: seccion.seccionesCurso.length,
          total_docentes: seccion.docentes.length
        }
      };
    });
  } catch (error) {
    console.error("❌ Error al obtener secciones del docente:", error);
    throw new Error(`No se pudieron obtener las secciones: ${error.message}`);
  }
};

/**
 * 🟢 Health check del servicio - MEJORADO
 */
export const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    const [totalChats, totalMensajes, totalUsuarios] = await Promise.all([
      prisma.chat.count(),
      prisma.mensaje.count(),
      prisma.usuario.count()
    ]);
    
    return { 
      status: 'healthy', 
      database: 'connected',
      stats: {
        total_chats: totalChats,
        total_mensajes: totalMensajes,
        total_usuarios: totalUsuarios
      }
    };
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return { 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    };
  }
};

// 🟢 FUNCIÓN AUXILIAR: Verificar integridad de archivos
export const verificarArchivosMensajes = async (id_chat) => {
  try {
    const mensajes = await prisma.mensaje.findMany({
      where: { 
        id_chat: Number(id_chat),
        archivo: { not: null }
      },
      select: {
        id_mensaje: true,
        contenido: true,
        archivo: true,
        archivo_ruta: true,
        fecha: true
      }
    });

    const resultados = await Promise.all(
      mensajes.map(async (mensaje) => {
        try {
          // Verificar si el archivo existe en Supabase
          const { data, error } = await supabaseService.supabase.storage
            .from('archivos')
            .list(mensaje.archivo_ruta ? 
              mensaje.archivo_ruta.split('/').slice(0, -1).join('/') : 
              '');

          const existeEnStorage = !error && data && data.length > 0;

          return {
            id_mensaje: mensaje.id_mensaje,
            archivo_url: mensaje.archivo,
            archivo_ruta: mensaje.archivo_ruta,
            existe_en_storage: existeEnStorage,
            error: error?.message || null
          };
        } catch (error) {
          return {
            id_mensaje: mensaje.id_mensaje,
            archivo_url: mensaje.archivo,
            archivo_ruta: mensaje.archivo_ruta,
            existe_en_storage: false,
            error: error.message
          };
        }
      })
    );

    return resultados;
  } catch (error) {
    console.error("❌ Error verificando archivos:", error);
    throw error;
  }
};

/**
 * 🟢 NUEVO: Obtener estadísticas de chat para dashboard
 */
export const getEstadisticasChat = async (id_docente) => {
  try {
    const [chats, alumnos] = await Promise.all([
      getChatsByDocente(id_docente),
      getAlumnosByDocente(id_docente)
    ]);

    const alumnosConChat = alumnos.filter(a => a.tieneChat);
    const chatsActivos = chats.filter(c => c.ultimo_mensaje);
    
    return {
      total_alumnos: alumnos.length,
      alumnos_con_chat: alumnosConChat.length,
      total_chats: chats.length,
      chats_activos: chatsActivos.length,
      mensajes_totales: chats.reduce((total, chat) => total + (chat.metadata?.total_mensajes || 0), 0),
      porcentaje_cobertura: alumnos.length > 0 ? ((alumnosConChat.length / alumnos.length) * 100).toFixed(1) : 0,
      actividad_reciente: chatsActivos.length > 0 ? 
        chatsActivos.some(chat => {
          const fechaUltimo = new Date(chat.fecha_ultimo_mensaje);
          const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return fechaUltimo > hace24Horas;
        }) : false
    };
  } catch (error) {
    console.error("❌ Error al obtener estadísticas de chat:", error);
    throw new Error(`No se pudieron obtener las estadísticas: ${error.message}`);
  }
};

