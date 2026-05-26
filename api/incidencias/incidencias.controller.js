const svc = require('./incidencias.service');

async function getIncidencias(req, res) {
  try {
    const filtros = { ...req.query };
    if (req.user.rol === 'Futbolista')      filtros.userId = req.user.id;
    else if (req.user.rol === 'Nutricionista') filtros.destinatario = 'Nutricionista';
    // Administrador ve todo
    res.json(await svc.listar(filtros));
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo incidencias.' });
  }
}

async function postIncidencia(req, res) {
  try {
    const { titulo, descripcion, categoria, prioridad } = req.body;
    if (!titulo) return res.status(400).json({ error: 'El título es requerido.' });
    const incidencia = await svc.crear({ titulo, descripcion, categoria, prioridad }, req.user);
    res.status(201).json({ ok: true, incidencia });
  } catch (err) {
    res.status(500).json({ error: 'Error creando incidencia.' });
  }
}

async function putEstado(req, res) {
  try {
    const inc = await svc.getById(req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incidencia no encontrada.' });
    if (req.user.rol !== 'Administrador' && req.user.rol !== inc.destinatario)
      return res.status(403).json({ error: 'No tienes permiso para gestionar este ticket.' });
    const actualizada = await svc.actualizarEstado(req.params.id, req.body.estado);
    res.json(actualizada);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando incidencia.' });
  }
}

async function postComentario(req, res) {
  try {
    const inc = await svc.getById(req.params.id);
    if (!inc) return res.status(404).json({ error: 'Incidencia no encontrada.' });
    if (req.user.rol !== 'Administrador' && req.user.rol !== inc.destinatario)
      return res.status(403).json({ error: 'No tienes permiso para responder este ticket.' });
    if (!req.body.texto?.trim())
      return res.status(400).json({ error: 'El texto es requerido.' });
    const comentario = await svc.agregarComentario(req.params.id, req.body.texto.trim(), req.user);
    res.json(comentario);
  } catch (err) {
    res.status(500).json({ error: 'Error añadiendo comentario.' });
  }
}

module.exports = { getIncidencias, postIncidencia, putEstado, postComentario };