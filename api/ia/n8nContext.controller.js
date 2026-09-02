const { query } = require('../../data/db');

async function getContextoUsuario(req, res) {
  try {
    const userId = Number(req.params.userId);

    const result = await query(`
      SELECT
        (SELECT row_to_json(p) FROM perfiles p WHERE user_id = $1) as perfil,
        (SELECT row_to_json(pm) FROM perfiles_medicos pm WHERE user_id = $1) as perfil_medico,
        (SELECT json_agg(s) FROM (SELECT * FROM salud WHERE user_id = $1 AND fecha >= NOW() - INTERVAL '7 days' ORDER BY fecha DESC) s) as salud,
        (SELECT json_agg(r) FROM (SELECT * FROM rutinas WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5) r) as rutinas,
        (SELECT json_agg(a) FROM (SELECT * FROM alertas WHERE user_id = $1 AND leida = false) a) as alertas
    `, [userId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error obteniendo contexto para n8n:', err.message);
    res.status(500).json({ error: 'Error al obtener contexto del usuario.' });
  }
}

module.exports = { getContextoUsuario };