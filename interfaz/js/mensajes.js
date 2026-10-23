/* =============================================
   VitalTraining — mensajes.js
   Chat directo entre roles y contadores de mensajes sin leer.
============================================= */

// — MENSAJES (chat directo entre roles) —
// Quién puede hablar con quién lo decide el servidor (servidor/api/mensajes/mensajes.permisos.js)
const MSG_ROL = {
    Atleta:        { grupo:'Atletas',        etiqueta:'Atleta' },
    Nutricionista: { grupo:'Nutricionistas', etiqueta:'Nutricionista' },
    Medico:        { grupo:'Médicos',        etiqueta:'Médico' },
    Administrador: { grupo:'Administración', etiqueta:'Administración' }
};
// Orden de los grupos de contactos según quién mira
const MSG_ORDEN_GRUPOS = {
    Atleta:        ['Nutricionista', 'Medico'],
    Nutricionista: ['Atleta', 'Medico', 'Administrador'],
    Medico:        ['Atleta', 'Nutricionista', 'Administrador'],
    Administrador: ['Nutricionista', 'Medico']
};
const MSG_BADGE_POR_ROL = {
    Atleta: 'badge-pf-mensajes', Nutricionista: 'badge-nt-soporte', Medico: 'badge-md-mensajes', Administrador: 'badge-soporte'
};

let _msg = { contenedor:null, contactos:[], activo:null, filtro:'', ultimoId:null };
let badgeInterval = null;

function msgRolActual() {
    const r = normalizeRole(currentUser?.rol);
    return r === 'Médico' ? 'Medico' : r;
}

function setNavBadge(id, n) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = n > 99 ? '99+' : n;
    el.classList.toggle('visible', n > 0);
    el.classList.toggle('hidden', !(n > 0));
}

function msgHora(fecha) {
    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
}

function msgDia(fecha) {
    const d = new Date(fecha), hoy = new Date();
    const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CO', { day:'numeric', month:'short' });
}

function msgAvatar(id, nombre, extra = '') {
    const [c1, c2] = avatarColor(nombre);
    return `<span class="msg-avatar ${extra}" style="background:linear-gradient(135deg,${c1},${c2})">${avatarContenido(id, nombre)}</span>`;
}

/** Monta la bandeja de mensajes dentro del elemento indicado. */
async function msgMontar(contenedorId) {
    const el = document.getElementById(contenedorId);
    if (!el) return;
    _msg = { contenedor:contenedorId, contactos:[], activo:null, filtro:'', ultimoId:null };
    el.innerHTML = `
    <div class="msg-box" id="msg-box">
        <aside class="msg-lista">
            <div class="msg-buscar"><input type="text" id="msg-buscar" placeholder="Buscar persona..." oninput="msgFiltrar(this.value)" aria-label="Buscar persona"></div>
            <div id="msg-contactos" class="msg-contactos">${showLoading()}</div>
        </aside>
        <section class="msg-chat" id="msg-chat">
            <div class="msg-chat-vacio"><div class="msg-chat-vacio-icono">💬</div><p>Elige a alguien de la lista para empezar a conversar.</p></div>
        </section>
    </div>`;
    await msgCargarContactos();
    startPolling(msgRefrescar, 8);
}

async function msgCargarContactos() {
    const data = await apiFetch(`${API}/mensajes/contactos`).then(r => r.json()).catch(() => null);
    _msg.contactos = data?.contactos || [];
    msgPintarContactos();
}

function msgFiltrar(texto) {
    _msg.filtro = texto.toLowerCase();
    msgPintarContactos();
}

function msgPintarContactos() {
    const lista = document.getElementById('msg-contactos');
    if (!lista) return;
    const visibles = _msg.contactos.filter(c => !_msg.filtro || c.nombre.toLowerCase().includes(_msg.filtro));
    if (!_msg.contactos.length) {
        lista.innerHTML = `<p class="msg-sin-contactos">No hay personas disponibles para chatear.</p>`;
        return;
    }
    const grupos = (MSG_ORDEN_GRUPOS[msgRolActual()] || []).map(rol => {
        const items = visibles.filter(c => c.rol === rol);
        if (!items.length) return '';
        return `
        <div class="msg-grupo">
            <div class="msg-grupo-titulo">${MSG_ROL[rol]?.grupo || rol}</div>
            ${items.map(c => `
            <button class="msg-contacto ${c.id === _msg.activo ? 'activo' : ''} ${c.noLeidos ? 'con-noleidos' : ''}" onclick="msgAbrir(${c.id})">
                ${msgAvatar(c.id, c.nombre)}
                <span class="msg-contacto-info">
                    <span class="msg-contacto-nombre">${escapeHtml(c.nombre)}</span>
                    <span class="msg-contacto-ultimo">${c.ultimoMensaje ? (c.ultimoMensaje.mio ? 'Tú: ' : '') + escapeHtml(c.ultimoMensaje.texto) : 'Sin mensajes todavía'}</span>
                </span>
                <span class="msg-contacto-lado">
                    ${c.ultimoMensaje ? `<span class="msg-contacto-hora">${msgDia(c.ultimoMensaje.fecha) === 'Hoy' ? msgHora(c.ultimoMensaje.fecha) : msgDia(c.ultimoMensaje.fecha)}</span>` : ''}
                    ${c.noLeidos ? `<span class="msg-noleidos">${c.noLeidos}</span>` : ''}
                </span>
            </button>`).join('')}
        </div>`;
    }).join('');
    lista.innerHTML = grupos || `<p class="msg-sin-contactos">Nadie coincide con “${escapeHtml(_msg.filtro)}”.</p>`;
}

