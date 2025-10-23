import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:4000/api/chat';

  constructor(private http: HttpClient) {}

  // 🟢 MANEJO DE ERRORES CENTRALIZADO
  private handleError(error: any) {
    console.error('❌ Error en ChatService:', error);
    
    let errorMessage = 'Error desconocido en el servicio de chat';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.status === 0) {
        errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
      } else if (error.status === 401) {
        errorMessage = 'No autorizado. Por favor, inicie sesión nuevamente.';
        // Limpiar datos de autenticación
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado.';
      } else if (error.status === 500) {
        errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
    }
    
    console.error('💥 Mensaje de error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Obtener todos los alumnos del docente (con y sin chat)
  obtenerAlumnosDocente(id_docente: number): Observable<any> {
    console.log('📞 Llamando a obtenerAlumnosDocente con ID:', id_docente);
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }
    
    return this.http.get(`${this.apiUrl}/docente/${id_docente}/alumnos`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🟢 Obtener secciones del docente
  obtenerSeccionesDocente(id_docente: number): Observable<any> {
    console.log('📞 Llamando a obtenerSeccionesDocente con ID:', id_docente);
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }
    
    return this.http.get(`${this.apiUrl}/docente/${id_docente}/secciones`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🟢 Obtener alumnos filtrados por sección
  obtenerAlumnosPorSeccion(id_docente: number, id_seccion: number): Observable<any> {
    console.log('📞 Llamando a obtenerAlumnosPorSeccion:', { id_docente, id_seccion });
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }
    
    let params = new HttpParams();
    if (id_seccion) {
      params = params.set('id_seccion', id_seccion.toString());
    }
    
    return this.http.get(`${this.apiUrl}/docente/${id_docente}/alumnos`, { params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Obtener mensajes de un chat con paginación
  obtenerMensajes(id_chat: number, pagina: number = 1, limite: number = 50): Observable<any> {
    console.log('📞 Llamando a obtenerMensajes:', { id_chat, pagina, limite });
    
    if (!id_chat || isNaN(id_chat)) {
      const error = new Error('ID de chat inválido');
      return throwError(() => error);
    }
    
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());
    
    return this.http.get(`${this.apiUrl}/mensajes/${id_chat}`, { params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Enviar mensaje
  enviarMensaje(mensaje: any): Observable<any> {
    console.log('📞 Llamando a enviarMensaje:', mensaje);
    
    // Validaciones antes de enviar
    if (!mensaje?.contenido?.trim()) {
      const error = new Error('El contenido del mensaje no puede estar vacío');
      return throwError(() => error);
    }
    
    if (!mensaje.id_chat || !mensaje.id_remitente) {
      const error = new Error('Datos incompletos para enviar mensaje');
      return throwError(() => error);
    }
    
    return this.http.post(`${this.apiUrl}/enviar`, mensaje).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🟢 Crear chat - ACTUALIZADO para usar id_estudiante
  crearChat(data: any): Observable<any> {
    console.log('📞 Llamando a crearChat con datos:', data);
    
    // 🟢 VALIDACIÓN: Asegurar que tenemos los datos necesarios
    if (!data.id_docente || !data.id_estudiante) {
      console.error('❌ Datos incompletos para crear chat:', data);
      const error = new Error('Datos incompletos: se requiere id_docente e id_estudiante');
      return throwError(() => error);
    }

    // 🟢 PREPARAR datos para el backend
    const chatData = {
      id_docente: data.id_docente,
      id_estudiante: data.id_estudiante,
      id_curso: data.id_curso || null,
      id_seccion: data.id_seccion || null
    };

    console.log('📤 Enviando datos de chat al backend:', chatData);
    
    return this.http.post(`${this.apiUrl}/crear`, chatData).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Health check del servicio
  healthCheck(): Observable<any> {
    console.log('📞 Llamando a healthCheck');
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🟢 Obtener chat entre dos usuarios específicos
  obtenerChatEntreUsuarios(id_usuario1: number, id_usuario2: number): Observable<any> {
    console.log('📞 Llamando a obtenerChatEntreUsuarios:', { id_usuario1, id_usuario2 });
    
    if (!id_usuario1 || !id_usuario2 || isNaN(id_usuario1) || isNaN(id_usuario2)) {
      const error = new Error('IDs de usuario inválidos');
      return throwError(() => error);
    }
    
    return this.http.get(`${this.apiUrl}/usuarios/${id_usuario1}/${id_usuario2}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🟢 Obtener todos los chats del docente
  obtenerChatsDocente(id_docente: number): Observable<any> {
    console.log('📞 Llamando a obtenerChatsDocente:', id_docente);
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }
    
    return this.http.get(`${this.apiUrl}/docente/${id_docente}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🟢 NUEVO: Método para verificar conexión con el backend
  verificarConexion(): Observable<boolean> {
    return new Observable(observer => {
      this.healthCheck().subscribe({
        next: (response) => {
          console.log('✅ Conexión con backend exitosa:', response);
          observer.next(true);
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error de conexión con backend:', error);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}