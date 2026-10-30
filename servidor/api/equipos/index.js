/**
 * Módulo EQUIPOS — equipos del club y quién ve a qué atleta.
 * Tablas propias: equipos, equipo_miembros
 *
 * Sin equipos creados, cada profesional ve a todos los atletas (club único). Con equipos,
 * un nutricionista o médico solo ve a los atletas de sus equipos. El admin, siempre a todos.
 */
const svc = require('./equipos.service');

module.exports = {
  router:           require('./equipos.routes'),
  accesoAtleta:     svc.accesoAtleta,      // middleware para rutas /:userId de un atleta
  atletasVisibles:  svc.atletasVisibles,   // (usuario) → [ids] o null (todos)
  puedeVerAtleta:   svc.puedeVerAtleta,    // (usuario, atletaId) → boolean
  filtrarAtletas:   svc.filtrarAtletas,    // (usuario, lista) → solo los que puede ver
  puedenHablar:     svc.puedenHablar,      // (yo, otro) → boolean (atleta ↔ profesional del mismo equipo)
  filtrarContactos: svc.filtrarContactos,  // (yo, usuarios) → contactos permitidos
  nombresDeEquipos: svc.nombresDeEquipos,  // ([ids]) → { [id]: ['Sub-17', ...] }
  tieneEquipo:      svc.tieneEquipo,       // (userId) → ¿está en algún equipo?
  // Registro: unirse con código o crear el equipo propio (entrenador)
  porCodigo:        svc.porCodigo,         // (codigo) → { id, nombre, deporte } o null
  nombreRepetido:   svc.nombreRepetido,    // (nombre) → ¿ya hay un equipo con ese nombre?
  crear:            svc.crear,             // ({ nombre, deporte }) → equipo con su código
  agregarMiembro:   svc.agregarMiembro,    // (equipoId, userId)
};