async function msgAbrir(id) {
    _msg.activo = id;
    _msg.ultimoId = null;
    document.getElementById('msg-box')?.classList.add('msg-con-chat');
    const chat = document.getElementById('msg-chat');
    const contacto = _msg.contactos.find(c => c.id === id);
    if (!chat || !contacto) return;
    chat.innerHTML = `
        <header class="msg-chat-header">
            <button class="msg-volver" onclick="msgCerrarChat()" aria-label="Volver a la lista">←</button>
            ${msgAvatar(contacto.id, contacto.nombre)}
            <div class="msg-chat-quien"><strong>${escapeHtml(contacto.nombre)}</strong><span>${MSG_ROL[contacto.rol]?.etiqueta || contacto.rol}</span></div>
        </header>
        <div class="msg-mensajes" id="msg-mensajes">${showLoading()}</div>
        <form class="msg-enviar" onsubmit="msgEnviar(event)">
            <textarea id="msg-texto" rows="1" maxlength="1000" placeholder="Escribe un mensaje..." aria-label="Mensaje"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.form.requestSubmit();}"></textarea>
            <button type="submit" class="btn btn-primary">Enviar</button>
        </form>`;
    contacto.noLeidos = 0;
    msgPintarContactos();
    await msgCargarConversacion(true);
    document.getElementById('msg-texto')?.focus();
    enSegundoPlano(msgActualizarBadges());
}

function msgCerrarChat() {
    _msg.activo = null;
    document.getElementById('msg-box')?.classList.remove('msg-con-chat');
    msgPintarContactos();
}

async function msgCargarConversacion(forzar = false) {
    const id = _msg.activo;
    if (!id) return;
    const data = await apiFetch(`${API}/mensajes/${id}`).then(r => r.json()).catch(() => null);
    const cont = document.getElementById('msg-mensajes');
    if (!cont || id !== _msg.activo) return;
    if (!data?.ok) { cont.innerHTML = `<p class="msg-sin-contactos">${escapeHtml(data?.error || 'No se pudo cargar la conversación.')}</p>`; return; }

    const mensajes = data.mensajes;
    const ultimoId = mensajes.at(-1)?.id ?? 0;
    if (!forzar && ultimoId === _msg.ultimoId) return; // nada nuevo: no tocar la vista
    _msg.ultimoId = ultimoId;

    if (!mensajes.length) {
        cont.innerHTML = `<div class="msg-chat-vacio"><p>Todavía no hay mensajes. ¡Escribe el primero!</p></div>`;
        return;
    }
    let diaAnterior = '';
    cont.innerHTML = mensajes.map(m => {
        const dia = msgDia(m.fecha);
        const separador = dia !== diaAnterior ? `<div class="msg-dia"><span>${dia}</span></div>` : '';
        diaAnterior = dia;
        return `${separador}
        <div class="msg-burbuja ${m.mio ? 'mio' : 'suyo'}">
            <div class="msg-burbuja-texto">${escapeHtml(m.texto)}</div>
            <div class="msg-burbuja-meta">${msgHora(m.fecha)}${m.mio ? `<span class="msg-visto ${m.leido ? 'leido' : ''}" title="${m.leido ? 'Leído' : 'Enviado'}">${m.leido ? '✓✓' : '✓'}</span>` : ''}</div>
        </div>`;
    }).join('');
    cont.scrollTop = cont.scrollHeight;
}

async function msgEnviar(event) {
    event.preventDefault();
    const input = document.getElementById('msg-texto');
    const texto = input?.value.trim();
    if (!texto || !_msg.activo) return;
    const boton = event.target.querySelector('button[type=submit]');
    boton.disabled = true;
    const res = await apiFetch(`${API}/mensajes/${_msg.activo}`, { method:'POST', body:JSON.stringify({ texto }) })
        .then(r => r.json()).catch(() => null);
    boton.disabled = false;
    if (!res?.ok) return showToast(res?.error || 'No se pudo enviar el mensaje', 'error');
    input.value = '';
    input.focus();
    await Promise.all([msgCargarConversacion(true), msgCargarContactos()]);
}

/** Se ejecuta cada pocos segundos mientras la bandeja está abierta. */
async function msgRefrescar() {
    if (!document.getElementById('msg-box')) return stopPolling(); // el usuario se fue a otra vista
    await Promise.all([msgCargarContactos(), msgCargarConversacion()]);
    enSegundoPlano(msgActualizarBadges());
}

async function msgActualizarBadges() {
    if (!currentUser) return;
    const rol = msgRolActual();
    const data = await apiFetch(`${API}/mensajes/no-leidos`).then(r => r.json()).catch(() => null);
    const sinLeer = data?.total || 0;
    if (rol === 'Administrador') {
        // El contador de Soporte suma los mensajes del equipo y los tickets abiertos
        const inc = await apiFetch(`${API}/incidencias`).then(r => r.json()).catch(() => []);
        setNavBadge('badge-soporte', sinLeer + (Array.isArray(inc) ? inc.filter(i => i.estado === 'abierta').length : 0));
    } else {
        setNavBadge(MSG_BADGE_POR_ROL[rol], sinLeer);
    }
}

function startBadgePolling() {
    stopBadgePolling();
    enSegundoPlano(msgActualizarBadges());
    badgeInterval = setInterval(msgActualizarBadges, 30000);
}

function stopBadgePolling() {
    if (badgeInterval) { clearInterval(badgeInterval); badgeInterval = null; }
}
