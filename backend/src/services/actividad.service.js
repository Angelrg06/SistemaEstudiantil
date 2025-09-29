import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

//CREAR
export const crear = async (data) => {
    return await prisma.actividad.create({ data });
};

//ACTUALIZAR 
export const actualizar = async (id, data) => {
    return await prisma.actividad.update({
        where: { id_actividad: id },
        data,
    });
}

//ELIMINAR
export const eliminar = async (id) => {

    try {
        const numId = parseInt(id);

        // Buscar todas las entregas de esa actividad
        const entregas = await prisma.entrega.findMany({
            where: { id_actividad: numId },
            select: { id_entrega: true }
        });

        const entregaIds = entregas.map(e => e.id_entrega);

        // Borrar retroalimentaciones de esas entregas
        await prisma.retroalimentacion.deleteMany({
            where: { id_entrega: { in: entregaIds } }
        });

        // Borrar notificaciones de esas entregas
        await prisma.notificacion.deleteMany({
            where: { id_entrega: { in: entregaIds } }
        });

        // Borrar entregas
        await prisma.entrega.deleteMany({
            where: { id_actividad: numId }
        });

        // Ahora sí borrar la actividad
        return await prisma.actividad.delete({
            where: { id_actividad: numId }
        });
    } catch (error) {
        console.error("❌ Error en eliminar service:", error.code, error.message);
        throw error;
    }
}