/* =============================================
   VitalTraining — lesiones.js
   Lesiones, estado médico (apto / en recuperación / baja) y notas clínicas.
   El médico las registra; el atleta y el nutricionista las consultan.
============================================= */

const LS_ESTADO = {
    apto:     { clase:'rd-ok',   icono:'✅' },
    adaptado: { clase:'rd-warn', icono:'🩹' },
    no_apto:  { clase:'rd-bad',  icono:'⛔' }
};
const LS_GRAVEDAD = { leve:'Leve', moderada:'Moderada', grave:'Grave' };
// El mensaje del servidor le habla al atleta; al médico y al nutricionista se les describe su situación
const LS_TEXTO_EQUIPO = {
    apto:     'Sin lesiones activas: puede seguir su plan.',
    adaptado: 'En recuperación: entrena adaptado, según tus indicaciones.',
    no_apto:  'De baja: no entrena hasta que le des el alta.'
};
let _lsCatalogos = null;

function lsBadgeEstado(e) {
    const est = LS_ESTADO[e?.estado] || LS_ESTADO.apto;
    return `<span class="rd-badge ${est.clase}">${est.icono} ${escapeHtml(e?.etiqueta || 'Apto')}</span>`;
}

async function lsCargar(userId) {
    const data = await apiFetch(`${API}/lesiones/${userId}`).then(r => r.json()).catch(() => null);
    return data?.ok ? data : null;
}

async function lsCatalogos() {
    if (!_lsCatalogos) {
        const data = await apiFetch(`${API}/lesiones/catalogos`).then(r => r.json()).catch(() => null);
        if (data?.ok) _lsCatalogos = data;
    }
    return _lsCatalogos;
}

// "Tobillo · Ligamento o articulación · Moderada"
function lsTitulo(l) {
    return `${escapeHtml(l.zona)} · ${escapeHtml(l.tipo)} · ${LS_GRAVEDAD[l.gravedad] || escapeHtml(l.gravedad)}`;
}

function lsFechas(l) {
    const partes = [`Desde ${formatFecha(l.fechaInicio)}`];
    if (l.fechaAlta) partes.push(`alta ${formatFecha(l.fechaAlta)}`);
    else if (l.altaEstimada) partes.push(`alta estimada ${formatFecha(l.altaEstimada)}`);
    if (l.registradoPor) partes.push(`por ${escapeHtml(l.registradoPor)}`);
    return partes.join(' · ');
}

function lsRestriccionHTML(l) {
    return l.restriccion === 'no_apto'
        ? '<span class="rd-badge rd-bad">⛔ Baja médica</span>'
        : '<span class="rd-badge rd-warn">🩹 Entreno adaptado</span>';
}

// ── Atleta ──────────────────────────────────────────

/** Tarjeta del dashboard del atleta: lesiones activas e indicaciones del médico (solo si hay algo que mostrar). */
function lsTarjetaAtleta(exp) {
    if (!exp) return '';
    const notas = (exp.notas || []).slice(0, 3);
    if (!exp.activas.length && !notas.length) return '';
    const e = exp.estado;
    return `
    <div class="card ls-tarjeta ${LS_ESTADO[e.estado]?.clase || ''}">
        <div class="card-header"><h2>🩺 Indicaciones de tu médico</h2>${lsBadgeEstado(e)}</div>
        <div class="card-body">
            ${e.estado !== 'apto' ? `<p class="ls-mensaje"><strong>${escapeHtml(e.mensaje)}</strong></p>` : ''}
            ${exp.activas.map(l => `
            <div class="ls-lesion">
                <div class="ls-lesion-titulo">${lsTitulo(l)} ${lsRestriccionHTML(l)}</div>
                <div class="ls-lesion-sub">${lsFechas(l)}</div>
                ${l.indicaciones ? `<div class="ls-indicaciones">📌 ${escapeHtml(l.indicaciones)}</div>` : ''}
            </div>`).join('')}
            ${notas.length ? `<div class="ls-sub">Notas del médico</div>${notas.map(n => `
            <div class="ls-nota"><div>${escapeHtml(n.texto)}</div><div class="ls-lesion-sub">${escapeHtml(n.autor || 'Médico')} · ${formatFecha(String(n.fecha))}</div></div>`).join('')}` : ''}
            <button class="btn btn-ghost btn-sm" onclick="pfRenderView('soporte')">Escribir a mi médico →</button>
        </div>
    </div>`;
}

/** Aviso encima de la rutina cuando el atleta está lesionado. */
function lsAvisoRutina(exp) {
    const e = exp?.estado;
    if (!e || e.estado === 'apto') return '';
    const indicaciones = exp.activas.map(l => l.indicaciones).filter(Boolean);
    return `
    <div class="ls-aviso ${LS_ESTADO[e.estado].clase}">
        <strong>${LS_ESTADO[e.estado].icono} ${e.estado === 'no_apto'
            ? `Estás de baja médica (${escapeHtml(e.zonas.join(', '))}). Esta rutina queda en pausa hasta que el médico te dé el alta.`
            : `Estás en recuperación (${escapeHtml(e.zonas.join(', '))}). Haz solo lo que te indicó el médico y evita los ejercicios que te molesten.`}</strong>
        ${indicaciones.length ? `<div>📌 ${indicaciones.map(escapeHtml).join(' · ')}</div>` : ''}
    </div>`;
}

