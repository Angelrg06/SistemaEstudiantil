import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getEstudianteByUsuario = async (id_usuario) => {
    return await prisma.Estudiante.findFirst({
        where: { id_usuario },
        select: { id_estudiante: true }
    })
}