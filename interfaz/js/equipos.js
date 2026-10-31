/* =============================================
   VitalTraining — equipos.js
   Equipos del club: el admin los crea y asigna atletas y profesionales;
   el atleta se une con un código. Un profesional solo ve a los atletas de sus equipos.
============================================= */

const EQ_ES_ATLETA = rol => ['Atleta', 'Futbolista'].includes(rol);
const EQ_ES_PROFESIONAL = rol => ['Nutricionista', 'Entrenador', 'Medico', 'Médico'].includes(rol);
let _eqEquipos = [];

/** Etiquetas con los equipos de un atleta, para las listas del médico y el nutricionista. */
function eqChips(equipos) {
    return (equipos || []).map(e => `<span class="eq-chip">👥 ${escapeHtml(e)}</span>`).join('');
}

// ── Administrador ──────────────────────────────────

async function renderEquipos() {
    const main = document.getElementById('content');
    const [data, usuarios] = await Promise.all([
        apiFetch(`${API}/equipos`).then(r => r.json()).catch(() => null),
        apiFetch(`${API}/usuarios`).then(r => r.json()).catch(() => [])
    ]);
    if (!data?.ok) { main.innerHTML = showError('No se pudieron cargar los equipos.', "renderView('equipos')"); return; }
    const { equipos, sinEquipo } = data;
    _eqEquipos = equipos;
    const activos = (Array.isArray(usuarios) ? usuarios : []).filter(u => u.estado === 'Activo' && (EQ_ES_ATLETA(u.rol) || EQ_ES_PROFESIONAL(u.rol)));

    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Equipos</h1><p>${equipos.length ? `${equipos.length} ${equipos.length === 1 ? 'equipo' : 'equipos'}` : 'Aún no hay equipos'}</p></div>
            <button class="btn btn-primary" onclick="eqModalEquipo()">+ Nuevo equipo</button>
        </div>
        <div class="eq-info">
            ${equipos.length
                ? '🔒 <strong>Cada nutricionista y médico solo ve a los atletas de sus equipos</strong> (y solo ellos pueden escribirse). Tú, como administrador, ves a todos.'
                : 'ℹ️ <strong>Mientras no haya equipos, todos los profesionales ven a todos los atletas.</strong> Al crear el primero, cada nutricionista y médico pasará a ver solo a los atletas de sus equipos: añade a los profesionales a sus equipos antes de repartir los códigos.'}
            <div class="eq-info-sub">Los atletas se unen solos con el <strong>código del equipo</strong> (en Mi Perfil). A los profesionales los añades tú.</div>
        </div>
        ${equipos.length && sinEquipo.length ? `
        ${eqSinEquipoHTML(sinEquipo, activos)}` : ''}
        <div class="eq-grid">
            ${equipos.length ? equipos.map(e => eqTarjeta(e, activos)).join('') : `
            <div class="card empty-state" style="grid-column:1/-1"><p>Crea tu primer equipo: por ejemplo "Primer equipo", "Sub-17" o "Grupo de running".</p></div>`}
        </div>
    </div>`;
}

/** Atletas sin equipo: el admin les asigna un médico o nutricionista (los ve, les escribe y les da citas). */
function eqSinEquipoHTML(sinEquipo, activos) {
    const profesionales = activos.filter(u => ['Nutricionista', 'Medico', 'Médico', 'Entrenador'].includes(u.rol));
    const filas = sinEquipo.map(a => {
        const asignados = a.asignados || [];
        const libres = profesionales.filter(p => !asignados.some(x => x.id === Number(p.id)));
        return `
        <div class="eq-sin-fila">
            <div class="eq-sin-nombre"><strong>${escapeHtml(a.nombre)}</strong>
                ${asignados.length ? asignados.map(p => `<span class="eq-persona">${escapeHtml(p.nombre)} <small>${escapeHtml(normalizeDisplayRole(p.rol))}</small>
                    <button type="button" title="Quitar" aria-label="Quitar a ${escapeHtml(p.nombre)}" onclick="eqQuitarAsignacion(${a.id},${p.id})">✕</button></span>`).join('') : '<small class="eq-sin-nadie">Sin profesional</small>'}
            </div>
            ${libres.length ? `<select onchange="if(this.value) eqAsignar(${a.id}, this.value)" aria-label="Asignar profesional a ${escapeHtml(a.nombre)}">
                <option value="">+ Asignar profesional…</option>${libres.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} (${escapeHtml(normalizeDisplayRole(p.rol))})</option>`).join('')}</select>` : ''}
        </div>`;
    }).join('');
    const sinNadie = sinEquipo.filter(a => !(a.asignados || []).length).length;
    return `
        <div class="card eq-sin-equipo">
            <div class="card-header"><h2>🧍 Atletas sin equipo (${sinEquipo.length})</h2></div>
            <div class="card-body">
                <p class="msg-ayuda">${sinNadie ? `⚠️ ${sinNadie} sin profesional: nadie los ve ni pueden pedir citas. ` : ''}Asígnales un médico o nutricionista: los verá, podrán escribirse y pedirle citas, sin tener que crear un equipo.</p>
                ${filas}
            </div>
        </div>`;
}

