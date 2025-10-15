//Importamos el Supabase
import { createClient } from '@supabase/supabase-js';

//El createClient permite conectarnos a Supabase

class SupabaseService {

    constructor() {
        //Creamos el cliente de Supabase, pasamos la URL del proyecto y la clave privada que estan en el .env
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        //Confirmamos que la configuración es correcta
        console.log('Supabase configurado correctamente');
    }

    // 🔧 FUNCIÓN PARA LIMPIAR NOMBRES DE ARCHIVO
    sanitizarNombreArchivo(nombreArchivo) {
        // Remover caracteres especiales y espacios
        return nombreArchivo
            .normalize('NFD') // Separar acentos
            .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
            .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales con _
            .replace(/\s+/g, '_') // Reemplazar espacios con _
            .toLowerCase(); // Convertir a minúsculas
    }

    //Creamos el método para subir el archivo al Supabase
    async subirArchivo(archivoBuffer, nombreArchivo, carpeta, tipoMine) {

        //Usamos Try-Catch en caso de errores
        try {

            //Console.log solo para confirmar el archivo y el destino a donde subiremos el archivo
            console.log(`Subiendo archivo: ${nombreArchivo} a carpeta: ${carpeta}`);

            //SANITIZAR EL NOMBRE DEL ARCHIVO
            const nombreLimpio = this.sanitizarNombreArchivo(nombreArchivo);
            console.log(`🔧 Nombre sanitizado: ${nombreArchivo} → ${nombreLimpio}`);

            //Creamos una ruta única para evitar sobreescribir archivos
            const rutaArchivo = `${carpeta}/${Date.now()}_${nombreLimpio}`;

            //Subir el archivo
            const { data, error } = await this.supabase.storage.
                from('archivos'). //Nombre del bucket
                upload(rutaArchivo, archivoBuffer, {
                    contentType: tipoMine, //Tipo de archivo que se subirá
                    upsert: false //No sobreescribir si existe
                });

            //Manejo de errores
            if (error) {
                console.error('Error al subir a Supabase: ', error);
                throw error;
            }

            //Obtener URL pública para descargar
            const { data: urlData } = this.supabase.storage
                .from('archivos') //Nombre del bucket
                .getPublicUrl(rutaArchivo);

            //Confirmación de subida de archivo y la URL
            console.log('Archivo subido con exito: ', urlData.publicUrl);

            return {
                ruta: rutaArchivo, //Ruta interna en Supabase
                url: urlData.publicUrl, //URL pública
                nombre: nombreLimpio //Nombre del archivo
            }

        } catch (error) {
            console.error('Error en subirArchivo', error);
            throw error;
        }

    }

}

//Exportamos una INSTANCIA única del servicio (patrón Singleton)
//Así todas las partes del backend usan la misma conexióm
export default new SupabaseService();