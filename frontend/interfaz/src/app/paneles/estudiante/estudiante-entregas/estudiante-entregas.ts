// estudiante-entregas.ts - VERSION CORREGIDA
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EntregasService } from '../../../services/entrega.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-estudiante-entregas',
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule, RouterLink],
  templateUrl: './estudiante-entregas.html',
  styleUrls: ['./estudiante-entregas.css']
})
export class EstudianteEntregas implements OnInit {
  showUserMenu = false;
  id_estudiante_logueado: number = 0;
  datos: any[] = [];
  actividades: any[] = [];
  actividad: any[] = [];
  id_curso!: number;
  modalAbierto = false;
  actividadSeleccionada: number | null = null;

  // ✅ AGREGAR: Información de intentos
  infoIntentos: any = {
    max_intentos: 3,
    intento_actual: 1,
    intentos_disponibles: 3
  };

  entregasRealizadas: any[] = [];

  archivoSeleccionado: File | null = null;
  comentario: string = '';
  subiendo: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private entregaService: EntregasService
  ) { }

  ngOnInit(): void {
    this.id_curso = Number(this.route.snapshot.paramMap.get('id'));
    console.log('📚 Curso ID:', this.id_curso);
    this.getIdEstudiante();
    this.getActividades();
    this.getMisEntregas();
  }

  // ✅ CORREGIDO: Obtener entregas con nuevo servicio
  getMisEntregas(): void {
    this.entregaService.getMisEntregas(this.id_curso).subscribe({
      next: (response) => {
        this.entregasRealizadas = response.data || [];
        console.log("📦 Mis entregas:", this.entregasRealizadas.length);
      },
      error: (err) => {
        console.error("❌ Error obteniendo mis entregas:", err);
        // Si el endpoint no existe, usar alternativa
        this.getMisEntregasAlternativo();
      }
    });
  }

  // ✅ ALTERNATIVO: Si el endpoint no existe
  private getMisEntregasAlternativo(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/mis-entregas/${this.id_curso}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.entregasRealizadas = response.data || [];
        console.log("📦 Mis entregas (alternativo):", this.entregasRealizadas);
      },
      error: (err) => {
        console.warn("⚠️ No se pudieron obtener las entregas");
        this.entregasRealizadas = [];
      }
    });
  }

  // ✅ MEJORADO: Descargar entrega
  descargarMiEntrega(entrega: any): void {
    if (!entrega.archivo) {
      alert('❌ No hay archivo disponible para descargar');
      return;
    }

    console.log('📥 Descargando entrega:', entrega.archivo);

    // Verificar si es una URL de Supabase
    if (entrega.archivo.includes('supabase.co')) {
      // URL directa de Supabase
      const link = document.createElement('a');
      link.href = entrega.archivo;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Extraer nombre de archivo
      const nombreArchivo = entrega.archivo.split('/').pop() || 
                           `entrega_${entrega.id_entrega}.pdf`;
      link.download = nombreArchivo;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (entrega.archivo_ruta) {
      // Usar el servicio de descarga
      this.entregaService.descargarArchivo(entrega.archivo_ruta).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = entrega.archivo || `entrega_${entrega.id_entrega}`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('❌ Error descargando archivo:', err);
          alert('Error al descargar el archivo');
        }
      });
    } else {
      alert('❌ No se puede descargar esta entrega');
    }
  }

  // ✅ MEJORADO: Abrir modal con verificación de intentos
  abrirModal(idActividad: number) {
    this.actividadSeleccionada = idActividad;
    
    // Verificar intentos antes de abrir
    this.verificarIntentosActividad(idActividad);
    
    const actividadEncontrada = this.actividades.find(a => a.id_actividad === idActividad);
    if (actividadEncontrada) {
      this.actividad = [actividadEncontrada];
      console.log('📋 Actividad seleccionada:', actividadEncontrada);
    }

    this.getDatosActividadIDCurso(idActividad);
  }

  // ✅ NUEVO: Verificar intentos disponibles
  verificarIntentosActividad(idActividad: number): void {
    this.entregaService.verificarIntentos(idActividad).subscribe({
      next: (response) => {
        if (response.success) {
          this.infoIntentos = response.data;
          console.log('✅ Intentos disponibles:', this.infoIntentos);
          
          if (this.infoIntentos.intentos_disponibles <= 0) {
            alert('❌ Has alcanzado el máximo de intentos para esta actividad');
            return;
          }
          
          this.modalAbierto = true;
        }
      },
      error: (err) => {
        console.warn('⚠️ No se pudo verificar intentos:', err);
        // Abrir modal igualmente
        this.modalAbierto = true;
      }
    });
  }

  cerrarModal() {
    this.actividadSeleccionada = null;
    this.modalAbierto = false;
    this.limpiarFormulario();
  }

  // ✅ CORREGIDO: Validación de archivo
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      // Validar tamaño (10MB máximo)
      const maxSize = 10 * 1024 * 1024;
      
      if (file.size > maxSize) {
        alert('El archivo es demasiado grande. Máximo 10MB.');
        event.target.value = ''; // Limpiar input
        return;
      }

      // Validar tipo de archivo
      const tiposPermitidos = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'application/zip',
        'application/x-rar-compressed'
      ];
      
      if (!tiposPermitidos.includes(file.type)) {
        alert('Tipo de archivo no permitido. Use PDF, Word, imágenes o archivos comprimidos.');
        event.target.value = '';
        return;
      }

      this.archivoSeleccionado = file;
      console.log('✅ Archivo válido:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }

  removerArchivo(): void {
    this.archivoSeleccionado = null;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    console.log('🗑️ Archivo removido');
  }

  // ✅ MEJORADO: Enviar entrega con mejor manejo de errores
  enviarEntrega(): void {
    if (!this.archivoSeleccionado) {
      alert('Por favor selecciona un archivo');
      return;
    }

    if (!this.actividadSeleccionada) {
      alert('Error: No hay actividad seleccionada');
      return;
    }

    // Verificar intentos nuevamente
    if (this.infoIntentos.intentos_disponibles <= 0) {
      alert('❌ No tienes intentos disponibles para esta actividad');
      return;
    }

    this.subiendo = true;
    console.log('🚀 Enviando entrega...');

    this.entregaService.subirEntrega(
      this.archivoSeleccionado,
      this.actividadSeleccionada,
      this.comentario
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta del servidor:', response);

        if (response.success) {
          alert('¡✅ Entrega enviada correctamente!');
          this.limpiarFormulario();
          this.cerrarModal();
          
          // Recargar datos
          this.getActividades();
          this.getMisEntregas();
          
          // Actualizar contador de intentos
          this.infoIntentos.intento_actual++;
          this.infoIntentos.intentos_disponibles--;
        } else {
          alert('❌ Error: ' + (response.error || response.message || 'Error desconocido'));
        }

        this.subiendo = false;
      },
      error: (error) => {
        console.error('❌ Error en la petición:', error);
        
        let mensajeError = 'Error al enviar la entrega';
        
        if (error.status === 400) {
          mensajeError = error.error?.error || 'Datos incorrectos';
        } else if (error.status === 403) {
          mensajeError = 'No tienes permisos para realizar esta acción';
        } else if (error.status === 404) {
          mensajeError = 'Actividad no encontrada';
        } else if (error.status === 500) {
          mensajeError = 'Error del servidor. Intenta más tarde.';
        }
        
        alert('❌ ' + mensajeError);
        this.subiendo = false;
      }
    });
  }

  private limpiarFormulario(): void {
    this.archivoSeleccionado = null;
    this.comentario = '';
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // ✅ RESTANTE DEL CÓDIGO (igual que antes)
  getIdEstudiante(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>('http://localhost:4000/api/estudiante/mi-estudiante', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log("📌 ID Estudiante:", data);
        this.id_estudiante_logueado = data.id_estudiante;
        this.getDatos();
      },
      error: (err) => {
        console.error("❌ Error obteniendo id_estudiante", err);
      }
    })
  }

  getDatos(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/datos/${this.id_estudiante_logueado}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.datos = data;
        console.log("👤 Datos del estudiante:", data);
      },
      error: (err) => console.error("Error obteniendo datos:", err)
    });
  }

  getActividades(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/entregas/${this.id_curso}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.actividades = response.data || [];
        console.log("📚 Actividades cargadas:", this.actividades.length);
      },
      error: (err) => console.error("Error obteniendo actividad:", err)
    });
  }

  getDatosActividadIDCurso(id: number): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/actividades/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
     next: (response) => {
  const actividadData = response.data || response;
  this.actividad = Array.isArray(actividadData) ? actividadData : [actividadData];
  console.log("📝 Detalles de la actividad:", this.actividad);
},
      error: (err) => console.error("Error obteniendo datos:", err)
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }
}