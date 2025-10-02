// backend/src/controllers/admin.controller.js

import { prisma } from '../config/db.js';

// ===============================
// CONTROLADORES DE DOCENTES
// ===============================
export const createDocente = async (req, res) => {
  try {
    const { dni, nombre, apellido, correo, password } = req.body;

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

    const docente = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: { correo: correoFinal, password: passwordFinal, rol: 'docente' }
      });

      let docenteCreado = await tx.docente.create({
        data: { 
          dni, 
          nombre: nombreFormatted, 
          apellido: apellidoFormatted, 
          id_usuario: usuario.id_usuario,
          codigo: 'TEMP' // obligatorio temporal
        }
      });

      // Generar código único basado en id_docente
      const codigo = `DOC${String(docenteCreado.id_docente).padStart(3,'0')}`;
      docenteCreado = await tx.docente.update({
        where: { id_docente: docenteCreado.id_docente },
        data: { codigo },
        include: { usuario: true }
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
    const docentes = await prisma.docente.findMany({ include: { usuario: true } });
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
    const { codigo, dni, nombre, apellido, correo, password } = req.body;

    const docente = await prisma.docente.update({
      where: { id_docente: parseInt(id) },
      data: { codigo, dni, nombre, apellido },
      include: { usuario: true }
    });

    // Actualizar correo y contraseña del usuario asociado
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
export const createEstudiante = async (req, res) => {
  try {
    const { codigo, dni, nombre, apellido, correo, password, id_seccion } = req.body;

    // Crear usuario primero
    const usuario = await prisma.usuario.create({
      data: {
        correo,
        password,
        rol: 'estudiante'
      }
    });

    // Crear estudiante
    const estudiante = await prisma.estudiante.create({
      data: {
        codigo,
        dni,
        nombre,
        apellido,
        id_usuario: usuario.id_usuario,
        id_seccion: id_seccion ? parseInt(id_seccion) : null
      },
      include: { usuario: true, seccion: true }
    });

    res.status(201).json(estudiante);
  } catch (error) {
    console.error('Error en createEstudiante:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

export const getEstudiantes = async (req, res) => {
  try {
    const estudiantes = await prisma.estudiante.findMany({
      include: { usuario: true, seccion: true }
    });
    res.json(estudiantes);
  } catch (error) {
    console.error('Error en getEstudiantes:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};


// ===============================
// CONTROLADORES DE SECCIONES
// ===============================
export const getSecciones = async (req, res) => {
  try {
    const secciones = await prisma.seccion.findMany();
    res.json(secciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createSeccion = async (req, res) => {
  try {
    const { nombre } = req.body;
    const seccion = await prisma.seccion.create({
      data: { nombre }
    });
    res.status(201).json(seccion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===============================
// CONTROLADORES DE NOTIFICACIONES
// ===============================
export const createNotificacion = async (req, res) => {
  try {
    const { mensaje, tipo, id_destinatario, tipo_destinatario } = req.body;
    
    const notificacion = await prisma.notificacion.create({
      data: {
        mensaje,
        tipo,
        fecha_envio: new Date(),
      }
    });
    
    res.status(201).json(notificacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNotificaciones = async (req, res) => {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      orderBy: { fecha_envio: 'desc' }
    });
    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===============================
// ESTADÍSTICAS DEL DASHBOARD
// ===============================
export const getDashboardStats = async (req, res) => {
  try {
    const docentes = await prisma.docente.count();
    const estudiantes = await prisma.estudiante.count();
    const notificaciones = await prisma.notificacion.count();
    const actividades = await prisma.actividad.count();

    res.json({ docentes, estudiantes, notificaciones, actividades });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ===============================
// ACTUALIZAR ESTUDIANTE
// ===============================
export const updateEstudiante = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, dni, nombre, apellido, correo, id_seccion } = req.body;

    // Actualizar estudiante
    const estudiante = await prisma.estudiante.update({
      where: { id_estudiante: parseInt(id) },
      data: {
        codigo,
        dni,
        nombre,
        apellido,
        id_seccion: id_seccion ? parseInt(id_seccion) : null
      },
      include: { usuario: true }
    });

    // Actualizar correo del usuario asociado
    if (correo) {
      await prisma.usuario.update({
        where: { id_usuario: estudiante.id_usuario },
        data: { correo }
      });
    }

    res.json({ message: 'Estudiante actualizado', estudiante });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===============================
// ELIMINAR ESTUDIANTE
// ===============================
export const deleteEstudiante = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero obtener el estudiante
    const estudiante = await prisma.estudiante.findUnique({
      where: { id_estudiante: parseInt(id) }
    });

    if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });

    // Eliminar estudiante
    await prisma.estudiante.delete({
      where: { id_estudiante: parseInt(id) }
    });

    // Eliminar usuario asociado
    await prisma.usuario.delete({
      where: { id_usuario: estudiante.id_usuario }
    });

    res.json({ message: 'Estudiante eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};