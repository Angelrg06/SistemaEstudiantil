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
// ===============================
// CONTROLADORES DE SECCIONES
// ===============================
// Obtener todas las secciones
export const getSecciones = async (req, res) => {
  try {
    const secciones = await prisma.seccion.findMany({
      orderBy: { nombre: 'asc' } // opcional: ordenarlas por nombre
    });
    res.status(200).json(secciones);
  } catch (error) {
    console.error('Error al obtener secciones:', error);
    res.status(500).json({ error: error.message });
  }
};

// Crear nueva sección
export const createSeccion = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const seccion = await prisma.seccion.create({
      data: { nombre }
    });

    res.status(201).json(seccion);
  } catch (error) {
    console.error('Error al crear sección:', error);
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

