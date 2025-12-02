import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-docentes.html',
  styleUrls: ['./admin-docentes.css']
})
export class AdminDocentes implements OnInit {
  docentes: any[] = [];
  docentesFiltrados: any[] = [];
  selectedDocente: any = null;
  isEditing = false;
  showModal = false;
  errors: any = {};
  // Variables para filtros y paginación
  searchTerm: string = '';
  selectedDepartamento: string = '';
  paginaActual: number = 1;
  registrosPorPagina: number = 10;
  totalPaginas: number = 1;

  mostrarPassword: boolean = false;
  loading: boolean = false;
successMessage: string = '';
highlightedDocenteId: number | null = null;

seccionesDisponibles: any[] = [];
seccionesSeleccionadas: number[] = [];


  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadDocentes();
    this.adminService.getSecciones().subscribe({
    next: (data) => this.seccionesDisponibles = data
  });
  }

  loadDocentes() {
    this.adminService.getDocentes().subscribe({
      next: (data) => {
        this.docentes = data;
        this.aplicarFiltros();
      },
      error: (error) => {
        console.error('Error loading docentes:', error);
      }
    });
  }

  toggleSeccion(id: number) {
  if (this.seccionesSeleccionadas.includes(id)) {
    this.seccionesSeleccionadas =
      this.seccionesSeleccionadas.filter(s => s !== id);
  } else {
    this.seccionesSeleccionadas = [...this.seccionesSeleccionadas, id];
  }
}

  // Lógica de filtros
  aplicarFiltros() {
    let filtrados = [...this.docentes];

    // Buscar por código, DNI, nombre, apellido o correo
    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(d =>
        d.codigo.toLowerCase().includes(termino) ||
        d.dni.toLowerCase().includes(termino) ||
        d.nombre.toLowerCase().includes(termino) ||
        d.apellido.toLowerCase().includes(termino) ||
        (d.usuario?.correo && d.usuario.correo.toLowerCase().includes(termino))
      );
    }

    // Filtrar por departamento
    if (this.selectedDepartamento.trim() !== '') {
      filtrados = filtrados.filter(d =>
        d.departamento === this.selectedDepartamento
      );
    }

    // Calcular paginación
    this.totalPaginas = Math.ceil(filtrados.length / this.registrosPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = this.totalPaginas;
    }

    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    this.docentesFiltrados = filtrados.slice(inicio, fin);
  }

  // Métodos de filtro
  buscarDocentes() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  filtrarPorDepartamento() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  // Navegación de páginas
  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.aplicarFiltros();
    }
  }

  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
      this.aplicarFiltros();
    }
  }

  // Filas vacías para altura fija
  filasVacias(): number[] {
    const usuariosEnPagina = this.docentesFiltrados.length;
    const filasVaciasCount = Math.max(0, this.registrosPorPagina - usuariosEnPagina);
    return new Array(filasVaciasCount).fill(0);
  }

openModal(docente?: any) {
  this.isEditing = !!docente;

 if (docente) {
  this.selectedDocente = JSON.parse(JSON.stringify(docente));

  // Poblamos las secciones existentes
  if (Array.isArray(docente.secciones)) {
    this.seccionesSeleccionadas = docente.secciones.map((s: any) => s.id_seccion);
  } else if (Array.isArray(docente.docenteSecciones)) {
    this.seccionesSeleccionadas = docente.docenteSecciones.map((ds: any) => ds.id_seccion);
  } else if (Array.isArray(docente.seccionesIds)) {
    this.seccionesSeleccionadas = [...docente.seccionesIds];
  } else {
    this.seccionesSeleccionadas = [];
  }
  } else {
    // NUEVO DOCENTE
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    const generatedEmail = `doc${randomNum}@glo10oct.edu.pe`;

    this.selectedDocente = {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      usuario: { correo: generatedEmail, password: '', rol: 'docente' }
    };

    this.seccionesSeleccionadas = [];
  }

  this.errors = {};
  this.showModal = true;
  this.loading = false;
}


