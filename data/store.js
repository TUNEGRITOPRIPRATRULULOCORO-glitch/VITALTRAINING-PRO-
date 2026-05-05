/**
 * store.js — Almacenamiento en memoria para el Panel de Usuario
 * 
 * Estructura pensada para migrar fácilmente a una base de datos:
 * cada "tabla" es un array. Los IDs se generan con Date.now().
 * Cuando integres DB, solo reemplaza estas variables por queries.
 */

const perfiles = [
  // Ejemplo de perfil pre-cargado (se puede eliminar en producción)
  {
    userId: 1,
    nombre: 'Carlos Gómez',
    edad: 24,
    peso: 72,        // kg
    altura: 178,     // cm
    posicion: 'Mediocampista',
    updatedAt: new Date().toISOString()
  }
];

const comidas = [
  {
    id: 1,
    userId: 1,
    nombre: 'Avena con frutas',
    tipo: 'desayuno',
    calorias: 350,
    fecha: '2026-05-01',
    hora: '08:00',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    userId: 1,
    nombre: 'Arroz con pollo',
    tipo: 'almuerzo',
    calorias: 600,
    fecha: '2026-05-01',
    hora: '12:30',
    createdAt: new Date().toISOString()
  }
];

const rutinas = [
  {
    id: 1,
    userId: 1,
    nombre: 'Cardio + Técnica',
    tipo: 'entrenamiento',
    duracionMinutos: 60,
    intensidad: 'media',
    descripcion: 'Carrera 20 min, rondos, conducción',
    fecha: '2026-05-01',
    createdAt: new Date().toISOString()
  }
];

const alertas = [
  {
    id: 1,
    userId: 1,
    tipo: 'hidratacion',
    mensaje: 'Recuerda tomar agua antes del entrenamiento',
    leida: false,
    fecha: '2026-05-01',
    createdAt: new Date().toISOString()
  }
];

module.exports = { perfiles, comidas, rutinas, alertas };