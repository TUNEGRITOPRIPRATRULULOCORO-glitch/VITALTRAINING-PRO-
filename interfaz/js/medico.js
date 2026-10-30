/* =============================================
   VitalTraining — medico.js
   Panel del médico: expedientes médicos (lesiones, notas clínicas, salud diaria) y mensajes.
============================================= */
/* global currentUser:writable -- declaradas en comun.js; aquí se les asigna valor */

// ────────────────────────────────────────────────
// PANEL MEDICO
// ────────────────────────────────────────────────
let _medicoAtletas = [];

function showPanelMedico(user) {
    setTitle('Expedientes médicos');
    currentUser = user;
    hideAllPanels();
    document.getElementById('panel-medico').classList.remove('hidden');
    pintarAvatarPropio();
    document.getElementById('md-nombre').textContent = user.nombre.split(' ').slice(0, 2).join(' ');
    startBadgePolling();
    medicoRenderView('expedientes');
}

function medicoRenderView(view) {
    closeSidebar();
    stopPolling();
    setTitle(view === 'mensajes' ? 'Mensajes' : 'Expedientes médicos');
    document.querySelectorAll('#panel-medico .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.mdView === view));
    if (view === 'mensajes') enSegundoPlano(medicoRenderMensajes());
    else enSegundoPlano(medicoRenderAtletas());
}

async function medicoRenderMensajes() {
    const main = document.getElementById('md-content');
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mensajes</h1><p>Habla con tus atletas, con los nutricionistas y con administración</p></div>
        </div>
        <div id="md-mensajes"></div>
    </div>`;
    await msgMontar('md-mensajes');
}

function medicoEnlaceAtleta(a) {
    return `<button type="button" class="enlace-atleta" onclick="medicoVerPerfil(${Number(a.id)})">${escapeHtml(a.nombre)}</button>`;
}

async function medicoRenderAtletas() {
    closeSidebar();
    const main = document.getElementById('md-content');
    main.innerHTML = showLoading();

    try {
        const [response, rendimiento] = await Promise.all([apiFetch(`${API}/perfil-medico/atletas`), rdCargarEquipo()]);
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudieron cargar los atletas.');
        _medicoAtletas = data.atletas || [];
        const enRiesgo = _medicoAtletas.filter(a => rendimiento[a.id]?.carga.riesgo === 'alto');
        const noListos = _medicoAtletas.filter(a => rendimiento[a.id]?.listo.nivel === 'bajo');
        const deBaja = _medicoAtletas.filter(a => rendimiento[a.id]?.estadoMedico?.estado === 'no_apto');
        const enRecuperacion = _medicoAtletas.filter(a => rendimiento[a.id]?.estadoMedico?.estado === 'adaptado');
        main.innerHTML = `
        <div class="view-enter">
            <div class="view-header">
                <div class="view-title"><h1>Expedientes médicos</h1><p>${_medicoAtletas.length} atletas activos</p></div>
                <button class="btn btn-ghost" onclick="medicoRenderAtletas()">Actualizar</button>
            </div>
            ${deBaja.length || enRecuperacion.length ? `
            <div class="ls-aviso rd-warn">
                ${deBaja.length ? `<div>⛔ <strong>${deBaja.length} de baja médica:</strong> ${deBaja.map(medicoEnlaceAtleta).join(', ')}</div>` : ''}
                ${enRecuperacion.length ? `<div>🩹 <strong>${enRecuperacion.length} en recuperación:</strong> ${enRecuperacion.map(medicoEnlaceAtleta).join(', ')}</div>` : ''}
            </div>` : ''}
            ${enRiesgo.length || noListos.length ? `
            <div class="rd-aviso">
                ${enRiesgo.length ? `<div>⚠️ <strong>${enRiesgo.length} ${enRiesgo.length === 1 ? 'atleta' : 'atletas'} con riesgo alto de lesión por carga:</strong> ${enRiesgo.map(medicoEnlaceAtleta).join(', ')}</div>` : ''}
                ${noListos.length ? `<div>🛑 <strong>${noListos.length} ${noListos.length === 1 ? 'atleta necesita' : 'atletas necesitan'} descanso hoy:</strong> ${noListos.map(medicoEnlaceAtleta).join(', ')}</div>` : ''}
            </div>` : ''}
            <div class="card">
                <div class="card-header"><h2>Atletas</h2></div>
                <div class="table-wrap"><table><thead><tr><th>Atleta</th><th>Estado médico</th><th>Listo hoy</th><th>Carga</th><th>Cumplimiento</th><th>Ficha médica</th><th></th></tr></thead><tbody>
                    ${_medicoAtletas.length ? _medicoAtletas.map(atleta => {
                        const rd = rendimiento[atleta.id];
                        return `
                        <tr class="fila-link" onclick="medicoVerPerfil(${Number(atleta.id)})" title="Ver expediente">
                            <td><div class="user-name">${escapeHtml(atleta.nombre)}</div><div class="user-email">${escapeHtml(atleta.email)}</div>${eqChips(atleta.equipos)}</td>
                            <td>${lsBadgeEstado(rd?.estadoMedico)}</td>
                            <td>${rd ? rdBadgeListo(rd.listo) : '—'}</td>
                            <td>${rd ? rdBadgeRiesgo(rd.carga) : '—'}</td>
                            <td>${rd?.cumplimiento.porcentaje != null ? rd.cumplimiento.porcentaje + '%' : '—'}</td>
                            <td>${atleta.completado ? '<span class="badge badge-activo">Completa</span>' : '<span class="badge badge-inactivo">Pendiente</span>'}</td>
                            <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();medicoVerPerfil(${Number(atleta.id)})">Ver expediente →</button></td>
                        </tr>`;
                    }).join('') : '<tr><td colspan="7"><div class="empty-state"><p>No hay atletas activos.</p></div></td></tr>'}
                </tbody></table></div>
            </div>
        </div>`;
    } catch (error) {
        main.innerHTML = showError(escapeHtml(error.message), 'medicoRenderAtletas()');
    }
}

function medicoListarValores(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
    } catch {
        return [value];
    }
}

async function medicoVerPerfil(userId) {
    const main = document.getElementById('md-content');
    const atleta = _medicoAtletas.find(item => Number(item.id) === Number(userId));
    main.innerHTML = showLoading();

    try {
        const response = await apiFetch(`${API}/perfil-medico/${userId}`);
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo cargar el expediente.');
        const perfil = data.perfil;
        const condiciones = medicoListarValores(perfil?.condiciones);
        const alergias = medicoListarValores(perfil?.alergias);
        main.innerHTML = `
        <div class="view-enter">
            <div class="view-header">
                <div class="view-title"><h1>${escapeHtml(atleta?.nombre || 'Expediente')}</h1><p>Ficha médica del atleta</p></div>
                <button class="btn btn-ghost" onclick="medicoRenderAtletas()">← Volver a expedientes</button>
            </div>
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h2>🩹 Lesiones y notas clínicas</h2></div>
                <div class="card-body"><div id="md-lesiones">${showLoading()}</div></div>
            </div>
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h2>📊 Salud diaria · últimos 14 registros</h2></div>
                <div class="card-body"><div id="md-salud">${showLoading()}</div></div>
            </div>
            ${data.ficha ? `<div class="card" style="margin-bottom:20px"><div class="card-header"><h2>🏅 Ficha deportiva</h2></div><div class="card-body">${fichaDeportivaHTML(data.ficha)}</div></div>` : ''}
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><h2>⏱ Tests físicos</h2><button class="btn btn-primary btn-sm" onclick="evModalRegistrar(${Number(userId)})">+ Registrar resultado</button></div>
                <div class="card-body"><div id="md-tests"></div></div>
            </div>
            ${perfil ? `<div class="stats-grid">
                <div class="card"><div class="card-header"><h2>Condiciones</h2></div><div class="card-body">${condiciones.length ? condiciones.map(item => `<p>${escapeHtml(item)}</p>`).join('') : '<p>Sin condiciones registradas.</p>'}</div></div>
                <div class="card"><div class="card-header"><h2>Alergias</h2></div><div class="card-body">${alergias.length ? alergias.map(item => `<p>${escapeHtml(item)}</p>`).join('') : '<p>Sin alergias registradas.</p>'}</div></div>
                <div class="card"><div class="card-header"><h2>Preferencias alimentarias</h2></div><div class="card-body"><p>${escapeHtml(perfil.preferencias || 'Sin restricciones')}</p></div></div>
            </div>` : '<div class="card"><div class="card-body"><p>Este atleta aún no ha completado su perfil médico.</p></div></div>'}
        </div>`;
        enSegundoPlano(evRender('md-tests', userId, { propio: false }));
        enSegundoPlano(lsRender('md-lesiones', userId, { editable: true }));
        enSegundoPlano(medicoRenderSalud(userId));
    } catch (error) {
        main.innerHTML = showError(escapeHtml(error.message), `medicoVerPerfil(${Number(userId)})`);
    }
}

// Registro diario del atleta (fatiga, sueño, recuperación): solo lectura para el médico
async function medicoRenderSalud(userId) {
    const cont = document.getElementById('md-salud');
    if (!cont) return;
    const registros = await apiFetch(`${API}/salud/${userId}`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!Array.isArray(registros)) { cont.innerHTML = '<p class="ls-vacio">No se pudo cargar la salud diaria.</p>'; return; }
    if (!registros.length) { cont.innerHTML = '<p class="ls-vacio">El atleta aún no registra su salud.</p>'; return; }
    const color = (campo, v) => (campo === 'fatiga' ? v >= 8 : v <= 3) ? 'rd-bad' : (campo === 'fatiga' ? v >= 6 : v <= 5) ? 'rd-warn' : 'rd-ok';
    const celda = (campo, v) => `<td><span class="rd-badge ${color(campo, v)}">${v}/10</span></td>`;
    cont.innerHTML = `
        <p class="salud-regla">Fatiga: cuanto más baja, mejor. Sueño y recuperación: cuanto más altos, mejor.</p>
        <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Fatiga</th><th>Sueño</th><th>Recuperación</th><th>Notas del atleta</th></tr></thead><tbody>
            ${registros.slice(0, 14).map(s => `<tr>
                <td>${formatFecha(String(s.fecha))}</td>
                ${celda('fatiga', s.fatiga)}${celda('sueno', s.sueno)}${celda('recuperacion', s.recuperacion)}
                <td>${s.notas ? escapeHtml(s.notas) : '—'}</td>
            </tr>`).join('')}
        </tbody></table></div>`;
}
