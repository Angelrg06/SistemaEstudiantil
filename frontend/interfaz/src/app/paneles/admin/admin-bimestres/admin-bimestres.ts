/*
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';

@Component({
  selector: 'app-admin-bimestres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bimestres.html',
})
export class AdminBimestres implements OnInit {
  // ==================
  // DATOS PRINCIPALES
  // ==================
  bimestres: any[] = [];
  bimestresFiltrados: any[] = [];
  selectedBimestre: any = {};

  // ==================
  // ESTADO UI
  // ==================
  isEditing = false;
  showModal = false;
  loading = false;
  errors: any = {};
  successMessage = '';
  errorMessage = '';
  searchTerm = '';

  // ==================
  // PAGINACIÓN
  // ==================
  paginaActual = 1;
  registrosPorPagina = 5;
  totalPaginas = 1;
  highlightedBimestreId: number | null = null;

  // ==================
  // VALIDACIONES
  // ==================
  maxNumero = 1;
  minNumero = 1;

  minFechaInicio = '';
  maxFechaFin = '';
  bloquearFechasFuturas = false;

  constructor(private adminService: AdminService) { }
 
  obtenerSiguienteNumero(): number {
    if (this.bimestres.length === 0) return 1;

    const numeros = this.bimestres.map(b => b.numero).sort((a, b) => a - b);
    for (let i = 1; i <= numeros.length + 1; i++) {
      if (!numeros.includes(i)) return i;
    }
    return numeros.length + 1;
  }

  
  agregarDias(fecha: Date, dias: number): Date {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    return nuevaFecha;
  }

 
  calcularFechasSiguienteBimestre() {
    if (this.bimestres.length === 0) {
      const hoy = new Date();
      return {
        fecha_inicio: this.formatDateForInput(hoy),
        fecha_fin: this.formatDateForInput(this.agregarDias(hoy, 60))
      };
    }

    // Último bimestre registrado
    const ultimoBim = this.bimestres.reduce((a, b) => a.numero > b.numero ? a : b);
    const fecha_inicio = new Date(ultimoBim.fecha_fin);
    fecha_inicio.setDate(fecha_inicio.getDate() + 1); // Día siguiente al fin del anterior
    const fecha_fin = this.agregarDias(fecha_inicio, 60); // 60 días después
    return {
      fecha_inicio: this.formatDateForInput(fecha_inicio),
      fecha_fin: this.formatDateForInput(fecha_fin)
    };
  }

  ngOnInit() {
    this.loadBimestres();
  }


  loadBimestres() {
    this.adminService.getBimestres().subscribe({
      next: (data: any[]) => {
        if (!data) data = [];

        // Ordenamos por fecha de inicio
        const ordenados = data.sort(
          (a, b) =>
            new Date(a.fecha_inicio).getTime() -
            new Date(b.fecha_inicio).getTime()
        );

        // Asignamos número y número romano consecutivo (1, 2, 3, 4)
        this.bimestres = ordenados.map((b, index) => {
          const numero = index + 1;
          const fechaInicioISO = this.normalizeToISO(b.fecha_inicio);
          const fechaFinISO = this.normalizeToISO(b.fecha_fin);

          return {
            ...b,
            numero,
            fecha_inicio: fechaInicioISO,
            fecha_fin: fechaFinISO,
            numero_romano: this.toRoman(numero),
          };
        });

        this.actualizarMaxNumero();
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('Error cargando bimestres:', err);
        this.errorMessage = 'Error al cargar bimestres';
      },
    });
  }

  actualizarMaxNumero() {
    if (this.bimestres.length === 0) {
      this.maxNumero = 1;
      return;
    }

    const numeros = this.bimestres
      .map((b) => Number(b.numero))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const ultimo = numeros[numeros.length - 1] ?? 0;
    this.maxNumero = ultimo + 1;
  }

  toRoman(num: number): string {
    const romanMap: { [key: number]: string } = {
      1000: 'M',
      900: 'CM',
      500: 'D',
      400: 'CD',
      100: 'C',
      90: 'XC',
      50: 'L',
      40: 'XL',
      10: 'X',
      9: 'IX',
      5: 'V',
      4: 'IV',
      1: 'I',
    };

    let result = '';
    const values = Object.keys(romanMap)
      .map((v) => parseInt(v))
      .sort((a, b) => b - a);

    for (const value of values) {
      while (num >= value) {
        result += romanMap[value];
        num -= value;
      }
    }

    return result || 'N/A';
  }

 
  updateNumeroRomano() {
    if (this.selectedBimestre && this.selectedBimestre.numero) {
      this.selectedBimestre.numero_romano = this.toRoman(
        this.selectedBimestre.numero
      );
    }
  }

  
  normalizeToISO(raw: any): string {
    if (!raw) return '';

    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw;
    }

    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }

    if (typeof raw === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(raw)) {
      const [dd, mm, yyyy] = raw.split('-');
      return new Date(+yyyy, +mm - 1, +dd).toISOString();
    }

    return '';
  }


  formatDateForInput(rawDate: any): string {
    if (!rawDate) return '';

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  
  toISOStringForBackend(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString();
  }

  
  
  findNextBimestre(numero: number): any {
    const mayores = this.bimestres
      .filter((b) => b.numero > numero)
      .sort((a, b) => a.numero - b.numero);
    return mayores.length > 0 ? mayores[0] : null;
  }

  
   
  findPreviousBimestre(numero: number): any {
    const menores = this.bimestres
      .filter((b) => b.numero < numero)
      .sort((a, b) => b.numero - a.numero);
    return menores.length > 0 ? menores[0] : null;
  }


  isLastBimestre(numero: number): boolean {
    if (this.bimestres.length === 0) return true;
    const maxNum = Math.max(...this.bimestres.map((b) => b.numero));
    return numero === maxNum;
  }

  // ==================
  // MODAL
  // ==================

  
 
openModal(bimestre?: any) {
  this.isEditing = !!bimestre;
  this.errors = {};
  this.successMessage = '';
  this.errorMessage = '';
  this.loading = false;

  if (bimestre) {
    // MODO EDITAR
    this.selectedBimestre = JSON.parse(JSON.stringify(bimestre));
    this.selectedBimestre.numero = Number(this.selectedBimestre.numero);
    this.selectedBimestre.numero_romano = this.toRoman(this.selectedBimestre.numero);

    // Normalizar fechas para input
    this.selectedBimestre.fecha_inicio = this.formatDateForInput(this.selectedBimestre.fecha_inicio);
    this.selectedBimestre.fecha_fin = this.formatDateForInput(this.selectedBimestre.fecha_fin);

    // Nombre = número romano
    this.selectedBimestre.nombre = this.selectedBimestre.numero_romano;

    // Fecha máxima fin según siguiente bimestre
    const siguiente = this.findNextBimestre(this.selectedBimestre.numero);
    this.maxFechaFin = siguiente ? this.formatDateForInput(siguiente.fecha_inicio) : '';
    this.bloquearFechasFuturas = !!siguiente;

    this.highlightedBimestreId = bimestre.id_bimestre;
  } else {
    // NUEVO BIMESTRE
    const nuevoNumero = this.obtenerSiguienteNumero();
    const { fecha_inicio, fecha_fin } = this.calcularFechasSiguienteBimestre();

    this.selectedBimestre = {
      numero: nuevoNumero,
      numero_romano: this.toRoman(nuevoNumero),
      nombre: this.toRoman(nuevoNumero), // ← aquí asignamos solo el número romano
      fecha_inicio,
      fecha_fin
    };
    this.bloquearFechasFuturas = false;
    this.highlightedBimestreId = null;
  }

  this.showModal = true;
}



  
   
  closeModal() {
    this.showModal = false;
    this.selectedBimestre = {};
    this.errors = {};
    this.successMessage = '';
    this.errorMessage = '';
    this.loading = false;
    this.highlightedBimestreId = null;
  }

  // ==================
  // VALIDACIONES
  // ==================

validateFields(): boolean {
  this.errors = {};
  const b = this.selectedBimestre;
  if (!b) return false;

  // Campos requeridos
  if (!b.fecha_inicio?.trim()) this.errors.fecha_inicio = 'Fecha de inicio requerida';
  if (!b.fecha_fin?.trim()) this.errors.fecha_fin = 'Fecha de fin requerida';
  if (this.errors.fecha_inicio || this.errors.fecha_fin) return false;

  const fi = new Date(b.fecha_inicio);
  const ff = new Date(b.fecha_fin);

  // Inicio < Fin
  if (fi >= ff) {
    this.errors.fecha_fin = 'La fecha de fin debe ser posterior a la de inicio';
    return false;
  }

  // Duración aproximada 55-65 días
  const diffDays = Math.round((ff.getTime() - fi.getTime()) / (1000*60*60*24));
  if (diffDays < 55 || diffDays > 65) {
    this.errors.fecha_fin = 'La duración del bimestre debe ser aproximadamente 2 meses (55-65 días)';
    return false;
  }

  // Validar no solaparse con bimestre anterior
  const anterior = this.findPreviousBimestre(b.numero);
  if (anterior) {
    const fechaFinAnterior = new Date(anterior.fecha_fin);
    fechaFinAnterior.setHours(0,0,0,0);
    const fechaInicioActual = new Date(b.fecha_inicio);
    fechaInicioActual.setHours(0,0,0,0);

    if (!this.isEditing && fechaInicioActual <= fechaFinAnterior) {
      this.errors.fecha_inicio = 'La fecha de inicio debe ser posterior al fin del bimestre anterior';
      return false;
    }

    if (this.isEditing && fechaInicioActual < fechaFinAnterior) {
      this.errors.fecha_inicio = 'La fecha de inicio no puede ser anterior al fin del bimestre anterior';
      return false;
    }
  }

  // Validar no solaparse con bimestre siguiente
  const siguiente = this.findNextBimestre(b.numero);
  if (siguiente) {
    const fechaInicioSiguiente = new Date(siguiente.fecha_inicio);
    fechaInicioSiguiente.setHours(0,0,0,0);

    if (ff >= fechaInicioSiguiente) {
      this.errors.fecha_fin = `La fecha de fin debe ser anterior al inicio del siguiente (${this.formatDateForInput(siguiente.fecha_inicio)})`;
      return false;
    }
  }

  return true;
}


  // ==================
  // GUARDAR / ACTUALIZAR
  // ==================

 

saveBimestre() {
  if (!this.validateFields() || this.loading) return;

  this.loading = true;
  this.errorMessage = '';

  // Payload correcto para Prisma
  const payload = {
    nombre: this.selectedBimestre.numero_romano, // SOLO NÚMERO ROMANO
    fecha_inicio: new Date(this.selectedBimestre.fecha_inicio),
    fecha_fin: new Date(this.selectedBimestre.fecha_fin)
  };

  if (this.isEditing) {
    this.adminService.updateBimestre(this.selectedBimestre.id_bimestre, payload)
      .subscribe({
        next: () => {
          this.successMessage = 'Bimestre actualizado correctamente';
          this.loadBimestres();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => {
          console.error('Error actualizando bimestre:', err);
          this.errorMessage = err?.error?.message || 'Error al actualizar el bimestre';
          this.loading = false;
        }
      });
  } else {
    this.adminService.createBimestre(payload)
      .subscribe({
        next: () => {
          this.successMessage = 'Bimestre registrado correctamente';
          this.loadBimestres();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (err) => {
          console.error('Error creando bimestre:', err);
          this.errorMessage = err?.error?.message || 'Error al registrar el bimestre';
          this.loading = false;
        }
      });
  }
}


  // ==================
  // ELIMINAR
  // ==================

  
  deleteBimestre(id: number) {
    const bimestre = this.bimestres.find((b) => b.id_bimestre === id);
    if (!bimestre) return;

    // Verificar que sea el último
    if (!this.isLastBimestre(bimestre.numero)) {
      alert(
        'Solo se puede eliminar el último bimestre registrado (el más reciente).'
      );
      return;
    }

    const numeroRomano = bimestre.numero_romano;
    if (
      !confirm(
        `¿Seguro que deseas eliminar el bimestre ${numeroRomano}?`
      )
    ) {
      return;
    }

    this.adminService.deleteBimestre(id).subscribe({
      next: () => {
        this.loadBimestres();
      },
      error: (err) => {
        console.error('Error eliminando bimestre:', err);
        alert('Error al eliminar el bimestre');
      },
    });
  }

  // ==================
  // FILTROS Y PAGINACIÓN
  // ==================


  aplicarFiltros() {
    let filtrados = [...this.bimestres];

    // Filtro por búsqueda
    if (this.searchTerm?.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(
        (b) =>
          (b.numero_romano || '').toLowerCase().includes(termino) ||
          (b.numero || '').toString().toLowerCase().includes(termino)
      );
    }

    // Calcular paginación
    this.totalPaginas = Math.max(
      1,
      Math.ceil(filtrados.length / this.registrosPorPagina)
    );

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = this.totalPaginas;
    }

    // Obtener registros de la página actual
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    this.bimestresFiltrados = filtrados.slice(inicio, fin);
  }

 
  buscarBimestres() {
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
    const count = Math.max(
      0,
      this.registrosPorPagina - this.bimestresFiltrados.length
    );
    return new Array(count).fill(0);
  }
}
 */