import { getEstudianteByUsuario } from '../services/estudiante.service.js';

export const getIdEstudiante = async (req, res) => {

    try {
        console.log("req.user:", req.user);

        if (!req.user || !req.user.id_usuario) {
            return res.status(401).json({ error: "Usuario no autenticado o token inválido" });
        }

        const id_usuario = req.user.id_usuario;
        console.log("Buscando estudiante con id_usuario:", id_usuario);

        const estudiante = await getEstudianteByUsuario(id_usuario);

        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        res.json({ id_estudiante: estudiante.id_estudiante });
    } catch (error) {
        console.error('Error en getMiEstudiante:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }

}

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getCursosByEstudiante = async (req, res) => {

    try {
        const id_estudiante = parseInt(req.params.id);

        const estudiante = await prisma.estudiante.findUnique({
            where: { id_estudiante },
            select: {
                id_estudiante: true,
                seccion: {
                    select: {
                        id_seccion: true,
                        curso: {
                            select: {
                                id_curso: true,
                                nombre: true,
                            }
                        }
                    }
                }
            }
        });

        if (!estudiante) {
            return res.status(404).json({ error: "Estudiante no encontrado" });
        }

        if (!estudiante.seccion || !estudiante.seccion.curso) {
            return res.json([]);
        }

        const resultado = [
            {
                id_estudiante: estudiante.id_estudiante,
                id_seccion: estudiante.seccion?.id_seccion,
                id_curso: estudiante.seccion?.curso?.id_curso,
                curso: estudiante.seccion?.curso?.nombre,
            }
        ];

        res.json(resultado);
    } catch (error) {
        console.error("Error al obtener cursos:", error);
        res.status(500).json({ error: "Error al obtener cursos" });
    }

}

export const getDatosEstudiantes = async (req, res) => {

    try {
        const id_estudiante = parseInt(req.params.id);

        const datos = await prisma.estudiante.findUnique({
            where: { id_estudiante },
            select: {
                codigo: true,
                dni: true,
                nombre: true,
                apellido: true,
                usuario: {
                    select: {
                        correo: true
                    }
                }
            }
        });

        const formato = [
            {
                correo: datos.usuario?.correo,
                codigo: datos.codigo,
                dni: datos.dni,
                nombre: datos.nombre,
                apellido: datos.apellido
            }
        ]

        res.json(formato);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error al obtener datos" });
    }

}