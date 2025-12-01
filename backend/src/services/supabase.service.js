// supabase.service.js - VERSIÓN MEJORADA
import { createClient } from '@supabase/supabase-js';

class SupabaseService {
    constructor() {
        // 🟢 VERIFICACIÓN MEJORADA DE VARIABLES
        const supabaseUrl = process.env.SUPABASE_URL?.trim();
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.trim();

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ ERROR: Faltan variables de Supabase');
            console.log('URL:', supabaseUrl || 'NO CONFIGURADA');
            console.log('Key:', supabaseKey ? 'CONFIGURADA' : 'NO CONFIGURADA');
            throw new Error('Configuración de Supabase incompleta');
        }

        // 🟢 CONFIGURACIÓN MEJORADA
        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: {
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        });

        console.log('✅ Supabase configurado correctamente');
        console.log('🔗 URL:', supabaseUrl);
    }

    

    // 🟢 MÉTODO PARA VERIFICAR CONEXIÓN
    async verificarConexion() {
        try {
            console.log('🔍 Verificando conexión con Supabase...');
            const { data, error } = await this.supabase.storage.listBuckets();
            
            if (error) {
                console.error('❌ Error de conexión Supabase:', error.message);
                return false;
            }
            
            console.log('✅ Conexión a Supabase exitosa');
            console.log('📦 Buckets disponibles:', data.length);
            return true;
        } catch (error) {
            console.error('💥 Error crítico verificando conexión:', error.message);
            return false;
        }
    }

    // 🔧 FUNCIÓN MEJORADA PARA LIMPIAR NOMBRES DE ARCHIVO
    sanitizarNombreArchivo(nombreArchivo) {
        const nombreLimpio = nombreArchivo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\s+/g, '_')
            .toLowerCase();
        
        console.log(`🔧 Nombre sanitizado: ${nombreArchivo} → ${nombreLimpio}`);
        return nombreLimpio;
    }

    // 🟢 MÉTODO MEJORADO PARA SUBIR ARCHIVOS
    async subirArchivo(archivoBuffer, nombreArchivo, carpeta, tipoMime) {
        try {
            console.log(`📤 Iniciando upload: ${nombreArchivo} a carpeta: ${carpeta}`);

            // 🟢 VERIFICAR CONEXIÓN PRIMERO
            const conexionOk = await this.verificarConexion();
            if (!conexionOk) {
                throw new Error('No se pudo conectar a Supabase Storage');
            }

            // Sanitizar nombre
            const nombreLimpio = this.sanitizarNombreArchivo(nombreArchivo);
            const rutaArchivo = `${carpeta}/${Date.now()}_${nombreLimpio}`;

            console.log(`🔄 Subiendo archivo a: ${rutaArchivo}`);

            // 🟢 SUBIR ARCHIVO CON MÁS OPCIONES
            const { data, error } = await this.supabase.storage
                .from('archivos')
                .upload(rutaArchivo, archivoBuffer, {
                    contentType: tipoMime,
                    upsert: false,
                    cacheControl: '3600'
                });

            if (error) {
                console.error('❌ Error subiendo a Supabase:', error);
                throw error;
            }

            // 🟢 OBTENER URL PÚBLICA
            const { data: urlData } = this.supabase.storage
                .from('archivos')
                .getPublicUrl(rutaArchivo);

            console.log('✅ Archivo subido exitosamente:', urlData.publicUrl);

            return {
                ruta: rutaArchivo,
                url: urlData.publicUrl,
                nombre: nombreLimpio,
                tipo: tipoMime,
                tamano: archivoBuffer.length
            };

        } catch (error) {
            console.error('💥 Error en subirArchivo:', error.message);
            throw error;
        }
    }

    // 🟢 MÉTODO DE DIAGNÓSTICO MEJORADO
async diagnosticarUpload(archivoBuffer, nombreArchivo, carpeta, tipoMime) {
  console.log('🔍 DIAGNÓSTICO UPLOAD:', {
    nombreArchivo,
    carpeta,
    tipoMime,
    tamanoBuffer: archivoBuffer?.length || 0,
    esBuffer: Buffer.isBuffer(archivoBuffer),
    variablesConfiguradas: {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_SERVICE_KEY
    }
  });

  // Verificar conexión
  const conexionOk = await this.verificarConexion();
  if (!conexionOk) {
    throw new Error('No se pudo conectar a Supabase Storage');
  }

  // Verificar bucket
  const { data: buckets, error: bucketsError } = await this.supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Error listando buckets:', bucketsError);
    throw new Error(`Error de buckets: ${bucketsError.message}`);
  }

  const bucketExiste = buckets.some(bucket => bucket.name === 'archivos');
  console.log('📦 Bucket "archivos" existe:', bucketExiste);
  
  if (!bucketExiste) {
    throw new Error('El bucket "archivos" no existe en Supabase');
  }

  return true;
}

    // 🟢 NUEVO MÉTODO: ELIMINAR ARCHIVO
    async eliminarArchivo(rutaArchivo) {
        try {
            const { data, error } = await this.supabase.storage
                .from('archivos')
                .remove([rutaArchivo]);

            if (error) {
                console.error('❌ Error eliminando archivo:', error);
                return false;
            }

            console.log('✅ Archivo eliminado:', rutaArchivo);
            return true;
        } catch (error) {
            console.error('💥 Error eliminando archivo:', error);
            return false;
        }
    }
}

//Exportamos una INSTANCIA única del servicio (patrón Singleton)
//Así todas las partes del backend usan la misma conexióm
export default new SupabaseService();