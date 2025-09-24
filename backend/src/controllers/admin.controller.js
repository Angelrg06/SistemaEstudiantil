// backend/src/controllers/admin.controller.js

import { prisma } from '../config/db.js';

// ===============================
// CONTROLADORES DE DOCENTES
// ===============================
export const createDocente = async (req, res) => {
  try {
    const { codigo, dni, nombre, apellido, correo, password } = req.body;
    
    // Crear usuario primero
    const usuario = await prisma.usuario.create({
      data: {
        correo,
        password: password,
        rol: 'docente'
      }
    });
    
    // Crear docente
    const docente = await prisma.docente.create({
      data: {
        codigo,
        dni,
        nombre,
        apellido,
        id_usuario: usuario.id_usuario
      },
      include: { usuario: true }
    });
    
    res.status(201).json(docente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDocentes = async (req, res) => {
  try {
    const docentes = await prisma.docente.findMany({
      include: { usuario: true }
    });
    res.json(docentes);
  } catch (error) {
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
        password: password,
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
      include: { 
        usuario: true,
        seccion: true 
      }
    });
    
    res.status(201).json(estudiante);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEstudiantes = async (req, res) => {
  try {
    const estudiantes = await prisma.estudiante.findMany({
      include: { 
        usuario: true,
        seccion: true 
      }
    });
    res.json(estudiantes);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
// ACTUALIZAR DOCENTE
// ===============================
export const updateDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, dni, nombre, apellido, correo } = req.body;

    // Actualizar docente
    const docente = await prisma.docente.update({
      where: { id_docente: parseInt(id) },
      data: { codigo, dni, nombre, apellido },
      include: { usuario: true }
    });

    // Actualizar correo del usuario asociado
    if (correo) {
      await prisma.usuario.update({
        where: { id_usuario: docente.id_usuario },
        data: { correo }
      });
    }

    res.json({ message: 'Docente actualizado', docente });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===============================
// ELIMINAR DOCENTE
// ===============================
export const deleteDocente = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero obtener el docente para conocer el usuario asociado
    const docente = await prisma.docente.findUnique({
      where: { id_docente: parseInt(id) }
    });

    if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });

    // Eliminar docente
    await prisma.docente.delete({
      where: { id_docente: parseInt(id) }
    });

    // Eliminar usuario asociado
    await prisma.usuario.delete({
      where: { id_usuario: docente.id_usuario }
    });

    res.json({ message: 'Docente eliminado correctamente' });
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




