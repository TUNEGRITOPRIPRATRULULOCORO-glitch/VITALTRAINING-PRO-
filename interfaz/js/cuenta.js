/* =============================================
   VitalTraining — cuenta.js
   "Mi cuenta" (todos los roles): foto, cambiar contraseña, descargar mis datos y borrar la cuenta.
   Se abre tocando tu avatar en el menú (o desde Mi Perfil del atleta).
============================================= */
/* global currentUser:writable, chartInstances:writable -- declaradas en comun.js; aquí se les asigna valor */

function cuentaModal() {
    const esAdmin = currentUser?.rol === 'Administrador';
    openModal('Mi cuenta', `
        <div class="cu-cabecera">
            <div class="cu-avatar">${avatarContenido(currentUser.id, currentUser.nombre)}</div>
            <div><strong>${escapeHtml(currentUser.nombre)}</strong><span>${escapeHtml(currentUser.email || '')} · ${escapeHtml(normalizeDisplayRole(currentUser.rol))}</span></div>
            <button class="btn btn-ghost btn-sm" onclick="modalFotoPerfil()">📷 Cambiar foto</button>
        </div>

        <section class="cu-seccion">
            <h3>🔑 Cambiar contraseña</h3>
            <div class="form-group"><label for="cu-actual">Contraseña actual</label><input type="password" id="cu-actual" autocomplete="current-password"></div>
            <div class="form-row">
                <div class="form-group"><label for="cu-nueva">Nueva (mínimo 8)</label><input type="password" id="cu-nueva" autocomplete="new-password" minlength="8"></div>
                <div class="form-group"><label for="cu-repetir">Repite la nueva</label><input type="password" id="cu-repetir" autocomplete="new-password"></div>
            </div>
            <p class="campo-ayuda">¿Entraste con Google y nunca creaste una contraseña? Créala con "¿Olvidaste tu contraseña?" en la pantalla de entrada.</p>
            <button class="btn btn-primary btn-sm" onclick="cuentaCambiarPassword()">Guardar contraseña</button>
        </section>

        <section class="cu-seccion">
            <h3>📦 Mis datos</h3>
            <p class="campo-ayuda">Descarga todo lo que la app guarda de ti (perfil, salud, comidas, entrenamientos, series, tests, mensajes…) en un archivo.</p>
            <button class="btn btn-ghost btn-sm" onclick="cuentaDescargar(this)">⬇ Descargar mis datos</button>
        </section>

        ${esAdmin ? `
        <section class="cu-seccion">
            <h3>🗑 Borrar mi cuenta</h3>
            <p class="campo-ayuda">Un administrador no puede borrarse a sí mismo: pídeselo a otro administrador desde Usuarios.</p>
        </section>` : `
        <section class="cu-seccion cu-peligro">
            <h3>🗑 Borrar mi cuenta</h3>
            <p class="campo-ayuda">Se borran para siempre tu cuenta y <strong>todos tus datos</strong>. No se puede deshacer: si quieres guardarlos, descárgalos antes.</p>
            <button class="btn btn-danger btn-sm" onclick="cuentaConfirmarBorrado()">Borrar mi cuenta…</button>
        </section>`}`);
}

async function cuentaCambiarPassword() {
    const actual = document.getElementById('cu-actual').value;
    const nueva = document.getElementById('cu-nueva').value;
    if (nueva !== document.getElementById('cu-repetir').value) return showToast('Las contraseñas nuevas no coinciden.', 'error');
    if (nueva.length < 8) return showToast('La nueva contraseña debe tener al menos 8 caracteres.', 'error');
    const res = await apiFetch(`${API}/cuenta/password`, { method: 'PUT', body: JSON.stringify({ actual, nueva }) }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo cambiar la contraseña.', 'error');
    ['cu-actual', 'cu-nueva', 'cu-repetir'].forEach(id => { document.getElementById(id).value = ''; });
    showToast('Contraseña cambiada 🔑');
}

/** Descarga el archivo con el token (un enlace normal no lleva la sesión). */
async function cuentaDescargar(boton) {
    boton.disabled = true;
    try {
        const res = await apiFetch(`${API}/cuenta/datos`);
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const enlace = Object.assign(document.createElement('a'), { href: url, download: `vitaltraining-mis-datos-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Tus datos se descargaron');
    } catch {
        showToast('No se pudieron descargar tus datos.', 'error');
    } finally {
        boton.disabled = false;
    }
}

function cuentaConfirmarBorrado() {
    openModal('Borrar mi cuenta', `
        <div class="ls-aviso rd-bad"><strong>Esto no se puede deshacer.</strong><div>Se borran tu cuenta, tu perfil, tu salud, tus comidas, tus entrenamientos, tus mensajes y todo lo demás.</div></div>
        <div class="form-group"><label for="cu-borrar-pass">Tu contraseña</label><input type="password" id="cu-borrar-pass" autocomplete="current-password"></div>
        <div class="form-group"><label for="cu-borrar-txt">Escribe <strong>BORRAR</strong> para confirmar</label><input type="text" id="cu-borrar-txt" autocomplete="off"></div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="cuentaModal()">Cancelar</button>
            <button class="btn btn-danger" onclick="cuentaBorrar()">Borrar para siempre</button></div>`);
}

async function cuentaBorrar() {
    if (document.getElementById('cu-borrar-txt').value.trim().toUpperCase() !== 'BORRAR') return showToast('Escribe BORRAR para confirmar.', 'error');
    const password = document.getElementById('cu-borrar-pass').value;
    const res = await apiFetch(`${API}/cuenta`, { method: 'DELETE', body: JSON.stringify({ password }) }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo borrar la cuenta.', 'error');
    closeModal();
    // Igual que cerrar sesión, sin preguntar: la cuenta ya no existe
    stopPolling();
    stopBadgePolling();
    _fotoCache.clear();
    clearSession(); currentUser = null;
    Object.values(chartInstances).forEach(c => c.destroy()); chartInstances = {};
    showAuthPanel();
    showToast('Tu cuenta y tus datos se borraron. ¡Gracias por usar VitalTraining!');
}