async function eqAsignar(atletaId, profesionalId) {
    if (await eqPedir(`${API}/equipos/asignaciones`, 'POST', { atletaId, profesionalId: Number(profesionalId) })) { showToast('Profesional asignado ✓'); enSegundoPlano(renderEquipos()); }
}

async function eqQuitarAsignacion(atletaId, profesionalId) {
    if (!confirm('¿Quitar este profesional al atleta? Dejará de verlo y de recibir sus citas.')) return;
    if (await eqPedir(`${API}/equipos/asignaciones/${atletaId}/${profesionalId}`, 'DELETE')) { showToast('Asignación quitada'); enSegundoPlano(renderEquipos()); }
}

function eqPersona(e, m) {
    return `<span class="eq-persona">${escapeHtml(m.nombre)}${EQ_ES_PROFESIONAL(m.rol) ? ` <small>${escapeHtml(normalizeDisplayRole(m.rol))}</small>` : ''}
        <button type="button" title="Quitar del equipo" aria-label="Quitar a ${escapeHtml(m.nombre)}" onclick="eqQuitar(${e.id},${m.id})">✕</button></span>`;
}

function eqTarjeta(e, activos) {
    const dentro = new Set([...e.atletas, ...e.profesionales].map(m => m.id));
    const opciones = rol => activos.filter(u => !dentro.has(Number(u.id)) && (rol === 'atleta' ? EQ_ES_ATLETA(u.rol) : EQ_ES_PROFESIONAL(u.rol)))
        .map(u => `<option value="${u.id}">${escapeHtml(u.nombre)}${rol === 'profesional' ? ` · ${escapeHtml(normalizeDisplayRole(u.rol))}` : ''}</option>`).join('');
    return `
    <div class="card eq-card">
        <div class="card-header">
            <h2>${e.deporte ? getSportIcon(e.deporte) : '👥'} ${escapeHtml(e.nombre)}</h2>
            <div class="eq-acciones">
                <button class="btn btn-ghost btn-sm" onclick="eqModalEquipo(${e.id})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="eqEliminar(${e.id})">Eliminar</button>
            </div>
        </div>
        <div class="card-body eq-body">
            <div class="eq-codigo">
                <div><span class="eq-lab">Código para unirse</span><strong class="eq-codigo-valor">${escapeHtml(e.codigo)}</strong></div>
                <button class="btn btn-ghost btn-sm" onclick="eqCopiar('${escapeHtml(e.codigo)}')">Copiar</button>
                <button class="btn btn-ghost btn-sm" title="El código anterior deja de servir" onclick="eqRenovar(${e.id})">Cambiar código</button>
            </div>
            <div>
                <span class="eq-lab">🩺 Profesionales (${e.profesionales.length})</span>
                <div class="eq-personas">${e.profesionales.map(m => eqPersona(e, m)).join('') || '<span class="ls-vacio">Nadie todavía: sin profesionales, nadie ve a estos atletas.</span>'}</div>
                ${opciones('profesional') ? `<select class="eq-anadir" onchange="eqAgregar(${e.id},this)"><option value="">+ Añadir entrenador, nutricionista o médico…</option>${opciones('profesional')}</select>` : ''}
            </div>
            <div>
                <span class="eq-lab">🏅 Atletas (${e.atletas.length})</span>
                <div class="eq-personas">${e.atletas.map(m => eqPersona(e, m)).join('') || '<span class="ls-vacio">Sin atletas. Comparte el código o añádelos aquí.</span>'}</div>
                ${opciones('atleta') ? `<select class="eq-anadir" onchange="eqAgregar(${e.id},this)"><option value="">+ Añadir atleta…</option>${opciones('atleta')}</select>` : ''}
            </div>
        </div>
    </div>`;
}

function eqModalEquipo(id = null) {
    const equipo = id ? _eqEquipos.find(e => e.id === id) : null;
    openModal(equipo ? 'Editar equipo' : 'Nuevo equipo', `
        <div class="form-group"><label>Nombre *</label><input type="text" id="eq-nombre" maxlength="100" placeholder="Ej.: Sub-17, Primer equipo" value="${escapeHtml(equipo?.nombre || '')}"></div>
        <div class="form-group"><label>Deporte</label><select id="eq-deporte"><option value="">Varios deportes</option>${DEPORTES_APP.map(d => `<option value="${d}" ${equipo?.deporte === d ? 'selected' : ''}>${getSportIcon(d)} ${d}</option>`).join('')}</select></div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="eqGuardar(${equipo?.id || 'null'})">Guardar</button></div>`);
    setTimeout(() => document.getElementById('eq-nombre')?.focus(), 50);
}

