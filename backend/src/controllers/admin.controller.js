// backend/src/controllers/admin.controller.js

import { prisma } from '../config/db.js';

// ===============================
// CONTROLADORES DE DOCENTES
// ===============================

export const createDocente = async (req, res) => {
  try {
    const { dni, nombre, apellido, correo, password, seccionesIds } = req.body;

    // Validaciones básicas
    if (!dni || !nombre || !apellido) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const dniRegex = /^\d{8}$/;
    const nameRegex = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/;
    if (!dniRegex.test(dni)) return res.status(400).json({ error: "DNI inválido" });
    if (!nameRegex.test(nombre) || !nameRegex.test(apellido)) return res.status(400).json({ error: "Nombre o apellido inválido" });

    const capitalize = str => str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const nombreFormatted = capitalize(nombre);
    const apellidoFormatted = capitalize(apellido);

    const correoFinal = correo || `${nombre[0].toLowerCase()}${apellido[0].toLowerCase()}doc${Date.now()}@glo10oct.edu.pe`;
    const passwordFinal = password || 'Temp1234!';

    // Verificar duplicados
    const existingDNI = await prisma.docente.findUnique({ where: { dni } });
    if (existingDNI) return res.status(400).json({ error: 'DNI ya registrado' });

    const existingCorreo = await prisma.usuario.findUnique({ where: { correo: correoFinal } });
    if (existingCorreo) return res.status(400).json({ error: 'Correo ya registrado' });

    // Inicia transacción
    const docente = await prisma.$transaction(async (tx) => {
      // Crear usuario
      const usuario = await tx.usuario.create({
        data: { correo: correoFinal, password: passwordFinal, rol: 'docente' }
      });

      // Procesar secciones
      let seccionesFinal = [];
      if (seccionesIds && Array.isArray(seccionesIds)) {
        seccionesFinal = seccionesIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      }

      // Verificar que existan las secciones
      const seccionesExistentes = await tx.seccion.findMany({
        where: { id_seccion: { in: seccionesFinal } }
      });
      const seccionesValidas = seccionesExistentes.map(s => ({ id_seccion: s.id_seccion }));

      // Crear docente
      let docenteCreado = await tx.docente.create({
        data: {
          dni,
          nombre: nombreFormatted,
          apellido: apellidoFormatted,
          id_usuario: usuario.id_usuario,
          codigo: 'TEMP',
          secciones: seccionesValidas.length > 0 ? { connect: seccionesValidas } : undefined
        },
        include: { usuario: true, secciones: true }
      });

      // Generar código único
      const codigo = `DOC${String(docenteCreado.id_docente).padStart(3, '0')}`;
      docenteCreado = await tx.docente.update({
        where: { id_docente: docenteCreado.id_docente },
        data: { codigo },
        include: { usuario: true, secciones: true }
      });

      return docenteCreado;
    });

    res.status(201).json(docente);

  } catch (error) {
    console.error('Error en createDocente:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los docentes
export const getDocentes = async (req, res) => {
  try {
    const docentes = await prisma.docente.findMany({ include: { usuario: true, secciones: true } });

    res.json(docentes);
  } catch (error) {
    console.error('Error en getDocentes:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar docente
export const updateDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, dni, nombre, apellido, correo, password, secciones } = req.body;

    // Procesar secciones: convertir a números y filtrar inválidos
    let seccionesFinal = [];
    if (secciones && Array.isArray(secciones)) {
      seccionesFinal = secciones
        .map(s => parseInt(s))
        .filter(id => !isNaN(id));
    }

    // Verificar que existan las secciones en la DB
    const seccionesExistentes = await prisma.seccion.findMany({
      where: { id_seccion: { in: seccionesFinal } }
    });
    const seccionesValidas = seccionesExistentes.map(s => ({ id_seccion: s.id_seccion }));

    // Actualizar docente
    const docente = await prisma.docente.update({
      where: { id_docente: parseInt(id) },
      data: {
        codigo,
        dni,
        nombre,
        apellido,
        secciones: seccionesValidas.length > 0 ? { set: seccionesValidas } : { set: [] } // reemplaza todas las secciones
      },
      include: { usuario: true, secciones: true }
    });

    // Actualizar usuario si se envía correo o password
    const updateUsuarioData = {};
    if (correo) updateUsuarioData.correo = correo;
    if (password) updateUsuarioData.password = password;

    if (Object.keys(updateUsuarioData).length > 0) {
      await prisma.usuario.update({
        where: { id_usuario: docente.id_usuario },
        data: updateUsuarioData
      });
    }

    res.json({ message: 'Docente actualizado', docente });

  } catch (error) {
    console.error('Error en updateDocente:', error);
    res.status(500).json({ error: error.message });
  }
};



// Eliminar docente en cascada
export const deleteDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const docente = await prisma.docente.findUnique({ where: { id_docente: parseInt(id) } });
    if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });

    // Eliminar docente
    await prisma.docente.delete({ where: { id_docente: parseInt(id) } });

    // Eliminar usuario asociado
    try {
      await prisma.usuario.delete({ where: { id_usuario: docente.id_usuario } });
    } catch (err) {
      console.warn(`Usuario asociado ya eliminado o no encontrado: ${err.message}`);
    }

    res.json({ message: 'Docente eliminado correctamente' });

  } catch (error) {
    console.error('Error deleting docente:', error);
    res.status(500).json({ error: error.message });
  }
};


