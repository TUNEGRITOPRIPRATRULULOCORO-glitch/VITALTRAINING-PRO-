const svc = require('./usuarios.service');
const fotos = require('./fotos.service');

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

/** Moderación: el administrador retira una foto inapropiada. El usuario recibe un aviso en la app. */
async function deleteFotoUsuario(req, res) {
  try {
    const id = Number(req.params.id);
    if (!(await fotos.obtener(id))) return res.status(404).json({ error: 'Ese usuario no tiene foto.' });
    await fotos.borrar(id);
    res.json({ ok: true });
    // Después de responder: el aviso no debe impedir la moderación
    require('../panel').crearAlerta(id, 'cuenta',
      'Un administrador retiró tu foto de perfil porque no cumple las normas de la app. Puedes subir otra desde Mi Perfil.',
      new Date().toISOString().slice(0, 10)).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: 'Error retirando la foto.' });
  }
}

module.exports = { getUsuarios, postUsuario, putUsuario, deleteUsuario, deleteFotoUsuario };