
interface Docente {
  id_docente?: number;
  codigo: string;
  dni: string;
  nombre: string;
  apellido: string;
  usuario: Usuario;
  secciones?: number[];
}