// ===============================
// CONTROLADORES DE ESTUDIANTES
// ===============================

const capitalizeWords = str =>
  str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const validateName = (str, maxSpaces = 2) => {
  if (!str) return false;

  const spaceCount = (str.match(/\s/g) || []).length;
  if (spaceCount > maxSpaces) return false;

  const words = str.trim().split(/\s+/);
  const nameRegex = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/;
  return words.every(w => nameRegex.test(w));
};

const validateDNI = dni => /^\d{8}$/.test(dni);

// CREATE ESTUDIANTE
export const createEstudiante = async (req, res) => {
  try {
    let { nombre, apellido, dni, correo, password, id_seccion } = req.body;

    // Validaciones
    if (!nombre || !apellido || !dni)
      return res.status(400).json({ error: 'Nombre, apellido y DNI son obligatorios' });

    if (!validateDNI(dni))
      return res.status(400).json({ error: 'DNI inválido (8 dígitos)' });

    if (!validateName(nombre))
      return res.status(400).json({ error: 'Nombre inválido (máx. 2 espacios, cada palabra con inicial mayúscula)' });

    if (!validateName(apellido))
      return res.status(400).json({ error: 'Apellido inválido (máx. 2 espacios, cada palabra con inicial mayúscula)' });

    nombre = capitalizeWords(nombre);
    apellido = capitalizeWords(apellido);

    // Verificar si correo ya existe
    if (correo) {
      const existingCorreo = await prisma.usuario.findUnique({ where: { correo } });
      if (existingCorreo)
        return res.status(400).json({ error: 'Correo ya registrado' });
    }

    // Crear usuario primero
    const usuario = await prisma.usuario.create({
      data: {
        correo: correo || `est${Date.now()}@glo10oct.edu.pe`,
        password: password || 'Temp1234!',
        rol: 'estudiante'
      }
    });

    // Crear estudiante con id_seccion
    let estudianteCreado = await prisma.estudiante.create({
      data: {
        dni,
        nombre,
        apellido,
        id_usuario: usuario.id_usuario,
        id_seccion: id_seccion ? parseInt(id_seccion) : null,
        codigo: 'TEMP'
      },
      include: { usuario: true, seccion: true }
    });

    // Generar código único basado en id_estudiante
    const codigo = `EST${String(estudianteCreado.id_estudiante).padStart(3, '0')}`;
    estudianteCreado = await prisma.estudiante.update({
      where: { id_estudiante: estudianteCreado.id_estudiante },
      data: { codigo },
      include: { usuario: true, seccion: true }
    });

    res.status(201).json(estudianteCreado);
  } catch (error) {
    console.error('Error en createEstudiante:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET ESTUDIANTES
export const getEstudiantes = async (req, res) => {
  try {
    const estudiantes = await prisma.estudiante.findMany({
      include: { usuario: true, seccion: true }
    });
    res.json(estudiantes);
  } catch (error) {
    console.error('Error en getEstudiantes:', error);
    res.status(500).json({ error: error.message });
  }
};
// UPDATE ESTUDIANTE
export const updateEstudiante = async (req, res) => {
  try {
    const { id } = req.params;
    let { nombre, apellido, dni, id_seccion, usuario } = req.body; // Recibimos usuario como objeto

    // Validaciones
    if (!nombre || !apellido || !dni)
      return res.status(400).json({ error: 'Nombre, apellido y DNI son obligatorios' });

    if (!validateDNI(dni))
      return res.status(400).json({ error: 'DNI inválido (8 dígitos)' });

    if (!validateName(nombre))
      return res.status(400).json({ error: 'Nombre inválido (máx. 2 espacios, cada palabra con inicial mayúscula)' });

    if (!validateName(apellido))
      return res.status(400).json({ error: 'Apellido inválido (máx. 2 espacios, cada palabra con inicial mayúscula)' });

    nombre = capitalizeWords(nombre);
    apellido = capitalizeWords(apellido);

    // Actualizar estudiante
    const estudiante = await prisma.estudiante.update({
      where: { id_estudiante: parseInt(id) },
      data: {
        dni,
        nombre,
        apellido,
        id_seccion: id_seccion ? parseInt(id_seccion) : null
      },
      include: { usuario: true, seccion: true }
    });

    // Actualizar usuario (correo y contraseña) si se envían
    if (usuario) {
      const updateData = {};
      if (usuario.correo && usuario.correo.trim() !== '') updateData.correo = usuario.correo.trim();
      if (usuario.password && usuario.password.trim() !== '') updateData.password = usuario.password.trim();

      if (Object.keys(updateData).length > 0) {
        await prisma.usuario.update({
          where: { id_usuario: estudiante.id_usuario },
          data: updateData
        });
      }
    }

    res.json({ message: 'Estudiante actualizado', estudiante });
  } catch (error) {
    console.error('Error en updateEstudiante:', error);
    res.status(500).json({ error: error.message });
  }
};


// DELETE ESTUDIANTE
export const deleteEstudiante = async (req, res) => {
  try {
    const { id } = req.params;

    const estudiante = await prisma.estudiante.findUnique({
      where: { id_estudiante: parseInt(id) }
    });

    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    await prisma.estudiante.delete({ where: { id_estudiante: parseInt(id) } });
    await prisma.usuario.delete({ where: { id_usuario: estudiante.id_usuario } });

    res.json({ message: 'Estudiante eliminado correctamente' });
  } catch (error) {
    console.error('Error en deleteEstudiante:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // Contar registros en paralelo para mejor rendimiento
    const [docentes, estudiantes, secciones, bimestres] = await Promise.all([
      prisma.docente.count(),
      prisma.estudiante.count(),
      prisma.seccion.count(),
      prisma.bimestre.count()
    ]);

    // Contar administradores desde la tabla Usuario con rol 'admin'
    const administradores = await prisma.usuario.count({
      where: { rol: 'admin' }
    });

    res.json({
      docentes,
      estudiantes,
      administradores,
      secciones,
      bimestres
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({ error: error.message });
  }
};


export const getSecciones = async (req, res) => {
  try {
    const secciones = await prisma.seccion.findMany(); // todas las secciones
    res.json(secciones);
  } catch (error) {
    console.error('Error cargando secciones', error);
    res.status(500).json({ error: 'Error cargando secciones' });
  }
};
// backend/src/controllers/admin.controller.js
export const asignarSeccionesADocente = async (req, res) => {
  try {
    const { id_docente } = req.params;
    let { seccionesIds } = req.body; // array de IDs de secciones

    if (!Array.isArray(seccionesIds)) {
      return res.status(400).json({ error: 'Debe enviar un array de IDs de secciones' });
    }

    // Convertir a números y filtrar inválidos
    seccionesIds = seccionesIds.map(id => parseInt(id)).filter(id => !isNaN(id));

    // Verificar que existan las secciones en la DB
    const seccionesExistentes = await prisma.seccion.findMany({
      where: { id_seccion: { in: seccionesIds } }
    });
    const seccionesValidas = seccionesExistentes.map(s => ({ id_seccion: s.id_seccion }));

    // Actualizar docente con secciones válidas
    const docenteActualizado = await prisma.docente.update({
      where: { id_docente: parseInt(id_docente) },
      data: {
        secciones: seccionesValidas.length > 0 ? { set: seccionesValidas } : { set: [] }
      },
      include: { secciones: true }
    });

    res.json({ message: 'Secciones asignadas correctamente', docente: docenteActualizado });

  } catch (error) {
    console.error('Error asignando secciones:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===============================
// CONTROLADORES DE SECCIONES
// ===============================

// Crear sección
export const createSeccion = async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === "")
      return res.status(400).json({ error: "El nombre es obligatorio" });

    const seccion = await prisma.seccion.create({
      data: { nombre }
    });

    res.status(201).json(seccion);
  } catch (error) {
    console.error("Error creando sección:", error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar sección
export const updateSeccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    const seccion = await prisma.seccion.update({
      where: { id_seccion: parseInt(id) },
      data: { nombre }
    });

    res.json(seccion);
  } catch (error) {
    console.error("Error actualizando sección:", error);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar sección
export const deleteSeccion = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.seccion.delete({
      where: { id_seccion: parseInt(id) }
    });

    res.json({ message: "Sección eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando sección:", error);
    res.status(500).json({ error: error.message });
  }
};

// backend/src/controllers/admin.controller.js
// Agrega estos métodos

// 🟢 OBTENER TODOS LOS CURSOS
export const getCursos = async (req, res) => {
  try {
    const cursos = await prisma.curso.findMany({
      include: {
        seccionesCurso: {
          include: {
            seccion: {
              include: {
                bimestre: true
              }
            }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    // Formatear la respuesta
    const cursosFormateados = cursos.map(curso => ({
      id_curso: curso.id_curso,
      nombre: curso.nombre,
      descripcion: curso.descripcion || '',
      secciones: curso.seccionesCurso.map(sc => ({
        id_seccion: sc.seccion.id_seccion,
        nombre: sc.seccion.nombre,
        bimestre: sc.seccion.bimestre
      }))
    }));

    res.json(cursosFormateados);

  } catch (error) {
    console.error('Error en getCursos:', error);
    res.status(500).json({ error: error.message });
  }
};

// backend/src/controllers/admin.controller.js

// 🟢 CREAR NUEVO CURSO (SIN DESCRIPCIÓN)
export const createCurso = async (req, res) => {
  try {
    const { nombre, seccionesIds = [] } = req.body; // Remover descripcion

    console.log('📝 Creando curso:', { nombre, seccionesIds });

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'El nombre del curso es obligatorio'
      });
    }

    // Verificar si ya existe
    const cursoExistente = await prisma.curso.findFirst({
      where: {
        nombre: {
          equals: nombre.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (cursoExistente) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un curso con ese nombre'
      });
    }

    const curso = await prisma.$transaction(async (tx) => {
      // Crear curso SIN descripcion
      const cursoCreado = await tx.curso.create({
        data: {
          nombre: nombre.trim()
          // NO incluir descripcion
        }
      });

      // Asignar secciones
      if (Array.isArray(seccionesIds) && seccionesIds.length > 0) {
        const idsNumericos = seccionesIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id) && id > 0);

        if (idsNumericos.length > 0) {
          for (const idSeccion of idsNumericos) {
            await tx.seccionCurso.create({
              data: {
                id_seccion: idSeccion,
                id_curso: cursoCreado.id_curso
              }
            });
          }
        }
      }

      return await tx.curso.findUnique({
        where: { id_curso: cursoCreado.id_curso },
        include: {
          seccionesCurso: {
            include: {
              seccion: {
                include: { bimestre: true }
              }
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Curso creado exitosamente',
      data: curso
    });

  } catch (error) {
    console.error('❌ Error en createCurso:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🟢 ACTUALIZAR CURSO (SIN DESCRIPCIÓN)
export const updateCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, seccionesIds = [] } = req.body; // Remover descripcion

    console.log('✏️ Actualizando curso ID:', id, { nombre, seccionesIds });

    const idCurso = parseInt(id);
    if (isNaN(idCurso)) {
      return res.status(400).json({
        success: false,
        error: 'ID de curso inválido'
      });
    }

    // Verificar que existe
    const cursoExistente = await prisma.curso.findUnique({
      where: { id_curso: idCurso }
    });

    if (!cursoExistente) {
      return res.status(404).json({
        success: false,
        error: 'Curso no encontrado'
      });
    }

    const curso = await prisma.$transaction(async (tx) => {
      // Actualizar datos SIN descripcion
      const cursoActualizado = await tx.curso.update({
        where: { id_curso: idCurso },
        data: {
          nombre: nombre ? nombre.trim() : cursoExistente.nombre
          // NO incluir descripcion
        }
      });

      // Actualizar secciones
      if (Array.isArray(seccionesIds)) {
        // Eliminar relaciones existentes
        await tx.seccionCurso.deleteMany({
          where: { id_curso: idCurso }
        });

        // Crear nuevas
        const idsNumericos = seccionesIds
          .map(id => parseInt(id))
          .filter(id => !isNaN(id) && id > 0);

        if (idsNumericos.length > 0) {
          for (const idSeccion of idsNumericos) {
            await tx.seccionCurso.create({
              data: {
                id_seccion: idSeccion,
                id_curso: idCurso
              }
            });
          }
        }
      }

      return await tx.curso.findUnique({
        where: { id_curso: idCurso },
        include: {
          seccionesCurso: {
            include: {
              seccion: {
                include: { bimestre: true }
              }
            }
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'Curso actualizado exitosamente',
      data: curso
    });

  } catch (error) {
    console.error('❌ Error en updateCurso:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🟢 ELIMINAR CURSO (CON VERIFICACIÓN DE RELACIONES)
export const deleteCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const idCurso = parseInt(id);

    console.log('🗑️ Intentando eliminar curso ID:', idCurso);

    if (isNaN(idCurso)) {
      return res.status(400).json({
        success: false,
        error: 'ID de curso inválido'
      });
    }

    // Verificar que existe
    const cursoExistente = await prisma.curso.findUnique({
      where: { id_curso: idCurso },
      include: {
        actividades: {
          select: { id_actividad: true },
          take: 1 // Solo necesitamos saber si hay alguna
        },
        chats: {
          select: { id_chat: true },
          take: 1
        }
      }
    });

    if (!cursoExistente) {
      return res.status(404).json({
        success: false,
        error: 'Curso no encontrado'
      });
    }

    // Verificar si tiene relaciones que impidan la eliminación
    if (cursoExistente.actividades.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el curso porque tiene actividades asignadas. Primero elimine las actividades relacionadas.'
      });
    }

    if (cursoExistente.chats.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el curso porque tiene chats asociados.'
      });
    }

    // Primero eliminar relaciones en seccionesCurso (si existen)
    await prisma.seccionCurso.deleteMany({
      where: { id_curso: idCurso }
    });

    // Luego eliminar el curso
    await prisma.curso.delete({
      where: { id_curso: idCurso }
    });

    res.json({
      success: true,
      message: 'Curso eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en deleteCurso:', error);

    // Manejar error de restricción de clave foránea
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar el curso porque tiene elementos relacionados (actividades, chats, etc.). Elimine primero los elementos relacionados.'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};