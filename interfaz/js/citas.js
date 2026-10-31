/* =============================================
   VitalTraining — citas.js
   El atleta pide cita con su médico o su nutricionista (los de su equipo o el que le asignó
   el administrador); el profesional la confirma o la rechaza desde su panel "Citas".
============================================= */

const CITA_ESTADOS = {
    pendiente:  { etiqueta: 'Pendiente',  clase: 'badge-media' },
    confirmada: { etiqueta: 'Confirmada', clase: 'badge-baja' },
    rechazada:  { etiqueta: 'Rechazada',  clase: 'badge-critica' },
    cancelada:  { etiqueta: 'Cancelada',  clase: 'badge-critica' },
    realizada:  { etiqueta: 'Realizada',  clase: 'badge-info' },
};
const _citas = { profesionales: [], horas: [] };

function citaFecha(f) {
    const d = new Date(`${f}T12:00:00Z`);
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

function citaEstadoBadge(estado) {
    const e = CITA_ESTADOS[estado] || { etiqueta: estado, clase: '' };
    return `<span class="badge ${e.clase}">${e.etiqueta}</span>`;
}

const citaRol = rol => (['Medico', 'Médico'].includes(rol) ? '🩺 Médico' : '🥗 Nutricionista');
const citaFutura = (c, hoy) => c.fecha > hoy.fecha || (c.fecha === hoy.fecha && c.hora >= hoy.hora);

/** Una cita en la lista. quien: 'atleta' (ve al profesional) o 'profesional' (ve al atleta). */
function citaTarjeta(c, quien, hoy) {
    const otro = quien === 'atleta' ? `${escapeHtml(c.profesional.nombre)} · ${citaRol(c.profesional.rol)}` : escapeHtml(c.atleta.nombre);
    const futura = citaFutura(c, hoy);
    const botones = [];
    if (quien === 'profesional' && c.estado === 'pendiente') {
        botones.push(`<button class="btn btn-primary btn-sm" onclick="citaCambiar(${c.id},'confirmada')">✓ Confirmar</button>`);
        botones.push(`<button class="btn btn-ghost btn-sm" onclick="citaCambiar(${c.id},'rechazada')">Rechazar</button>`);
    }
    if (quien === 'profesional' && c.estado === 'confirmada' && !futura) botones.push(`<button class="btn btn-ghost btn-sm" onclick="citaCambiar(${c.id},'realizada')">✓ Realizada</button>`);
    if (['pendiente', 'confirmada'].includes(c.estado) && futura) botones.push(`<button class="btn btn-ghost btn-sm" onclick="citaCambiar(${c.id},'cancelada')">Cancelar</button>`);
    return `
    <div class="cita-tarjeta cita-${c.estado}">
        <div class="cita-cuando"><strong>${c.hora}</strong><span>${escapeHtml(citaFecha(c.fecha))}</span></div>
        <div class="cita-info">
            <div class="cita-titulo">${otro} ${citaEstadoBadge(c.estado)}</div>
            <div class="cita-detalle">${c.modalidad === 'virtual' ? '💻 Virtual' : '📍 Presencial'} · ${escapeHtml(c.motivo)}</div>
            ${c.respuesta ? `<div class="cita-respuesta">💬 ${escapeHtml(c.respuesta)}</div>` : ''}
        </div>
        ${botones.length ? `<div class="cita-botones">${botones.join('')}</div>` : ''}
    </div>`;
}

function citaListas(citas, quien, hoy) {
    const proximas = citas.filter(c => citaFutura(c, hoy) && ['pendiente', 'confirmada'].includes(c.estado));
    // En la agenda del profesional, las confirmadas que ya pasaron esperan "Realizada"
    const porCerrar = quien === 'profesional' ? citas.filter(c => !citaFutura(c, hoy) && c.estado === 'confirmada') : [];
    const resto = citas.filter(c => !proximas.includes(c) && !porCerrar.includes(c)).reverse();
    const bloque = (titulo, lista, vacio) => `
        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h2>${titulo} (${lista.length})</h2></div>
            <div class="card-body cita-lista">${lista.length ? lista.map(c => citaTarjeta(c, quien, hoy)).join('') : `<p class="msg-ayuda">${vacio}</p>`}</div>
        </div>`;
    return bloque('📅 Próximas', proximas, quien === 'atleta' ? 'No tienes citas por delante.' : 'No tienes citas por delante.')
        + (porCerrar.length ? bloque('✅ Por cerrar', porCerrar, '') : '')
        + bloque('🗂 Historial', resto.slice(0, 30), 'Aquí verás tus citas pasadas, canceladas o rechazadas.');
}

// ── Atleta ─────────────────────────────────────────

async function pfRenderCitas() {
    const main = document.getElementById('pf-content');
    const [data, prof] = await Promise.all([
        apiFetch(`${API}/citas`).then(r => r.json()).catch(() => null),
        apiFetch(`${API}/citas/profesionales`).then(r => r.json()).catch(() => null),
    ]);
    if (!data?.ok) { main.innerHTML = showError('No se pudieron cargar tus citas.', "pfRenderView('citas')"); return; }
    _citas.profesionales = prof?.profesionales || [];
    _citas.horas = prof?.horas || [];
    const sinProfesionales = !_citas.profesionales.length;
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>📅 Mis citas</h1><p>Pide cita con tu médico o tu nutricionista</p></div>
            ${sinProfesionales ? '' : '<button class="btn btn-primary" onclick="citaModalPedir()">+ Pedir cita</button>'}
        </div>
        ${sinProfesionales ? `<div class="ev-aviso ev-aviso-info">Aún no tienes médico ni nutricionista. Únete a tu equipo con su código (Mi Perfil → Mi equipo) o pide al administrador que te asigne uno.</div>` : `
        <div class="cita-profesionales">${_citas.profesionales.map(p => `<span class="eq-chip">${citaRol(p.rol)} · ${escapeHtml(p.nombre)}</span>`).join('')}</div>`}
        ${citaListas(data.citas, 'atleta', data.hoy)}
    </div>`;
}

function citaModalPedir() {
    const hoy = new Date();
    const local = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const max = new Date(hoy.getTime() + 60 * 86400000);
    openModal('📅 Pedir cita', `
        <div class="cita-form">
            <div class="form-group"><label for="cita-prof">¿Con quién?</label>
                <select id="cita-prof" onchange="citaCargarHoras()">${_citas.profesionales.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)} · ${citaRol(p.rol)}</option>`).join('')}</select></div>
            <div class="form-row">
                <div class="form-group"><label for="cita-fecha">Día</label>
                    <input type="date" id="cita-fecha" min="${local(hoy)}" max="${local(max)}" value="${local(new Date(hoy.getTime() + 86400000))}" onchange="citaCargarHoras()"></div>
                <div class="form-group"><label for="cita-hora">Hora</label><select id="cita-hora"></select></div>
            </div>
            <div class="form-group"><label>Modalidad</label>
                <div class="cita-modalidad">
                    <label><input type="radio" name="cita-modalidad" value="presencial" checked> 📍 Presencial</label>
                    <label><input type="radio" name="cita-modalidad" value="virtual"> 💻 Virtual</label>
                </div></div>
            <div class="form-group"><label for="cita-motivo">Motivo</label>
                <textarea id="cita-motivo" rows="3" maxlength="500" placeholder="Ej: molestia en la rodilla al correr, ajustar mi plan de comidas para el torneo…"></textarea></div>
            <div id="cita-error" class="auth-error hidden"></div>
            <button class="btn btn-primary" onclick="citaEnviar()">Pedir cita</button>
            <p class="msg-ayuda">El profesional confirmará la cita y te llegará un aviso.</p>
        </div>`);
    enSegundoPlano(citaCargarHoras());
}