// ── Médico (y nutricionista, solo lectura) ──────────

/**
 * Pinta el estado médico, las lesiones y las notas clínicas en un contenedor.
 * editable: botones para registrar, editar y dar el alta (solo el médico).
 */
async function lsRender(contenedorId, userId, { editable = false } = {}) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const exp = await lsCargar(userId);
    if (!exp) { cont.innerHTML = '<p class="ls-vacio">No se pudieron cargar las lesiones.</p>'; return; }
    cont.dataset.lsUser = userId;
    cont.dataset.lsEditable = editable ? '1' : '';

    const activas = exp.activas.map(l => `
        <div class="ls-lesion">
            <div class="ls-lesion-titulo">${lsTitulo(l)} ${lsRestriccionHTML(l)}</div>
            <div class="ls-lesion-sub">${lsFechas(l)}</div>
            ${l.indicaciones ? `<div class="ls-indicaciones">📌 ${escapeHtml(l.indicaciones)}</div>` : ''}
            ${editable ? `<div class="ls-acciones">
                <button class="btn btn-ghost btn-sm" onclick="lsModalLesion('${contenedorId}',${Number(userId)},${l.id})">Editar</button>
                <button class="btn btn-primary btn-sm" onclick="lsDarAlta('${contenedorId}',${Number(userId)},${l.id})">✓ Dar el alta</button>
                <button class="btn btn-danger btn-sm" onclick="lsBorrar('${contenedorId}',${Number(userId)},${l.id})">Borrar</button>
            </div>` : ''}
        </div>`).join('');

    const historial = exp.historial.length ? `
        <details class="ls-historial"><summary>Historial de lesiones (${exp.historial.length})</summary>
            ${exp.historial.map(l => `<div class="ls-lesion ls-lesion-cerrada"><div class="ls-lesion-titulo">${lsTitulo(l)}</div><div class="ls-lesion-sub">${lsFechas(l)}</div></div>`).join('')}
        </details>` : '';

    const notas = exp.notas == null ? '' : `
        <div class="ls-sub">📋 Notas clínicas</div>
        ${editable ? `
        <div class="ls-nota-form">
            <textarea id="${contenedorId}-nota" maxlength="2000" placeholder="Evolución, pruebas pedidas, tratamiento..."></textarea>
            <div class="ls-nota-form-pie">
                <label class="ls-check"><input type="checkbox" id="${contenedorId}-visible" checked> Visible para el atleta</label>
                <button class="btn btn-primary btn-sm" onclick="lsGuardarNota('${contenedorId}',${Number(userId)})">Guardar nota</button>
            </div>
        </div>` : ''}
        ${exp.notas.length ? exp.notas.map(n => `
        <div class="ls-nota">
            <div class="ls-nota-texto">${escapeHtml(n.texto)}</div>
            <div class="ls-lesion-sub">${escapeHtml(n.autor || 'Médico')} · ${formatFecha(String(n.fecha))}${n.visibleAtleta ? '' : ' · 🔒 Solo médicos'}${editable && Number(n.autorId) === Number(currentUser.id) ? ` · <button class="enlace-atleta" onclick="lsBorrarNota('${contenedorId}',${Number(userId)},${n.id})">Borrar</button>` : ''}</div>
        </div>`).join('') : '<p class="ls-vacio">Sin notas clínicas.</p>'}`;

    cont.innerHTML = `
        <div class="ls-estado">${lsBadgeEstado(exp.estado)}<span>${LS_TEXTO_EQUIPO[exp.estado.estado] || ''}</span>
            ${editable ? `<button class="btn btn-primary btn-sm" onclick="lsModalLesion('${contenedorId}',${Number(userId)})">+ Registrar lesión</button>` : ''}
        </div>
        ${activas || '<p class="ls-vacio">Sin lesiones activas.</p>'}
        ${historial}
        ${notas}`;
    cont._lsExp = exp;
}

function lsRecargar(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (cont) enSegundoPlano(lsRender(contenedorId, Number(cont.dataset.lsUser), { editable: !!cont.dataset.lsEditable }));
}

function lsOpciones(lista, actual, etiquetas = {}) {
    return lista.map(v => `<option value="${escapeHtml(v)}" ${v === actual ? 'selected' : ''}>${escapeHtml(etiquetas[v] || v)}</option>`).join('');
}

