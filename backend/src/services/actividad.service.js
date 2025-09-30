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
        return await prisma.actividad.delete({
            where: { id_actividad: numId }
        });
    } catch (error) {
        console.error("❌ Error en eliminar service:", error.code, error.message);
        throw error;
    }
}