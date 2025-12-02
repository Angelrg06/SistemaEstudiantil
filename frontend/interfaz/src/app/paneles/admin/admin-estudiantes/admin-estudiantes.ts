import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-admin-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-estudiantes.html',
  styleUrls: ['./admin-estudiantes.css']
})
export class AdminEstudiantes implements OnInit {
  estudiantes: any[] = [];
  estudiantesFiltrados: any[] = [];
  selectedEstudiante: any = null;
  isEditing = false;
  showModal = false;
  secciones: any[] = [];

  // Filtros y paginación
  searchTerm: string = '';
  selectedSeccion: string = '';
  paginaActual: number = 1;
  registrosPorPagina: number = 10;
  totalPaginas: number = 1;

  errors: any = {};
  mostrarPassword: boolean = false;
  loading: boolean = false;
  successMessage: string = '';
  highlightedEstudianteId: number | null = null;

  seccionesDisponibles: any[] = [];
  seccionSeleccionada: number | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadEstudiantes();
    this.adminService.getSecciones().subscribe({
      next: (data) => this.seccionesDisponibles = data
    });
  }

  loadEstudiantes() {
    this.adminService.getEstudiantes().subscribe({
      next: (data) => {
        this.estudiantes = data;
        this.aplicarFiltros();
      },
      error: (err) => console.error('Error loading estudiantes:', err)
    });
  }


  exportarPDF() {
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.setFontSize(16);
    doc.text('Listado de Estudiantes', 40, 30);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 400, 30);

    const columns = ['Código', 'DNI', 'Nombre', 'Apellido', 'Sección'];
    const rows = this.estudiantesFiltrados.map(e => [
      e.codigo, e.dni, e.nombre, e.apellido, e.seccion?.nombre || '-'
    ]);

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [22, 119, 255] },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 }
    });

    doc.save('estudiantes.pdf');
  }

  // FILTROS Y PAGINACIÓN
  aplicarFiltros() {
    let filtrados = [...this.estudiantes];

    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(e =>
        e.codigo.toLowerCase().includes(termino) ||
        e.dni.toLowerCase().includes(termino) ||
        e.nombre.toLowerCase().includes(termino) ||
        e.apellido.toLowerCase().includes(termino) ||
        (e.usuario?.correo && e.usuario.correo.toLowerCase().includes(termino))
      );
    }

    if (this.selectedSeccion.trim() !== '') {
      filtrados = filtrados.filter(e =>
        e.seccion?.nombre === this.selectedSeccion
      );
    }

    this.totalPaginas = Math.ceil(filtrados.length / this.registrosPorPagina) || 1;
    if (this.paginaActual > this.totalPaginas) this.paginaActual = this.totalPaginas;

    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    this.estudiantesFiltrados = filtrados.slice(inicio, inicio + this.registrosPorPagina);
  }

  buscarEstudiantes() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  filtrarPorSeccion() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  paginaAnterior() {
    if (this.paginaActual > 1) { this.paginaActual--; this.aplicarFiltros(); }
  }

  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) { this.paginaActual++; this.aplicarFiltros(); }
  }

  filasVacias(): number[] {
    return new Array(Math.max(0, this.registrosPorPagina - this.estudiantesFiltrados.length)).fill(0);
  }
  openModal(estudiante?: any) {
    this.isEditing = !!estudiante;

    if (estudiante) {
      this.selectedEstudiante = JSON.parse(JSON.stringify(estudiante));

      // Solo la primera sección
      this.seccionSeleccionada = estudiante.seccion?.id_seccion || null;
    } else {
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      const generatedEmail = `est${randomNum}@glo10oct.edu.pe`;

      this.selectedEstudiante = {
        codigo: '',
        dni: '',
        nombre: '',
        apellido: '',
        usuario: { correo: generatedEmail, password: '', rol: 'estudiante' }
      };

      this.seccionSeleccionada = null;
    }

    this.errors = {};
    this.showModal = true;
    this.loading = false;
  }


  closeModal() {
    this.showModal = false;
    this.selectedEstudiante = null;
    this.errors = {};
    this.loading = false;
  }

  resetModal() {
    this.selectedEstudiante = {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      id_seccion: null,
      usuario: { correo: '', password: '', rol: 'estudiante' }
    };
    this.isEditing = false;
    this.errors = {};
    this.successMessage = '';
  }

  // VALIDACIÓN
  validateEstudiante(): boolean {
    this.errors = {};
    const { dni, nombre, apellido, usuario, id_seccion } = this.selectedEstudiante;

    if (!/^\d{8}$/.test(dni)) this.errors.dni = '* DNI inválido';

    const nameRegex = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/;
    const maxWords = 3;
    const nombreWords = nombre?.trim().split(/\s+/) || [];
    if (nombreWords.length > maxWords || !nombreWords.every((w: string) => nameRegex.test(w))) {
      this.errors.nombre = '* Nombre inválido';
    }

    const apellidoWords = apellido?.trim().split(/\s+/) || [];
    if (apellidoWords.length > maxWords || !apellidoWords.every((w: string) => nameRegex.test(w))) {
      this.errors.apellido = '* Apellido inválido';
    }


if (!this.seccionSeleccionada || !this.seccionesDisponibles.find(s => s.id_seccion === this.seccionSeleccionada)) {
  this.errors.id_seccion = '* Sección inválida';
}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!usuario?.correo || !emailRegex.test(usuario.correo)) this.errors.correo = '* Correo inválido';

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!this.isEditing && (!usuario?.password || !passRegex.test(usuario.password))) this.errors.password = '* Contraseña inválida';

    const isValid = Object.keys(this.errors).length === 0;

    if (!isValid) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.text-red-600');
        if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }

    return isValid;
  }

  // GUARDAR ESTUDIANTE
  saveEstudiante() {
    if (!this.selectedEstudiante || this.loading) return;
    if (!this.validateEstudiante()) return;

    this.loading = true;
    const { usuario, ...estudianteData } = this.selectedEstudiante;

    const request$ = this.isEditing
      ? this.adminService.updateEstudiante(this.selectedEstudiante.id_estudiante, {
        ...estudianteData,
        correo: usuario.correo,
        password: usuario.password,
        id_seccion: this.seccionSeleccionada // 👈 solo una
      })
      : this.adminService.createEstudiante({
        ...estudianteData,
        correo: usuario.correo,
        password: usuario.password,
        id_seccion: this.seccionSeleccionada // 👈 solo una
      });

    request$.subscribe({
      next: () => {
        this.loadEstudiantes();
        this.successMessage = this.isEditing
          ? 'Estudiante actualizado correctamente ✅'
          : 'Estudiante registrado correctamente ✅';

        setTimeout(() => {
          this.closeModal();
          this.loading = false;
          this.successMessage = '';
        }, 1500);
      },
      error: (err) => {
        console.error('Error estudiante:', err);
        this.loading = false;
        if (err?.error?.error) {
          const msg = err.error.error.toLowerCase();
          if (msg.includes('dni')) this.errors.dni = '* ' + err.error.error;
          else if (msg.includes('correo')) this.errors.correo = '* ' + err.error.error;
          else if (msg.includes('codigo')) this.errors.codigo = '* ' + err.error.error;
          else this.successMessage = err.error.error;
        } else {
          this.successMessage = 'Ocurrió un error inesperado';
        }
      }
    });
  }


  deleteEstudiante(id: number) {
    if (!confirm('¿Está seguro de eliminar este estudiante?')) return;
    this.adminService.deleteEstudiante(id).subscribe({
      next: () => this.loadEstudiantes(),
      error: (err) => console.error('Error deleting estudiante:', err)
    });
  }
  onDniInput() {
    if (this.selectedEstudiante?.dni) this.selectedEstudiante.dni = this.selectedEstudiante.dni.replace(/\D/g, '');
  }
  // Solo números en DNI
  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (!/[0-9]/.test(key) && key !== 'Backspace' && key !== 'ArrowLeft' && key !== 'ArrowRight') {
      event.preventDefault();
    }
  }
}
