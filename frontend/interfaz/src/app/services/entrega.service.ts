import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class EntregasService {

    private apiUrl = 'http://localhost:4000/api/entregas';

    constructor(private http: HttpClient) { }

    //Método para subir entrega con archivo
    subirEntrega(archivo: File, idActividad: number, comentario?: string): Observable<any> {

        // FormData es una clase de JavaScript que permite enviar archivos
        // mediante peticiones HTTP
        const formData = new FormData();

        //Construir FormData
        formData.append('archivo', archivo); //Archivo
        formData.append('id_actividad', idActividad.toString()); //ID Actividad
        if (comentario) formData.append('comentario', comentario); 

        //Verificar archivo e id
        console.log('Enviando archivo:', archivo.name);
        console.log('ID Actividad:', idActividad);

        //Obtener token de autenticación
        const token = localStorage.getItem('token');

        // Enviar petición POST
        return this.http.post(`${this.apiUrl}/subir`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`
                //IMPORTANTE: NO agregar 'Content-Type'
                //FormData establece automáticamente 'multipart/form-data'
            }
        });
    }

    //Método para descargar archivo
    descargarArchivo(rutaArchivo: string): Observable<any> {
        const token = localStorage.getItem('token');

        return this.http.get(`${this.apiUrl}/descargar/${rutaArchivo}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }
}