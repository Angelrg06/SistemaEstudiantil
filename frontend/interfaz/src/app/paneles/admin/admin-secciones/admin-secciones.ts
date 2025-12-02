/*import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';

@Component({
  selector: 'app-admin-secciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-secciones.html',
  styleUrls: ['./admin-secciones.css']
})
export class AdminSecciones implements OnInit {
  secciones: any[] = [];
  seccionesFiltradas: any[] = [];
  seccionActual: any = { id_seccion: 0, nombre: '', bimestres: [], siguienteLetra: '' };

  modalVisible = false;
  editMode = false;
  loading = false;
  successMessage = '';
  errorMessage = '';
  searchTerm = '';

  paginaActual = 1;
  registrosPorPagina = 5;
  totalPaginas = 1;
  highlightedSeccionId: number | null = null;

  errors: any = {};

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadSecciones();
  }

  // ==================
  // CARGAR DATOS
  // ==================
  loadSecciones() {
    this.adminService.getSeccionesConBimestres().subscribe({
      next: (data: any[]) => {
        this.secciones = (data || []).map(s => ({
          ...s,
          bimestres: s.bimestres || []
        }));
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('Error cargando secciones:', err);
        this.errorMessage = 'Error al cargar secciones';
      }
    });
  }

  // ==================
  // MODAL
  // ==================
  openModal(seccion?: any) {
  this.editMode = !!seccion;
  this.errors = {};
  this.successMessage = '';
  this.errorMessage = '';
  this.loading = false;

  if (seccion) {
    this.seccionActual = JSON.parse(JSON.stringify(seccion));
    this.highlightedSeccionId = seccion.id_seccion;
  } else {
    // Automáticamente asigna la letra siguiente disponible
    const letrasExistentes = this.secciones.map(s => s.nombre.charAt(0).toUpperCase());
    let nuevaLetra = 'A';
    for (let i = 0; i < 26; i++) {
      const letra = String.fromCharCode(65 + i);
      if (!letrasExistentes.includes(letra)) {
        nuevaLetra = letra;
        break;
      }
    }
    this.seccionActual = { id_seccion: 0, nombre: nuevaLetra, bimestres: [] };
    this.highlightedSeccionId = null;
  }

  this.modalVisible = true;
}

  closeModal() {
    this.modalVisible = false;
    this.seccionActual = { id_seccion: 0, nombre: '', bimestres: [], siguienteLetra: '' };
    this.errors = {};
    this.successMessage = '';
    this.errorMessage = '';
    this.loading = false;
    this.highlightedSeccionId = null;
  }

  // ==================
  // VALIDACIONES
  // ==================
  validateFields(): boolean {
    this.errors = {};
    if (!this.seccionActual.nombre?.trim()) {
      this.errors.nombre = 'El nombre de la sección es requerido';
      return false;
    }
    return true;
  }

  // ==================
  // GUARDAR / ACTUALIZAR
  // ==================
  saveSeccion() {
    if (!this.validateFields()) return;

    if (this.editMode) {
      this.adminService.updateSeccion(this.seccionActual.id_seccion, { nombre: this.seccionActual.nombre })
        .subscribe({
          next: res => { this.successMessage = res.message; this.loadSecciones(); this.closeModal(); },
          error: err => { this.errorMessage = err.error?.error || err.message; }
        });
    } else {
      this.adminService.createSeccion({ nombre: this.seccionActual.nombre })
        .subscribe({
          next: res => { this.successMessage = 'Sección creada correctamente'; this.loadSecciones(); this.closeModal(); },
          error: err => { this.errorMessage = err.error?.error || err.message; }
        });
    }
  }

  // ==================
  // ELIMINAR
  // ==================
  deleteSeccion(id: number) {
    const seccion = this.secciones.find(s => s.id_seccion === id);
    if (!seccion) return;

    if (!confirm(`¿Seguro que deseas eliminar la sección ${seccion.nombre}?`)) return;

    this.adminService.deleteSeccion(id).subscribe({
      next: () => this.loadSecciones(),
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error al eliminar la sección';
      }
    });
  }

 
// Input nombre: solo mayúscula y una letra
onNombreInput(event: any) {
  if (this.editMode) return; // bloquear edición
  let value = event.target.value.toUpperCase();
  if (value.length > 1) {
    value = value.charAt(0);
  }
  this.seccionActual.nombre = value;
}

  // ==================
  // FILTROS Y PAGINACIÓN
  // ==================
  aplicarFiltros() {
    let filtradas = [...this.secciones];

    if (this.searchTerm?.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtradas = filtradas.filter(s => (s.nombre || '').toLowerCase().includes(termino));
    }

    this.totalPaginas = Math.max(1, Math.ceil(filtradas.length / this.registrosPorPagina));
    if (this.paginaActual > this.totalPaginas) this.paginaActual = this.totalPaginas;

    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    this.seccionesFiltradas = filtradas.slice(inicio, fin);
  }

  buscarSecciones() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

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

  filasVacias(): number[] {
    const count = Math.max(0, this.registrosPorPagina - this.seccionesFiltradas.length);
    return new Array(count).fill(0);
  }
}
*/