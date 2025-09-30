import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getDocenteByUsuario = async (id_usuario) => {
    return await prisma.docente.findFirst({
        where: { id_usuario },
        select: { id_docente: true }
    })
}