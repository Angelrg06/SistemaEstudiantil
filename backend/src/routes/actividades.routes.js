    import express from "express";
    import { getActividadesBySeccion, crearActividad, actualizarActividad, eliminarActividad } from "../controllers/actividad.controller.js";

    const router = express.Router();

    // GET /api/actividades/seccion/5  -> devuelve actividades de la sección con id 5
    router.get("/seccion/:id", getActividadesBySeccion);
    //POST
    router.post("/", crearActividad);
    //PUT
    router.put("/:id", actualizarActividad);
    //DELETE 
    router.delete("/:id", eliminarActividad);

    export default router;