async function citaCargarHoras() {
    const prof = document.getElementById('cita-prof')?.value;
    const fecha = document.getElementById('cita-fecha')?.value;
    const sel = document.getElementById('cita-hora');
    if (!sel || !prof || !fecha) return;
    sel.innerHTML = '<option>Cargando…</option>';
    const res = await apiFetch(`${API}/citas/ocupadas?profesionalId=${encodeURIComponent(prof)}&fecha=${encodeURIComponent(fecha)}`).then(r => r.json()).catch(() => null);
    const ocupadas = new Set(res?.ocupadas || []);
    const libres = _citas.horas.filter(h => !ocupadas.has(h));
    sel.innerHTML = libres.length ? libres.map(h => `<option>${h}</option>`).join('') : '<option value="">No quedan horas ese día</option>';
}

async function citaEnviar() {
    const v = id => document.getElementById(id)?.value || '';
    const datos = {
        profesionalId: Number(v('cita-prof')), fecha: v('cita-fecha'), hora: v('cita-hora'),
        modalidad: document.querySelector('input[name="cita-modalidad"]:checked')?.value || 'presencial', motivo: v('cita-motivo').trim(),
    };
    const err = document.getElementById('cita-error');
    const res = await apiFetch(`${API}/citas`, { method: 'POST', body: JSON.stringify(datos) }).then(r => r.json()).catch(() => null);
    if (!res?.ok) { err.textContent = res?.error || 'No se pudo pedir la cita.'; err.classList.remove('hidden'); return; }
    closeModal();
    showToast('Cita pedida ✓ Te avisaremos cuando la confirmen');
    enSegundoPlano(pfRenderCitas());
}

