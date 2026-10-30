const svc = require('./equipos.service');

// Los errores con status (400/403/404/409) son de validación y su mensaje se puede mostrar
function responder(promesa, res, porDefecto, status = 200) {
  return promesa
    .then(datos => res.status(status).json({ ok: true, ...datos }))
    .catch(err => {
      if (!err.status) console.error('Equipos:', err.message);
      res.status(err.status || 500).json({ error: err.status ? err.message : porDefecto });
    });
}

const getEquipos   = (req, res) => responder(svc.listar(), res, 'Error cargando los equipos.');
const postEquipo   = (req, res) => responder(svc.crear(req.body).then(equipo => ({ equipo })), res, 'Error creando el equipo.', 201);
const putEquipo    = (req, res) => responder(svc.actualizar(req.params.id, req.body).then(equipo => ({ equipo })), res, 'Error guardando el equipo.');
const postCodigo   = (req, res) => responder(svc.renovarCodigo(req.params.id).then(equipo => ({ equipo })), res, 'Error renovando el código.');
const postMiembro  = (req, res) => responder(svc.agregarMiembro(req.params.id, req.body?.userId).then(() => ({})), res, 'Error añadiendo al equipo.');
const getMios      = (req, res) => responder(svc.misEquipos(req.user).then(equipos => ({ equipos })), res, 'Error cargando tus equipos.');
const postUnirse   = (req, res) => responder(svc.unirseConCodigo(req.user, req.body?.codigo).then(equipo => ({ equipo })), res, 'Error uniéndote al equipo.');

async function deleteEquipo(req, res) {
  try {
    if (!(await svc.eliminar(req.params.id))) return res.status(404).json({ error: 'Equipo no encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Equipos:', err.message);
    res.status(500).json({ error: 'Error eliminando el equipo.' });
  }
}

async function deleteMiembro(req, res) {
  try {
    if (!(await svc.quitarMiembro(req.params.id, req.params.userId))) return res.status(404).json({ error: 'Esa persona no está en el equipo.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Equipos:', err.message);
    res.status(500).json({ error: 'Error quitando del equipo.' });
  }
}

module.exports = { getEquipos, postEquipo, putEquipo, deleteEquipo, postCodigo, postMiembro, deleteMiembro, getMios, postUnirse };