onChangeSecciones(event: Event) {
  const select = event.target as HTMLSelectElement;

  this.seccionesSeleccionadas = Array.from(select.selectedOptions)
    .map(opt => Number(opt.value));

  console.log("Secciones seleccionadas:", this.seccionesSeleccionadas);
}

  closeModal() {
    this.showModal = false;
    this.selectedDocente = null; // opcional, o puedes llamar resetModal() aquí
    this.errors = {};
    this.loading = false;
  }

  resetModal() {
    this.selectedDocente = {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      usuario: { correo: '', password: '', rol: 'docente' }
    };
    this.isEditing = false;
    this.errors = {};
  }

 validateFields(): boolean {
  this.errors = {};
  const { dni, nombre, apellido, usuario } = this.selectedDocente;

  if (!/^\d{8}$/.test(dni)) this.errors.dni = '* DNI inválido';
  const nameRegex = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/;
  if (!nameRegex.test(nombre)) this.errors.nombre = '* Nombre inválido';
  if (!nameRegex.test(apellido)) this.errors.apellido = '* Apellido inválido';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!usuario?.correo || !emailRegex.test(usuario.correo)) this.errors.correo = '* Correo inválido';

  const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!this.isEditing && (!usuario?.password || !passRegex.test(usuario.password)))
    this.errors.password = '* Contraseña inválida';

  const isValid = Object.keys(this.errors).length === 0;

  if (!isValid) {
    // Hace scroll al primer error visible
    setTimeout(() => {
      const firstErrorEl = document.querySelector('.text-red-600');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 0);
  }

  return isValid;
}

 saveDocente() {
  if (!this.validateFields() || this.loading) return;

  this.loading = true;  // bloquea botones

  const { usuario, ...docenteData } = this.selectedDocente;

 const request$ = this.isEditing
  ? this.adminService.updateDocente(this.selectedDocente.id_docente, {
      ...docenteData,
      correo: usuario.correo,
      password: usuario.password,
       secciones: this.seccionesSeleccionadas 
    })
  : this.adminService.createDocente({
      ...docenteData,
      correo: usuario.correo,
      password: usuario.password,
      seccionesIds: this.seccionesSeleccionadas    // 👈 AQUI TAMBIÉN
    });


  request$.subscribe({
    next: () => {
      this.loadDocentes();
      this.successMessage = this.isEditing
        ? 'Docente actualizado correctamente ✅'
        : 'Docente registrado correctamente ✅';

      // ANIMACIÓN idéntica a estudiantes
      setTimeout(() => {
        this.closeModal();      // cierra modal y resetea campos
        this.loading = false;   // desbloquea botones
        this.successMessage = ''; // limpia mensaje
      }, 1500); // 1.5 segundos
    },
    error: (err) => {
      console.error('Error docente:', err);
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

exportarPDF() {
  const doc = new jsPDF('p', 'pt', 'a4'); // orientación vertical, tamaño A4

  // Encabezado del PDF
  doc.setFontSize(16);
  doc.text('Listado de Docentes', 40, 30);
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 400, 30);

  // Columnas y datos
  const columns = ['Código', 'DNI', 'Nombre', 'Apellido'];
  const rows = this.docentesFiltrados.map(d => [
    d.codigo,
    d.dni,
    d.nombre,
    d.apellido
  ]);

  // Genera la tabla
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 50,
    theme: 'grid',
    headStyles: { fillColor: [22, 119, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  });

  // Guardar PDF
  doc.save('docentes.pdf');
}


  deleteDocente(id: number) {
    if (!confirm('¿Está seguro de eliminar este docente?')) return;

    this.adminService.deleteDocente(id).subscribe({
      next: () => this.loadDocentes(),
      error: (err) => console.error('Error deleting docente:', err)
    });
  }
// ✅ NUEVO MÉTODO: permite solo números en DNI
  allowOnlyNumbers(event: KeyboardEvent) {
    const key = event.key;
    if (!/[0-9]/.test(key) && key !== 'Backspace' && key !== 'ArrowLeft' && key !== 'ArrowRight') {
      event.preventDefault();
    }
  }
}