// ── Médico y nutricionista ─────────────────────────

let _citasContenedor = null;

async function citasRenderProfesional(contenedorId) {
    _citasContenedor = contenedorId;
    const main = document.getElementById(contenedorId);
    main.innerHTML = showLoading();
    const data = await apiFetch(`${API}/citas`).then(r => r.json()).catch(() => null);
    if (!data?.ok) { main.innerHTML = showError('No se pudieron cargar tus citas.', `citasRenderProfesional('${contenedorId}')`); return; }
    const pendientes = data.citas.filter(c => c.estado === 'pendiente' && citaFutura(c, data.hoy)).length;
    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>📅 Citas</h1><p>${pendientes ? `${pendientes} ${pendientes === 1 ? 'solicitud espera' : 'solicitudes esperan'} tu respuesta` : 'Tu agenda con tus atletas'}</p></div>
            <button class="btn btn-ghost" onclick="citasRenderProfesional('${contenedorId}')">Actualizar</button>
        </div>
        ${citaListas(data.citas, 'profesional', data.hoy)}
    </div>`;
}

const CITA_PREGUNTA = {
    confirmada: '¿Quieres dejarle una indicación? (opcional, por ejemplo: "Trae tus exámenes")',
    rechazada: '¿Por qué no puedes atenderla? (opcional, por ejemplo: "Ese día no estoy, pide el jueves")',
    cancelada: '¿Motivo de la cancelación? (opcional)',
};

async function citaCambiar(id, estado) {
    let respuesta = '';
    if (CITA_PREGUNTA[estado]) {
        const texto = prompt(CITA_PREGUNTA[estado], '');
        if (texto === null) return; // canceló el cuadro
        respuesta = texto;
    }
    const res = await apiFetch(`${API}/citas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado, respuesta }) }).then(r => r.json()).catch(() => null);
    if (!res?.ok) return showToast(res?.error || 'No se pudo cambiar la cita.', 'error');
    showToast(`Cita ${CITA_ESTADOS[estado].etiqueta.toLowerCase()} ✓`);
    if (currentUser && ['Atleta', 'Futbolista'].includes(currentUser.rol)) enSegundoPlano(pfRenderCitas());
    else if (_citasContenedor) enSegundoPlano(citasRenderProfesional(_citasContenedor));
}
