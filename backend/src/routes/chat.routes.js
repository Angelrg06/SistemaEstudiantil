import express from "express";
import {
  // Controladores unificados
  obtenerChatsDocente,
  obtenerAlumnosDocente,
  obtenerSeccionesDocente,
  obtenerMensajes,
  enviarMensaje,
  obtenerChatEntreUsuarios,
  crearChat,
  healthCheck,
  obtenerEstadisticasChat,
  uploadMensaje,
  descargarArchivoMensaje,
  
  // Controladores para estudiantes (ahora en el mismo archivo)
  obtenerChatsEstudiante,
  obtenerDocentesParaChat,
  obtenerCursosEstudiante,
  obtenerCompanerosCurso,
  crearChatEntreEstudiantes,
  diagnosticarArchivos
} from "../controllers/chat.controller.js"; // ✅ Todos en un solo archivo

const router = express.Router();

// 🟢 Health check del servicio
router.get("/health", healthCheck);

// ==============================================
// 🎯 RUTAS PARA DOCENTES
// ==============================================

// 🟢 Obtener todos los chats del docente
router.get("/docente/:id/chats", obtenerChatsDocente);

// 🟢 Obtener estadísticas de chat del docente
router.get("/docente/:id/estadisticas", obtenerEstadisticasChat);

// 🟢 Obtener todas las secciones del docente (para filtros en chat)
router.get("/docente/:id/secciones", obtenerSeccionesDocente);

// 🟢 Obtener todos los alumnos del docente (con y sin chat)
router.get("/docente/:id/alumnos", obtenerAlumnosDocente);

// ==============================================
// 🎯 RUTAS PARA ESTUDIANTES
// ==============================================

// 🟢 Obtener chats del estudiante
router.get("/estudiante/:id/chats", obtenerChatsEstudiante);

// 🟢 Obtener docentes disponibles para chat
router.get("/estudiante/:id/docentes", obtenerDocentesParaChat);

// 🟢 Obtener cursos del estudiante
router.get("/estudiante/:id/cursos", obtenerCursosEstudiante);

// 🟢 Obtener compañeros de curso
router.get("/estudiante/:id/curso/:id_curso/companeros", obtenerCompanerosCurso);

// ==============================================
// 🎯 RUTAS COMPARTIDAS
// ==============================================

// 🟢 Obtener chat entre dos usuarios específicos
router.get("/usuarios/:id_usuario1/:id_usuario2", obtenerChatEntreUsuarios);

// 🟢 Obtener mensajes de un chat (con paginación opcional)
router.get("/mensajes/:id_chat", obtenerMensajes);

// 🟢 Enviar mensaje
router.post("/enviar", uploadMensaje, enviarMensaje);

// 🟢 Crear chat docente-estudiante
router.post("/crear", crearChat);

// 🟢 Crear chat entre estudiantes
router.post("/estudiantes/crear", crearChatEntreEstudiantes);

// 🟢 Descargar archivo de mensaje
router.get("/archivo/descargar/:ruta", descargarArchivoMensaje);

// Agregar esta ruta
router.get("/diagnostico/archivos/:id_chat", diagnosticarArchivos);

export default router;