async function lsModalLesion(contenedorId, userId, lesionId = null) {
    const cat = await lsCatalogos();
    if (!cat) return showToast('No se pudo cargar el formulario.', 'error');
    const l = lesionId ? document.getElementById(contenedorId)?._lsExp?.activas.find(x => x.id === lesionId) : null;
    const hoy = new Date().toISOString().slice(0, 10);
    const restriccion = l?.restriccion || 'no_apto';
    openModal(l ? 'Editar lesión' : 'Registrar lesión', `
        <div class="ls-form-grid">
            <div class="form-group"><label>Zona *</label><select id="ls-zona"><option value="">Elige…</option>${lsOpciones(cat.zonas, l?.zona)}</select></div>
            <div class="form-group"><label>Tipo *</label><select id="ls-tipo"><option value="">Elige…</option>${lsOpciones(cat.tipos, l?.tipo)}</select></div>
            <div class="form-group"><label>Gravedad *</label><select id="ls-gravedad">${lsOpciones(cat.gravedades, l?.gravedad || 'leve', LS_GRAVEDAD)}</select></div>
            <div class="form-group"><label>Inicio</label><input type="date" id="ls-inicio" max="${hoy}" value="${l?.fechaInicio || hoy}"></div>
            <div class="form-group"><label>Alta estimada</label><input type="date" id="ls-alta" value="${l?.altaEstimada || ''}"></div>
        </div>
        <div class="form-group"><label>¿Puede entrenar?</label>
            <div class="rd-opciones">
                <label class="rd-opcion"><input type="radio" name="ls-restriccion" value="no_apto" ${restriccion === 'no_apto' ? 'checked' : ''}><span class="rd-radio"></span>No: baja médica</label>
                <label class="rd-opcion"><input type="radio" name="ls-restriccion" value="adaptado" ${restriccion === 'adaptado' ? 'checked' : ''}><span class="rd-radio"></span>Sí, adaptado</label>
            </div>
        </div>
        <div class="form-group"><label>Indicaciones para el atleta</label>
            <textarea id="ls-indicaciones" maxlength="500" rows="3" placeholder="Ej.: hielo 15 min 3 veces al día, sin saltos ni carrera">${escapeHtml(l?.indicaciones || '')}</textarea>
        </div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="lsGuardarLesion('${contenedorId}',${Number(userId)},${lesionId || 'null'})">Guardar</button></div>`);
}

async function lsGuardarLesion(contenedorId, userId, lesionId) {
    const val = id => document.getElementById(id)?.value || '';
    const datos = {
        zona: val('ls-zona'), tipo: val('ls-tipo'), gravedad: val('ls-gravedad'),
        fechaInicio: val('ls-inicio'), altaEstimada: val('ls-alta'),
        restriccion: document.querySelector('input[name="ls-restriccion"]:checked')?.value || 'no_apto',
        indicaciones: val('ls-indicaciones')
    };
    if (!datos.zona || !datos.tipo) return showToast('Elige la zona y el tipo de lesión.', 'error');
    const res = await apiFetch(`${API}/lesiones/${userId}${lesionId ? `/${lesionId}` : ''}`, {
        method: lesionId ? 'PUT' : 'POST', body: JSON.stringify(datos)
    }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo guardar la lesión.', 'error');
    closeModal();
    showToast(lesionId ? 'Lesión actualizada' : 'Lesión registrada. El atleta ya recibió el aviso.');
    lsRecargar(contenedorId);
}

async function lsDarAlta(contenedorId, userId, lesionId) {
    if (!confirm('¿Dar el alta de esta lesión? El atleta podrá volver a su plan.')) return;
    const res = await apiFetch(`${API}/lesiones/${userId}/${lesionId}/alta`, { method: 'POST', body: '{}' }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo dar el alta.', 'error');
    showToast('Alta registrada ✅');
    lsRecargar(contenedorId);
}

async function lsBorrar(contenedorId, userId, lesionId) {
    if (!confirm('¿Borrar esta lesión? Úsalo solo si se registró por error; para cerrarla, da el alta.')) return;
    const res = await apiFetch(`${API}/lesiones/${userId}/${lesionId}`, { method: 'DELETE' }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo borrar.', 'error');
    showToast('Lesión borrada');
    lsRecargar(contenedorId);
}

async function lsGuardarNota(contenedorId, userId) {
    const texto = document.getElementById(`${contenedorId}-nota`)?.value.trim();
    if (!texto) return showToast('Escribe la nota.', 'error');
    const visibleAtleta = !!document.getElementById(`${contenedorId}-visible`)?.checked;
    const res = await apiFetch(`${API}/lesiones/${userId}/notas`, { method: 'POST', body: JSON.stringify({ texto, visibleAtleta }) })
        .then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo guardar la nota.', 'error');
    showToast('Nota guardada');
    lsRecargar(contenedorId);
}

async function lsBorrarNota(contenedorId, userId, notaId) {
    if (!confirm('¿Borrar esta nota?')) return;
    const res = await apiFetch(`${API}/lesiones/${userId}/notas/${notaId}`, { method: 'DELETE' }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo borrar la nota.', 'error');
    lsRecargar(contenedorId);
}
