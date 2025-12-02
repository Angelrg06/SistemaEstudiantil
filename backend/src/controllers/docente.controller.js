// src/controllers/docente.controller.js
import { getDocenteByUsuario } from '../services/docente.service.js';

export const getIdDocente = async (req, res) => {
    try {
        console.log("req.user:", req.user);

        if (!req.user || !req.user.id_usuario) {
            return res.status(401).json({ error: "Usuario no autenticado o token inválido" });
        }

        const id_usuario = req.user.id_usuario;
        console.log("Buscando docente con id_usuario:", id_usuario);

        const docente = await getDocenteByUsuario(id_usuario);

        if (!docente) {
            return res.status(404).json({ error: 'Docente no encontrado' });
        }

        res.json({ id_docente: docente.id_docente });
    } catch (error) {
        console.error('Error en getMiDocente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

