/* =============================================
   VitalTraining — entrenador.js
   Panel del entrenador ("el profe"): sus atletas, registrar tests físicos (quedan verificados)
   y verificar los récords de fuerza que vio. Así las clasificaciones del equipo son reales.
============================================= */
/* global currentUser:writable -- declarada en comun.js; aquí se le asigna valor */

let _enAtletas = [];

function showPanelEntrenador(user) {
    setTitle('Mis atletas');
    currentUser = user;
    hideAllPanels();
    document.getElementById('panel-entrenador').classList.remove('hidden');
    pintarAvatarPropio();
    document.getElementById('en-nombre').textContent = user.nombre.split(' ').slice(0, 2).join(' ');
    startBadgePolling();
    entRenderView('atletas');
}

function entRenderView(view) {
    closeSidebar();
    stopPolling();
    setTitle(view === 'mensajes' ? 'Mensajes' : 'Mis atletas');
    document.querySelectorAll('#panel-entrenador .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.enView === view));
    if (view === 'mensajes') enSegundoPlano(entRenderMensajes());
    else enSegundoPlano(entRenderAtletas());
}

async function entRenderMensajes() {
    const main = document.getElementById('en-content');
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header"><div class="view-title"><h1>Mensajes</h1><p>Habla con tus atletas, el equipo médico y administración</p></div></div>
        <div id="en-mensajes"></div>
    </div>`;
    await msgMontar('en-mensajes');
}

async function entRenderAtletas() {
    const main = document.getElementById('en-content');
    main.innerHTML = showLoading();
    const [data, mios] = await Promise.all([
        apiFetch(`${API}/rendimiento/equipo`).then(r => r.json()).catch(() => null),
        apiFetch(`${API}/equipos/mios`).then(r => r.json()).catch(() => null),
    ]);
    if (!data?.ok) { main.innerHTML = showError('No se pudieron cargar tus atletas.', 'entRenderAtletas()'); return; }
    const misEquipos = (mios?.equipos || []).filter(e => e.codigo);
    _enAtletas = data.atletas || [];
    const deBaja = _enAtletas.filter(a => a.estadoMedico?.estado === 'no_apto');
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mis atletas</h1><p>${_enAtletas.length} ${_enAtletas.length === 1 ? 'atleta' : 'atletas'} en tus equipos</p></div>
            <button class="btn btn-ghost" onclick="entRenderAtletas()">Actualizar</button>
        </div>
        ${misEquipos.map(e => `
        <div class="en-codigo">
            <div><span class="eq-lab">👥 ${escapeHtml(e.nombre)} · código para invitar a tus atletas</span><strong class="eq-codigo-valor">${escapeHtml(e.codigo)}</strong>
                <div class="eq-info-sub">Al registrarse eligen "Me uno a mi equipo" y escriben este código.</div></div>
            <button class="btn btn-ghost btn-sm" onclick="eqCopiar('${escapeHtml(e.codigo)}')">Copiar</button>
        </div>`).join('')}
        <div class="eq-info">✓ <strong>Tú registras los tests físicos de tus atletas y verificas sus récords de fuerza.</strong>
            <div class="eq-info-sub">Solo las marcas verificadas cuentan en la clasificación del equipo: así nadie sube números falsos.</div></div>
        ${deBaja.length ? `<div class="ls-aviso rd-bad"><strong>⛔ De baja médica (no entrenan):</strong> <div>${deBaja.map(a => escapeHtml(a.nombre)).join(', ')}</div></div>` : ''}
        <div class="card">
            <div class="table-wrap"><table><thead><tr><th>Atleta</th><th>Estado médico</th><th>Listo hoy</th><th>Carga</th><th>Plan</th><th></th></tr></thead><tbody>
                ${_enAtletas.length ? _enAtletas.map(a => `
                <tr class="fila-link" onclick="entVerAtleta(${Number(a.id)})">
                    <td><div class="user-name">${escapeHtml(a.nombre)}</div><div class="user-email">${escapeHtml(a.email)}</div></td>
                    <td>${lsBadgeEstado(a.estadoMedico)}</td>
                    <td>${rdBadgeListo(a.listo)}</td>
                    <td>${rdBadgeRiesgo(a.carga)}</td>
                    <td>${a.cumplimiento?.porcentaje != null ? a.cumplimiento.porcentaje + '%' : '—'}</td>
                    <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();entVerAtleta(${Number(a.id)})">Abrir →</button></td>
                </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><p>${misEquipos.length ? 'Aún no tienes atletas: comparte el código de tu equipo para que se unan.' : 'Aún no tienes atletas. Pide al administrador que te añada a un equipo.'}</p></div></td></tr>`}
            </tbody></table></div>
        </div>
    </div>`;
}

async function entVerAtleta(userId) {
    const main = document.getElementById('en-content');
    const atleta = _enAtletas.find(a => Number(a.id) === Number(userId));
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>${escapeHtml(atleta?.nombre || 'Atleta')}</h1><p>${atleta ? `${lsBadgeEstado(atleta.estadoMedico)} ${rdBadgeListo(atleta.listo)}` : ''}</p></div>
            <button class="btn btn-ghost" onclick="entRenderAtletas()">← Volver</button>
        </div>
        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h2>⏱ Tests físicos</h2><button class="btn btn-primary btn-sm" onclick="evModalRegistrar(${Number(userId)})">+ Registrar resultado</button></div>
            <div class="card-body"><p class="campo-ayuda" style="margin-top:0">Los resultados que registras tú quedan <strong>✓ verificados</strong>.</p><div id="en-tests">${showLoading()}</div></div>
        </div>
        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h2>🏋 Récords de fuerza</h2></div>
            <div class="card-body"><p class="campo-ayuda" style="margin-top:0">El atleta apunta sus series. Si viste la serie de su récord, verifícala para que cuente en la clasificación del equipo.</p><div id="en-fuerza">${showLoading()}</div></div>
        </div>
        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h2>🏅 Rangos</h2></div>
            <div class="card-body"><div id="en-rangos">${showLoading()}</div></div>
        </div>
    </div>`;
    enSegundoPlano(evRender('en-tests', userId, { propio: false }));
    enSegundoPlano(entRenderFuerza(userId));
    enSegundoPlano(rgRenderResumen('en-rangos', userId));
}

async function entRenderFuerza(userId) {
    const cont = document.getElementById('en-fuerza');
    if (!cont) return;
    const data = await apiFetch(`${API}/series/${userId}/records`).then(r => r.json()).catch(() => null);
    const lista = data?.records || [];
    if (!lista.length) { cont.innerHTML = '<p class="ls-vacio">Aún no apunta series.</p>'; return; }
    const kg = v => `${String(v).replace('.', ',')} kg`;
    cont.innerHTML = lista.map(r => {
        const m = r.record;
        return `
        <div class="rg-fila">
            <div class="rg-fila-texto">
                <strong>${escapeHtml(r.ejercicio)}</strong>
                <span class="ls-lesion-sub">${m.peso ? `${kg(m.peso)} × ${m.repeticiones}` : `${m.repeticiones} reps`}${m.e1rm ? ` · ≈ ${kg(m.e1rm)} máx.` : ''} · ${formatFecha(m.fecha)}</span>
            </div>
            ${m.verificado
                ? '<span class="vf-badge vf-ok">✓ Verificado</span>'
                : `<button class="btn btn-primary btn-sm" onclick="entVerificar(${Number(userId)},${Number(m.id)},this)">✓ Lo vi: verificar</button>`}
        </div>`;
    }).join('');
}

async function entVerificar(userId, serieId, boton) {
    if (!confirm('¿Confirmas que viste esta serie tal como está apuntada? Contará como marca verificada.')) return;
    boton.disabled = true;
    const res = await apiFetch(`${API}/series/${userId}/${serieId}/verificar`, { method: 'POST', body: '{}' }).then(r => r.json()).catch(() => null);
    if (!res?.ok) { boton.disabled = false; return showToast(res?.error || 'No se pudo verificar.', 'error'); }
    showToast('Récord verificado ✓');
    enSegundoPlano(entRenderFuerza(userId));
}
