// services/actividad.service.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const crear = async (datos) => {
  try {
    console.log('📝 Creando actividad con datos:', datos);
    
    // 🟢 VALIDAR que el docente tenga permiso en esta sección
    const docenteEnSeccion = await prisma.docente.findFirst({
      where: {
        id_docente: datos.id_docente,
        secciones: {
          some: {
            id_seccion: datos.id_seccion
          }
        }
      }
    });

    if (!docenteEnSeccion) {
      throw new Error('No tienes permisos para crear actividades en esta sección');
    }

    // 🟢 BUSCAR el id_curso basado en el nombre del curso
    const curso = await prisma.curso.findFirst({
      where: {
        nombre: {
          contains: datos.curso,
          mode: 'insensitive'
        }
      }
    });

    if (!curso) {
      throw new Error(`Curso "${datos.curso}" no encontrado`);
    }

    const actividad = await prisma.actividad.create({
      data: {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        tipo: datos.tipo,
        fecha_inicio: new Date(datos.fecha_inicio),
        fecha_fin: new Date(datos.fecha_fin),
        fecha_entrega: new Date(datos.fecha_entrega),
        estado: datos.estado || 'activo',
        id_curso: curso.id_curso,
        id_docente: datos.id_docente,
        id_seccion: datos.id_seccion
      },
      include: {
        curso: true,
        docente: true,
        seccion: true
      }
    });

    console.log('✅ Actividad creada:', actividad.id_actividad);
    return actividad;

  } catch (error) {
    console.error('❌ Error en servicio crear:', error);
    throw error;
  }
};

export const actualizar = async (id, datos) => {
  try {
    console.log('📝 Actualizando actividad:', id, datos);
    
    // Buscar curso si se proporciona
    let id_curso = undefined;
    if (datos.curso) {
      const curso = await prisma.curso.findFirst({
        where: {
          nombre: {
            contains: datos.curso,
            mode: 'insensitive'
          }
        }
      });
      if (curso) id_curso = curso.id_curso;
    }

    const actividad = await prisma.actividad.update({
      where: { id_actividad: id },
      data: {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        tipo: datos.tipo,
        fecha_inicio: datos.fecha_inicio ? new Date(datos.fecha_inicio) : undefined,
        fecha_fin: datos.fecha_fin ? new Date(datos.fecha_fin) : undefined,
        fecha_entrega: datos.fecha_entrega ? new Date(datos.fecha_entrega) : undefined,
        estado: datos.estado,
        ...(id_curso && { id_curso })
      },
      include: {
        curso: true,
        docente: true,
        seccion: true
      }
    });

    return actividad;
  } catch (error) {
    console.error('❌ Error en servicio actualizar:', error);
    throw error;
  }
};

export const eliminar = async (id) => {
  try {
    console.log('🗑️ Eliminando actividad:', id);
    
    const actividad = await prisma.actividad.delete({
      where: { id_actividad: id }
    });

    return actividad;
  } catch (error) {
    console.error('❌ Error en servicio eliminar:', error);
    throw error;
  }
};