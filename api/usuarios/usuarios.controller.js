const svc = require('./usuarios.service');

async function getUsuarios(req, res) {
  try {
    res.json(await svc.listar(req.query));
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo usuarios.' });
  }
}

async function postUsuario(req, res) {
  try {
    const usuario = await svc.crear(req.body);
    res.status(201).json(usuario);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Error creando usuario.' });
  }
}

async function putUsuario(req, res) {
  try {
    const usuario = await svc.actualizar(req.params.id, req.body);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando usuario.' });
  }
}

async function deleteUsuario(req, res) {
  try {
    const resultado = await svc.eliminar(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ mensaje: 'Eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando usuario.' });
  }
}

module.exports = { getUsuarios, postUsuario, putUsuario, deleteUsuario };