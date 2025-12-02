// services/export-pdf.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ExportPdfService {
  
  // ==============================
  // EXPORTAR DOCENTES
  // ==============================
  exportDocentesPDF(docentes: any[], filtros?: any): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-PE');
    const hora = new Date().toLocaleTimeString('es-PE');
    
    // Título
    doc.setFontSize(18);
    doc.text('REPORTE DE DOCENTES', 105, 15, { align: 'center' });
    
    // Subtítulo
    doc.setFontSize(12);
    doc.text('Sistema de Gestión Académica', 105, 22, { align: 'center' });
    
    // Fecha y hora
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha} - Hora: ${hora}`, 14, 30);
    
    // Filtros aplicados
    if (filtros) {
      let filtrosText = 'Filtros aplicados: ';
      if (filtros.searchTerm) filtrosText += `Búsqueda: "${filtros.searchTerm}"`;
      if (filtros.selectedDepartamento) filtrosText += ` | Departamento: ${filtros.selectedDepartamento}`;
      
      doc.setFontSize(9);
      doc.text(filtrosText, 14, 37);
    }
    
    // Tabla de docentes
    const tableData = docentes.map((docente, index) => [
      index + 1,
      docente.codigo || 'N/A',
      docente.dni || 'N/A',
      `${docente.nombre} ${docente.apellido}`,
      docente.usuario?.correo || 'N/A',
      docente.secciones?.length || 0
    ]);
    
    autoTable(doc, {
      head: [['#', 'Código', 'DNI', 'Nombre Completo', 'Correo', 'Secciones']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },  // #
        1: { cellWidth: 25 },  // Código
        2: { cellWidth: 25 },  // DNI
        3: { cellWidth: 45 },  // Nombre
        4: { cellWidth: 55 },  // Correo
        5: { cellWidth: 20 }   // Secciones
      }
    });
    
    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount} - Total de docentes: ${docentes.length}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Guardar PDF
    doc.save(`docentes_${fecha.replace(/\//g, '-')}.pdf`);
  }
  
  // ==============================
  // EXPORTAR ESTUDIANTES
  // ==============================
  exportEstudiantesPDF(estudiantes: any[], filtros?: any): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-PE');
    
    // Título
    doc.setFontSize(18);
    doc.text('REPORTE DE ESTUDIANTES', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Listado completo de estudiantes registrados', 105, 22, { align: 'center' });
    
    // Información del reporte
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${fecha}`, 14, 30);
    doc.text(`Total de estudiantes: ${estudiantes.length}`, 14, 37);
    
    // Tabla de estudiantes
    const tableData = estudiantes.map((estudiante, index) => [
      index + 1,
      estudiante.codigo || 'N/A',
      estudiante.dni || 'N/A',
      estudiante.nombre || 'N/A',
      estudiante.apellido || 'N/A',
      estudiante.seccion?.nombre || 'Sin asignar',
      estudiante.usuario?.correo || 'N/A'
    ]);
    
    autoTable(doc, {
      head: [['#', 'Código', 'DNI', 'Nombre', 'Apellido', 'Sección', 'Correo']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 40 }
      }
    });
    
    // Guardar PDF
    doc.save(`estudiantes_${fecha.replace(/\//g, '-')}.pdf`);
  }
  
  // ==============================
  // EXPORTAR CURSOS
  // ==============================
  exportCursosPDF(cursos: any[], filtros?: any): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-PE');
    
    // Título
    doc.setFontSize(18);
    doc.text('CATÁLOGO DE CURSOS', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Listado de cursos disponibles en el sistema', 105, 22, { align: 'center' });
    
    // Estadísticas
    const totalSecciones = cursos.reduce((sum, curso) => 
      sum + (curso.secciones?.length || curso.seccionesCurso?.length || 0), 0);
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${fecha}`, 14, 30);
    doc.text(`Total de cursos: ${cursos.length}`, 14, 37);
    doc.text(`Total de asignaciones a secciones: ${totalSecciones}`, 14, 44);
    
    // Tabla de cursos
    const tableData = cursos.map((curso, index) => [
      index + 1,
      curso.nombre || 'N/A',
      curso.descripcion?.substring(0, 40) + '...' || 'Sin descripción',
      curso.secciones?.length || curso.seccionesCurso?.length || 0,
      this.formatSecciones(curso.secciones || curso.seccionesCurso || [])
    ]);
    
    autoTable(doc, {
      head: [['#', 'Curso', 'Descripción', 'Secciones', 'Detalle Secciones']],
      body: tableData,
      startY: 50,
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 },
        3: { cellWidth: 20 },
        4: { cellWidth: 70 }
      }
    });
    
    // Guardar PDF
    doc.save(`cursos_${fecha.replace(/\//g, '-')}.pdf`);
  }
  
  // ==============================
  // EXPORTAR DETALLADO DE UN DOCENTE
  // ==============================
  exportDocenteDetallePDF(docente: any): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-PE');
    
    // Encabezado
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('FICHA PERSONAL DE DOCENTE', 105, 20, { align: 'center' });
    
    // Línea divisoria
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    // Información personal
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('INFORMACIÓN PERSONAL', 20, 35);
    
    doc.setFontSize(10);
    let y = 45;
    
    // Datos básicos
    const datos = [
      ['Código:', docente.codigo || 'N/A'],
      ['DNI:', docente.dni || 'N/A'],
      ['Nombre completo:', `${docente.nombre || ''} ${docente.apellido || ''}`],
      ['Correo electrónico:', docente.usuario?.correo || 'N/A'],
      ['Fecha de registro:', new Date().toLocaleDateString('es-PE')]
    ];
    
    datos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, y);
      y += 7;
    });
    
    // Secciones asignadas
    if (docente.secciones && docente.secciones.length > 0) {
      y += 5;
      doc.setFontSize(12);
      doc.text('SECCIONES ASIGNADAS', 20, y);
      
      y += 10;
      const seccionesData = docente.secciones.map((seccion: any, index: number) => [
        index + 1,
        seccion.nombre || 'N/A',
        seccion.bimestre?.nombre || 'Sin bimestre'
      ]);
      
      autoTable(doc, {
        head: [['#', 'Nombre de Sección', 'Bimestre']],
        body: seccionesData,
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219] },
        styles: { fontSize: 9 }
      });
    }
    
    // Pie de página
    doc.setFontSize(8);
    doc.text(
      `Documento generado el ${fecha} - Sistema de Gestión Académica`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    
    // Guardar PDF
    const nombreArchivo = `docente_${docente.codigo || docente.dni}_${fecha.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }
  
  // ==============================
  // EXPORTAR DETALLADO DE UN ESTUDIANTE
  // ==============================
  exportEstudianteDetallePDF(estudiante: any): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-PE');
    
    // Encabezado
    doc.setFontSize(20);
    doc.setTextColor(39, 174, 96);
    doc.text('FICHA DE ESTUDIANTE', 105, 20, { align: 'center' });
    
    // Información personal
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('DATOS PERSONALES', 20, 35);
    
    doc.setFontSize(10);
    let y = 45;
    
    const datos = [
      ['Código:', estudiante.codigo || 'N/A'],
      ['DNI:', estudiante.dni || 'N/A'],
      ['Nombre:', estudiante.nombre || 'N/A'],
      ['Apellidos:', estudiante.apellido || 'N/A'],
      ['Correo:', estudiante.usuario?.correo || 'N/A'],
      ['Sección:', estudiante.seccion?.nombre || 'Sin asignar'],
      ['Bimestre:', estudiante.seccion?.bimestre?.nombre || 'N/A']
    ];
    
    datos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, y);
      y += 7;
    });
    
    // Información académica (si existe)
    if (estudiante.info_academica) {
      y += 10;
      doc.setFontSize(12);
      doc.text('INFORMACIÓN ACADÉMICA', 20, y);
      
      y += 10;
      const infoData = [
        ['Total de entregas:', estudiante.info_academica.total_entregas || 0],
        ['Entregas pendientes:', estudiante.info_academica.entregas_pendientes || 0],
        ['Promedio de entregas:', estudiante.info_academica.promedio_entregas || 0]
      ];
      
      infoData.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value.toString(), 80, y);
        y += 7;
      });
    }
    
    // Guardar PDF
    const nombreArchivo = `estudiante_${estudiante.codigo || estudiante.dni}_${fecha.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }
  
  // ==============================
  // MÉTODOS AUXILIARES
  // ==============================
  
  private formatSecciones(secciones: any[]): string {
    if (!secciones || secciones.length === 0) return 'Sin asignar';
    
    if (secciones[0].seccion) {
      // Si viene de seccionesCurso
      return secciones.map((sc: any) => sc.seccion?.nombre).join(', ');
    } else {
      // Si viene directamente
      return secciones.map((s: any) => s.nombre).join(', ');
    }
  }
  
  // ==============================
  // EXPORTAR REPORTE COMBINADO
  // ==============================
  exportReporteGeneral(docentes: any[], estudiantes: any[], cursos: any[]): void {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-PE');
    
    // Título principal
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('REPORTE GENERAL DEL SISTEMA', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Resumen estadístico completo', 105, 28, { align: 'center' });
    
    // Fecha
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${fecha}`, 20, 40);
    
    // Estadísticas
    let y = 50;
    doc.setFontSize(12);
    doc.text('ESTADÍSTICAS GENERALES', 20, y);
    
    y += 10;
    doc.setFontSize(10);
    
    const stats = [
      ['Total de docentes:', docentes.length],
      ['Total de estudiantes:', estudiantes.length],
      ['Total de cursos:', cursos.length],
      ['Secciones con docentes:', new Set(docentes.flatMap(d => d.secciones?.map((s: any) => s.id_seccion) || [])).size],
      ['Secciones con estudiantes:', new Set(estudiantes.map(e => e.id_seccion).filter(Boolean)).size]
    ];
    
    stats.forEach(([label, value]) => {
      doc.text(`${label} ${value}`, 20, y);
      y += 7;
    });
    
    // Tabla resumen docentes
    y += 10;
    autoTable(doc, {
      head: [['DOCENTES - Resumen por secciones']],
      body: this.getResumenDocentes(docentes),
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Tabla resumen estudiantes
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      head: [['ESTUDIANTES - Distribución por sección']],
      body: this.getResumenEstudiantes(estudiantes),
      startY: finalY,
      theme: 'striped',
      headStyles: { fillColor: [39, 174, 96] }
    });
    
    // Tabla resumen cursos
    const finalY2 = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      head: [['CURSOS - Disponibilidad']],
      body: cursos.map((curso, index) => [
        index + 1,
        curso.nombre,
        curso.secciones?.length || curso.seccionesCurso?.length || 0
      ]),
      startY: finalY2,
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] }
    });
    
    // Guardar PDF
    doc.save(`reporte_general_${fecha.replace(/\//g, '-')}.pdf`);
  }
  
  private getResumenDocentes(docentes: any[]): any[] {
    const resumen: {[key: string]: number} = {};
    
    docentes.forEach(docente => {
      const count = docente.secciones?.length || 0;
      const key = `${count} sección(es)`;
      resumen[key] = (resumen[key] || 0) + 1;
    });
    
    return Object.entries(resumen).map(([secciones, cantidad]) => [secciones, cantidad]);
  }
  
  private getResumenEstudiantes(estudiantes: any[]): any[] {
    const resumen: {[key: string]: number} = {};
    
    estudiantes.forEach(estudiante => {
      const seccion = estudiante.seccion?.nombre || 'Sin asignar';
      resumen[seccion] = (resumen[seccion] || 0) + 1;
    });
    
    return Object.entries(resumen).map(([seccion, cantidad]) => [seccion, cantidad]);
  }
}