import express from "express";
import {
  obtenerChatsDocente,
  obtenerAlumnosDocente,
  obtenerSeccionesDocente,
  obtenerMensajes,
  enviarMensaje,
  obtenerChatEntreUsuarios,
  crearChat,
  healthCheck,
  obtenerEstadisticasChat,
  uploadMensaje, // 🆕 NUEVO
  descargarArchivoMensaje, // 🆕 NUEVO
  obtenerCursosEstudiante, // 🆕 AGREGAR ESTA IMPORTACIÓN
  obtenerCompanerosCurso, // 🆕 AGREGAR ESTA IMPORTACIÓN
  crearChatEntreEstudiantes
} from "../controllers/chat.controller.js"; // ✅ Correcto

import {
  obtenerChatsEstudiante,
  obtenerDocentesParaChat
} from "../controllers/chatEstudiante.controller.js";

const router = express.Router();

// 🟢 Health check del servicio
router.get("/health", healthCheck);

// 🟢 Obtener todos los chats del docente
router.get("/docente/:id", obtenerChatsDocente);

// 🆕 NUEVAS RUTAS PARA ESTUDIANTES
router.get("/estudiante/:id/chats", obtenerChatsEstudiante);

router.get("/estudiante/:id/docentes", obtenerDocentesParaChat);

// 🟢 Obtener estadísticas de chat del docente
router.get("/docente/:id/estadisticas", obtenerEstadisticasChat);

// 🟢 Obtener todas las secciones del docente (para filtros en chat)
router.get("/docente/:id/secciones", obtenerSeccionesDocente);

// 🟢 Obtener todos los alumnos del docente (con y sin chat)
router.get("/docente/:id/alumnos", obtenerAlumnosDocente);

router.get("/estudiante/:id/cursos", obtenerCursosEstudiante);

router.get("/estudiante/:id/curso/:id_curso/companeros", obtenerCompanerosCurso);

// 🟢 Obtener chat entre dos usuarios específicos
router.get("/usuarios/:id_usuario1/:id_usuario2", obtenerChatEntreUsuarios);

// 🟢 Obtener mensajes de un chat (con paginación opcional)
router.get("/mensajes/:id_chat", obtenerMensajes);

// 🟢 Enviar mensaje
router.post("/enviar", uploadMensaje, enviarMensaje); // ✅ ACTUALIZADA

// 🟢 Crear chat si no existe
router.post("/crear", crearChat);

// 🆕 NUEVA RUTA: Crear chat entre estudiantes
router.post("/estudiantes/crear", crearChatEntreEstudiantes);

// 🟢 Descargar el archivo
router.get("/archivo/descargar/:ruta", descargarArchivoMensaje); // 🆕 NUEVA

export default router;