async function eqPedir(url, metodo, cuerpo) {
    const res = await apiFetch(url, { method: metodo, body: cuerpo ? JSON.stringify(cuerpo) : undefined }).then(r => r.json()).catch(() => null);
    if (!res?.ok) showToast(res?.error || 'No se pudo completar la acción.', 'error');
    return res?.ok ? res : null;
}

async function eqGuardar(id) {
    const nombre = document.getElementById('eq-nombre')?.value.trim();
    const deporte = document.getElementById('eq-deporte')?.value || null;
    if (!nombre) return showToast('Escribe el nombre del equipo.', 'error');
    if (!(await eqPedir(`${API}/equipos${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', { nombre, deporte }))) return;
    closeModal();
    showToast(id ? 'Equipo actualizado' : 'Equipo creado');
    enSegundoPlano(renderEquipos());
}

async function eqEliminar(id) {
    if (!confirm('¿Eliminar este equipo? Sus atletas quedarán sin equipo y sus profesionales dejarán de verlos.')) return;
    if (await eqPedir(`${API}/equipos/${id}`, 'DELETE')) { showToast('Equipo eliminado'); enSegundoPlano(renderEquipos()); }
}

async function eqRenovar(id) {
    if (!confirm('¿Cambiar el código? El anterior dejará de servir; quien ya está en el equipo sigue dentro.')) return;
    if (await eqPedir(`${API}/equipos/${id}/codigo`, 'POST')) { showToast('Código nuevo listo'); enSegundoPlano(renderEquipos()); }
}

async function eqAgregar(id, select) {
    const userId = Number(select.value);
    if (!userId) return;
    select.disabled = true;
    if (await eqPedir(`${API}/equipos/${id}/miembros`, 'POST', { userId })) showToast('Añadido al equipo');
    enSegundoPlano(renderEquipos());
}

async function eqQuitar(id, userId) {
    if (await eqPedir(`${API}/equipos/${id}/miembros/${userId}`, 'DELETE')) { showToast('Quitado del equipo'); enSegundoPlano(renderEquipos()); }
}

function eqCopiar(codigo) {
    navigator.clipboard?.writeText(codigo).then(() => showToast(`Código ${codigo} copiado`)).catch(() => showToast(`Código: ${codigo}`));
}

/** Aviso del dashboard del admin: atletas a los que no ve ningún profesional. */
async function eqAvisoDashboard() {
    const data = await apiFetch(`${API}/equipos`).then(r => r.json()).catch(() => null);
    if (!data?.ok || !data.equipos.length || !data.sinEquipo.length) return '';
    const n = data.sinEquipo.length;
    return `<div class="ls-aviso rd-warn"><div>⚠️ <strong>${n} ${n === 1 ? 'atleta sin equipo' : 'atletas sin equipo'}</strong>: ningún nutricionista ni médico ${n === 1 ? 'lo' : 'los'} ve.
        <button type="button" class="enlace-atleta" onclick="renderView('equipos')">Asignar →</button></div></div>`;
}

// ── Atleta (Mi Perfil) ──────────────────────────────

async function eqRenderAtleta(contenedorId) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    const data = await apiFetch(`${API}/equipos/mios`).then(r => r.json()).catch(() => null);
    const equipos = data?.equipos || [];
    cont.innerHTML = `
        ${equipos.map(e => `
        <div class="eq-mio">
            <strong>${e.deporte ? getSportIcon(e.deporte) : '👥'} ${escapeHtml(e.nombre)}</strong>
            <div class="eq-lab">Te acompañan</div>
            <div class="eq-personas">${e.profesionales.map(p => `<span class="eq-persona">${escapeHtml(p.nombre)} <small>${escapeHtml(normalizeDisplayRole(p.rol))}</small></span>`).join('') || '<span class="ls-vacio">Tu club aún no asignó nutricionista ni médico.</span>'}</div>
        </div>`).join('') || '<p class="ls-vacio">Aún no estás en ningún equipo. Si tu club te dio un código, escríbelo aquí para que tu nutricionista y tu médico te vean.</p>'}
        <div class="eq-unirse">
            <input type="text" id="eq-codigo" maxlength="8" placeholder="Código (6 letras o números)" autocomplete="off" style="text-transform:uppercase">
            <button class="btn btn-primary btn-sm" onclick="eqUnirse('${contenedorId}')">${equipos.length ? 'Cambiar de equipo' : 'Unirme'}</button>
        </div>`;
}

async function eqUnirse(contenedorId) {
    const codigo = document.getElementById('eq-codigo')?.value.trim();
    if (!codigo) return showToast('Escribe el código que te dio tu club.', 'error');
    const res = await eqPedir(`${API}/equipos/unirse`, 'POST', { codigo });
    if (!res) return;
    showToast(`¡Ya estás en ${res.equipo.nombre}! 🎉`);
    enSegundoPlano(eqRenderAtleta(contenedorId));
}
