export interface Estudiante {
  id_estudiante?: number;
  codigo: string;
  dni: string;
  nombre: string;
  apellido: string;
  id_usuario?: number;
  id_seccion?: number;
  usuario?: Usuario;
}