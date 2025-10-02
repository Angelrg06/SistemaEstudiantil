import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

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
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;

  mostrarPassword: boolean = false;
  loading: boolean = false;
successMessage: string = '';
highlightedDocenteId: number | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadDocentes();
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
      // Copia profunda para evitar referencias
      this.selectedDocente = JSON.parse(JSON.stringify(docente));
    } else {
      // Nuevo docente: inicializar todos los campos
      this.selectedDocente = {
        codigo: '',
        dni: '',
        nombre: '',
        apellido: '',
        usuario: { correo: '', password: '', rol: 'docente' }
      };
    }

    this.errors = {};
    this.showModal = true;
    this.loading = false; // aseguramos que no bloquee
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

  if (this.isEditing) {
    // Editar docente existente
    this.adminService.updateDocente(this.selectedDocente.id_docente, {
      ...docenteData,
      correo: usuario.correo,
      password: usuario.password
    }).subscribe({
      next: () => {
        this.loadDocentes();  // refresca la tabla
        this.successMessage = 'Docente actualizado correctamente ✅';

        // Dejamos que el usuario vea el mensaje un momento
        setTimeout(() => {
          this.showModal = false;       // cierra modal
          this.successMessage = '';     // limpia mensaje
          this.resetModal();            // limpia campos
          this.loading = false;         // desbloquea botones
        }, 1500); // 1.5 segundos
      },
      error: (err) => {
        console.error('Error updating docente:', err);
        this.loading = false; // desbloquea botones
        if (err?.error?.error) {
          const msg = err.error.error.toLowerCase();
          if (msg.includes('dni')) this.errors.dni = '* ' + err.error.error;
          else if (msg.includes('correo')) this.errors.correo = '* ' + err.error.error;
          else if (msg.includes('codigo')) this.errors.codigo = '* ' + err.error.error;
          else this.successMessage = err.error.error; // mostramos mensaje en modal
        } else this.successMessage = 'Ocurrió un error inesperado';
      }
    });
  } else {
    // Crear nuevo docente
    this.adminService.createDocente({
      ...docenteData,
      correo: usuario.correo,
      password: usuario.password
    }).subscribe({
      next: () => {
        this.loadDocentes();
        this.resetModal();               // limpio campos para otro registro
        this.successMessage = 'Docente registrado correctamente ✅';
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Error creating docente:', err);
        this.loading = false;
        if (err?.error?.error) {
          const msg = err.error.error.toLowerCase();
          if (msg.includes('dni')) this.errors.dni = '* ' + err.error.error;
          else if (msg.includes('correo')) this.errors.correo = '* ' + err.error.error;
          else if (msg.includes('codigo')) this.errors.codigo = '* ' + err.error.error;
          else alert(err.error.error);
        } else alert('Ocurrió un error inesperado');
      }
    });
  }
}



  deleteDocente(id: number) {
    if (!confirm('¿Está seguro de eliminar este docente?')) return;

    this.adminService.deleteDocente(id).subscribe({
      next: () => this.loadDocentes(),
      error: (err) => console.error('Error deleting docente:', err)
    });
  }

}