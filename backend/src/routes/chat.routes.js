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
  obtenerEstadisticasChat
} from "../controllers/chat.controller.js"; // ✅ Correcto

const router = express.Router();

// 🟢 Health check del servicio
router.get("/health", healthCheck);

// 🟢 Obtener todos los chats del docente
router.get("/docente/:id", obtenerChatsDocente);

// 🟢 Obtener estadísticas de chat del docente
router.get("/docente/:id/estadisticas", obtenerEstadisticasChat);

// 🟢 Obtener todas las secciones del docente (para filtros en chat)
router.get("/docente/:id/secciones", obtenerSeccionesDocente);

// 🟢 Obtener todos los alumnos del docente (con y sin chat)
router.get("/docente/:id/alumnos", obtenerAlumnosDocente);

// 🟢 Obtener chat entre dos usuarios específicos
router.get("/usuarios/:id_usuario1/:id_usuario2", obtenerChatEntreUsuarios);

// 🟢 Obtener mensajes de un chat (con paginación opcional)
router.get("/mensajes/:id_chat", obtenerMensajes);

// 🟢 Enviar mensaje
router.post("/enviar", enviarMensaje);

// 🟢 Crear chat si no existe
router.post("/crear", crearChat);

export default router;