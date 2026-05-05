/* ===========================
   VITAL TRAINING — script.js
   Auth + Panel Admin + Panel Futbolista
=========================== */

const API = '/api';
let chartInstances = {};
let currentUser = null;

// ========================
// AUTH — ESTADO Y SESIÓN
// ========================
function getSession() {
    try { return JSON.parse(sessionStorage.getItem('vt_user')); } catch { return null; }
}
function setSession(user) {
    sessionStorage.setItem('vt_user', JSON.stringify(user));
}
function clearSession() {
    sessionStorage.removeItem('vt_user');
}

function showAuthScreen(screenId) {
    document.querySelectorAll('#auth-screen .auth-container').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(screenId);
    if (el) { el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
}

function showPanel(user) {
    currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('panel-futbolista').classList.add('hidden');
    const panel = document.getElementById('app');
    panel.classList.remove('hidden');

    const initials = user.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('sidebar-name').textContent = user.nombre.split(' ').slice(0, 2).join(' ');

    fetch(`${API}/incidencias`).then(r => r.json()).then(inc => {
        const ab = inc.filter(i => i.estado === 'abierta').length;
        const badge = document.getElementById('badge-soporte');
        if (ab > 0) { badge.textContent = ab; badge.classList.add('visible'); }
    }).catch(() => {});

    renderView('usuarios');
}

function showAuthPanel() {
    currentUser = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('panel-futbolista').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    showAuthScreen('screen-login');
}

// ========================
// LOGIN
// ========================
async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!email || !password) {
        errorEl.textContent = 'Por favor completa todos los campos.';
        errorEl.classList.remove('hidden');
        return;
    }

    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0"></div>';
    btn.disabled = true;
    errorEl.classList.add('hidden');

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.error || 'Error al iniciar sesión';
            errorEl.classList.remove('hidden');
        } else {
            setSession(data.user);
            // Redirige según rol
            if (data.user.rol === 'Futbolista') {
                showPanelFutbolista(data.user);
            } else {
                showPanel(data.user);
            }
        }
    } catch (e) {
        errorEl.textContent = 'No se pudo conectar al servidor.';
        errorEl.classList.remove('hidden');
    } finally {
        btn.innerHTML = '<span>Iniciar sesión</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ['login-email', 'login-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    });
});

// ========================
// REGISTRO
// ========================
function goToStep2() {
    const nombre   = document.getElementById('reg-nombre').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const peso     = document.getElementById('reg-peso').value;
    const altura   = document.getElementById('reg-altura').value;
    const fecha    = document.getElementById('reg-fecha').value;
    const errorEl  = document.getElementById('reg1-error');

    if (!nombre || !email || !password || !peso || !altura || !fecha) {
        errorEl.textContent = 'Completa todos los campos obligatorios.';
        errorEl.classList.remove('hidden');
        return;
    }
    if (password.length < 4) {
        errorEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    showAuthScreen('screen-register-2');
}

async function doRegistro() {
    const nombre          = document.getElementById('reg-nombre').value.trim();
    const email           = document.getElementById('reg-email').value.trim();
    const password        = document.getElementById('reg-password').value;
    const peso            = document.getElementById('reg-peso').value;
    const altura          = document.getElementById('reg-altura').value;
    const fechaNacimiento = document.getElementById('reg-fecha').value;
    const posicion        = document.getElementById('reg-posicion').value;
    const frecuencia      = document.getElementById('reg-frecuencia').value;

    const condiciones = [];
    document.querySelectorAll('.auth-checkboxes input:checked').forEach(cb => {
        condiciones.push(cb.value);
    });

    const errorEl = document.getElementById('reg2-error');

    if (!posicion || !frecuencia) {
        errorEl.textContent = 'Selecciona tu posición y frecuencia de juego.';
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    document.getElementById('reg-loading').classList.remove('hidden');

    try {
        const res = await fetch(`${API}/auth/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, peso, altura, fechaNacimiento, posicion, frecuencia, condiciones })
        });
        const data = await res.json();

        document.getElementById('reg-loading').classList.add('hidden');

        if (!res.ok) {
            errorEl.textContent = data.error || 'Error al crear la cuenta';
            errorEl.classList.remove('hidden');
        } else {
            showAuthScreen('screen-success');
        }
    } catch (e) {
        document.getElementById('reg-loading').classList.add('hidden');
        errorEl.textContent = 'No se pudo conectar al servidor.';
        errorEl.classList.remove('hidden');
    }
}

// ========================
// LOGOUT
// ========================
function doLogout() {
    if (!confirm('¿Cerrar sesión?')) return;
    clearSession();
    Object.values(chartInstances).forEach(c => c.destroy());
    chartInstances = {};
    document.getElementById('app').classList.add('hidden');
    document.getElementById('panel-futbolista').classList.add('hidden');
    showAuthPanel();
}

// ========================
// UTILIDADES
// ========================
function getInitials(name) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function avatarColor(name) {
    const colors = [
        ['#16a34a','#059669'], ['#0ea5e9','#0284c7'],
        ['#8b5cf6','#7c3aed'], ['#f59e0b','#d97706'],
        ['#ef4444','#dc2626'], ['#ec4899','#db2777']
    ];
    let h = 0;
    for (let c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[h];
}

function rolBadge(rol) {
    const map = { 'Futbolista': 'badge-futbolista', 'Nutricionista': 'badge-nutricionista', 'Administrador': 'badge-administrador' };
    return `<span class="badge ${map[rol] || ''}">${rol}</span>`;
}

function estadoBadge(estado) {
    const map = { 'Activo': 'badge-activo', 'Inactivo': 'badge-inactivo' };
    return `<span class="badge ${map[estado] || ''}">${estado}</span>`;
}

function prioridadBadge(p) {
    const map = { 'alta': 'badge-alta', 'media': 'badge-media', 'baja': 'badge-baja', 'critica': 'badge-critica' };
    return `<span class="badge ${map[p] || ''}">${p}</span>`;
}

function incEstadoBadge(e) {
    const map = { 'abierta': 'badge-abierta', 'en progreso': 'badge-en-progreso', 'resuelta': 'badge-resuelta' };
    return `<span class="badge ${map[e] || ''}">${e}</span>`;
}

function showToast(msg, type = 'success') {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2700);
}

function showLoading() {
    return `<div class="loader"><div class="spinner"></div> Cargando...</div>`;
}

// ========================
// MODAL
// ========================
function openModal(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
});

// ========================
// ROUTING (Admin)
// ========================
async function renderView(view) {
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === view);
    });
    const main = document.getElementById('content');
    main.innerHTML = showLoading();
    Object.values(chartInstances).forEach(c => c.destroy());
    chartInstances = {};
    if (view === 'usuarios') await renderUsuarios();
    else if (view === 'reportes') await renderReportes();
    else if (view === 'soporte') await renderSoporte();
}

// ========================
// VISTA: USUARIOS
// ========================
async function renderUsuarios() {
    const users = await fetch(`${API}/usuarios`).then(r => r.json()).catch(() => []);
    const main = document.getElementById('content');
    const activos   = users.filter(u => u.estado === 'Activo').length;
    const inactivos = users.filter(u => u.estado === 'Inactivo').length;

    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title">
                <h1>Gestión de Usuarios</h1>
                <p>${users.length} usuarios registrados en la plataforma</p>
            </div>
            <button class="btn btn-primary" onclick="modalNuevoUsuario()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo usuario
            </button>
        </div>

        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-info"><div class="stat-value">${users.length}</div><div class="stat-label">Total usuarios</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">✅</div><div class="stat-info"><div class="stat-value">${activos}</div><div class="stat-label">Activos</div></div></div>
            <div class="stat-card"><div class="stat-icon red">⏸</div><div class="stat-info"><div class="stat-value">${inactivos}</div><div class="stat-label">Inactivos</div></div></div>
            <div class="stat-card"><div class="stat-icon purple">⚽</div><div class="stat-info"><div class="stat-value">${users.filter(u => u.rol === 'Futbolista').length}</div><div class="stat-label">Futbolistas</div></div></div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2>Listado de usuarios</h2>
                <div class="filters-bar">
                    <div class="search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" id="search-u" placeholder="Buscar por nombre o email..." oninput="filtrarUsuarios()">
                    </div>
                    <select id="filter-rol" onchange="filtrarUsuarios()">
                        <option>Todos los roles</option><option>Futbolista</option><option>Nutricionista</option><option>Administrador</option>
                    </select>
                    <select id="filter-estado" onchange="filtrarUsuarios()">
                        <option>Todos los estados</option><option>Activo</option><option>Inactivo</option>
                    </select>
                </div>
            </div>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead>
                    <tbody id="tabla-usuarios">${renderFilasUsuarios(users)}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

function renderFilasUsuarios(users) {
    if (!users.length) return `<tr><td colspan="4"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>No se encontraron usuarios con estos filtros</p>
    </div></td></tr>`;

    return users.map(u => {
        const [c1, c2] = avatarColor(u.nombre);
        return `
        <tr>
            <td><div class="td-user">
                <div class="user-avatar-sm" style="background:linear-gradient(135deg,${c1},${c2})">${getInitials(u.nombre)}</div>
                <div><div class="user-name">${u.nombre}</div><div class="user-email">${u.email}</div></div>
            </div></td>
            <td>${rolBadge(u.rol)}</td>
            <td>${estadoBadge(u.estado)}</td>
            <td><div class="td-actions">
                <button class="btn btn-ghost btn-sm" onclick="modalEditarUsuario(${u.id})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarUsuario(${u.id}, '${u.nombre.replace(/'/g, "\\'")}')">Eliminar</button>
            </div></td>
        </tr>`;
    }).join('');
}

async function filtrarUsuarios() {
    const q      = document.getElementById('search-u').value;
    const rol    = document.getElementById('filter-rol').value;
    const estado = document.getElementById('filter-estado').value;
    const url = `${API}/usuarios?q=${encodeURIComponent(q)}&rol=${encodeURIComponent(rol)}&estado=${encodeURIComponent(estado)}`;
    const data = await fetch(url).then(r => r.json()).catch(() => []);
    document.getElementById('tabla-usuarios').innerHTML = renderFilasUsuarios(data);
}

function modalNuevoUsuario() {
    openModal('Nuevo usuario', `
        <div class="form-group"><label>Nombre completo</label><input type="text" id="f-nombre" placeholder="Ej: Juan Pérez"></div>
        <div class="form-group"><label>Correo electrónico</label><input type="text" id="f-email" placeholder="juan@email.com"></div>
        <div class="form-row">
            <div class="form-group"><label>Rol</label>
                <select id="f-rol"><option>Futbolista</option><option>Nutricionista</option><option>Administrador</option></select>
            </div>
            <div class="form-group"><label>Estado</label>
                <select id="f-estado"><option>Activo</option><option>Inactivo</option></select>
            </div>
        </div>
        <div class="form-group"><label>Contraseña inicial</label><input type="text" id="f-password" placeholder="Ej: 1234" value="1234"></div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarNuevoUsuario()">Crear usuario</button>
        </div>
    `);
}

async function guardarNuevoUsuario() {
    const nombre   = document.getElementById('f-nombre').value.trim();
    const email    = document.getElementById('f-email').value.trim();
    const rol      = document.getElementById('f-rol').value;
    const estado   = document.getElementById('f-estado').value;
    const password = document.getElementById('f-password').value || '1234';

    if (!nombre || !email) return showToast('Completa todos los campos', 'error');

    const res = await fetch(`${API}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, rol, estado, password })
    });

    if (res.ok) {
        closeModal();
        showToast(`Usuario ${nombre} creado exitosamente`);
        await renderUsuarios();
    } else {
        showToast('Error al crear usuario', 'error');
    }
}

async function modalEditarUsuario(id) {
    const users = await fetch(`${API}/usuarios`).then(r => r.json());
    const u = users.find(x => x.id === id);
    if (!u) return;

    openModal('Editar usuario', `
        <div class="form-group"><label>Nombre completo</label><input type="text" id="f-nombre" value="${u.nombre}"></div>
        <div class="form-group"><label>Correo electrónico</label><input type="text" id="f-email" value="${u.email}"></div>
        <div class="form-row">
            <div class="form-group"><label>Rol</label>
                <select id="f-rol">
                    ${['Futbolista','Nutricionista','Administrador'].map(r => `<option ${r===u.rol?'selected':''}>${r}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Estado</label>
                <select id="f-estado">
                    ${['Activo','Inactivo'].map(e => `<option ${e===u.estado?'selected':''}>${e}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarEdicionUsuario(${id})">Guardar cambios</button>
        </div>
    `);
}

async function guardarEdicionUsuario(id) {
    const nombre = document.getElementById('f-nombre').value.trim();
    const email  = document.getElementById('f-email').value.trim();
    const rol    = document.getElementById('f-rol').value;
    const estado = document.getElementById('f-estado').value;

    if (!nombre || !email) return showToast('Completa todos los campos', 'error');

    const res = await fetch(`${API}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, rol, estado })
    });

    if (res.ok) {
        closeModal();
        showToast('Usuario actualizado');
        await renderUsuarios();
    } else {
        showToast('Error al actualizar usuario', 'error');
    }
}

async function eliminarUsuario(id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`${API}/usuarios/${id}`, { method: 'DELETE' });
    if (res.ok) { showToast(`${nombre} eliminado`); await renderUsuarios(); }
    else showToast('Error al eliminar usuario', 'error');
}

// ========================
// VISTA: REPORTES
// ========================
async function renderReportes() {
    const stats = await fetch(`${API}/reportes`).then(r => r.json()).catch(() => null);
    const main  = document.getElementById('content');
    if (!stats) { main.innerHTML = `<p style="color:red">Error cargando reportes</p>`; return; }

    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Reportes y Estadísticas</h1><p>Métricas globales de la plataforma Vital Training</p></div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-info"><div class="stat-value">${stats.totalUsuarios}</div><div class="stat-label">Total usuarios</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">✅</div><div class="stat-info"><div class="stat-value">${stats.activos}</div><div class="stat-label">Usuarios activos</div></div></div>
            <div class="stat-card"><div class="stat-icon red">🎫</div><div class="stat-info"><div class="stat-value">${stats.totalIncidencias}</div><div class="stat-label">Incidencias totales</div></div></div>
            <div class="stat-card"><div class="stat-icon yellow">🚨</div><div class="stat-info"><div class="stat-value">${stats.incidenciasCriticas}</div><div class="stat-label">Críticas abiertas</div></div></div>
        </div>
        <div class="charts-grid">
            <div class="card"><div class="card-header"><h2>Usuarios por rol</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-roles"></canvas></div></div></div>
            <div class="card"><div class="card-header"><h2>Incidencias por estado</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-incidencias"></canvas></div></div></div>
        </div>
        <div class="card">
            <div class="card-header"><h2>Estado general de la plataforma</h2></div>
            <div style="padding:24px">
                <div class="stats-grid" style="margin-bottom:0">
                    <div class="stat-card"><div class="stat-icon green">⚽</div><div class="stat-info"><div class="stat-value">${stats.porRol.Futbolista}</div><div class="stat-label">Futbolistas</div></div></div>
                    <div class="stat-card"><div class="stat-icon purple">🥗</div><div class="stat-info"><div class="stat-value">${stats.porRol.Nutricionista}</div><div class="stat-label">Nutricionistas</div></div></div>
                    <div class="stat-card"><div class="stat-icon blue">🛡</div><div class="stat-info"><div class="stat-value">${stats.porRol.Administrador}</div><div class="stat-label">Administradores</div></div></div>
                    <div class="stat-card"><div class="stat-icon green">✔</div><div class="stat-info"><div class="stat-value">${stats.incidenciasPorEstado.resuelta || 0}</div><div class="stat-label">Incidencias resueltas</div></div></div>
                </div>
                <div class="insight-box">
                    <strong>📊 Insight automático</strong>
                    ${stats.activos > stats.inactivos
                        ? `El ${Math.round(stats.activos / stats.totalUsuarios * 100)}% de los usuarios están activos. La plataforma muestra buena retención.`
                        : `Hay ${stats.inactivos} usuarios inactivos. Se recomienda revisar y reactivar cuentas.`}
                    ${stats.incidenciasCriticas > 0
                        ? ` Hay <strong>${stats.incidenciasCriticas}</strong> incidencia(s) crítica(s) que requieren atención inmediata.`
                        : ' No hay incidencias críticas activas. ¡Excelente!'}
                </div>
            </div>
        </div>
    </div>`;

    const ctxR = document.getElementById('chart-roles').getContext('2d');
    chartInstances['roles'] = new Chart(ctxR, {
        type: 'doughnut',
        data: {
            labels: ['Futbolista', 'Nutricionista', 'Administrador'],
            datasets: [{ data: [stats.porRol.Futbolista, stats.porRol.Nutricionista, stats.porRol.Administrador], backgroundColor: ['#0ea5e9','#8b5cf6','#f59e0b'], borderWidth: 0, hoverOffset: 6 }]
        },
        options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { family: 'Outfit', size: 13 } } } }, maintainAspectRatio: false }
    });

    const ctxI = document.getElementById('chart-incidencias').getContext('2d');
    const iEst = stats.incidenciasPorEstado;
    chartInstances['incidencias'] = new Chart(ctxI, {
        type: 'bar',
        data: {
            labels: ['Abierta', 'En progreso', 'Resuelta'],
            datasets: [{ label: 'Incidencias', data: [iEst.abierta || 0, iEst['en progreso'] || 0, iEst.resuelta || 0], backgroundColor: ['#fca5a5','#fcd34d','#86efac'], borderRadius: 8, borderSkipped: false }]
        },
        options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'Outfit' } } }, y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Outfit' } }, grid: { color: '#f1f5f9' } } }, maintainAspectRatio: false }
    });
}

// ========================
// VISTA: SOPORTE
// ========================
async function renderSoporte() {
    const incidencias = await fetch(`${API}/incidencias`).then(r => r.json()).catch(() => []);
    const main = document.getElementById('content');
    const abiertas = incidencias.filter(i => i.estado === 'abierta').length;
    const criticas = incidencias.filter(i => i.prioridad === 'critica').length;

    const badge = document.getElementById('badge-soporte');
    if (abiertas > 0) { badge.textContent = abiertas; badge.classList.add('visible'); }
    else badge.classList.remove('visible');

    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Soporte al Usuario</h1><p>${incidencias.length} incidencias en total · ${abiertas} abiertas</p></div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon red">🎫</div><div class="stat-info"><div class="stat-value">${incidencias.length}</div><div class="stat-label">Total incidencias</div></div></div>
            <div class="stat-card"><div class="stat-icon yellow">🔓</div><div class="stat-info"><div class="stat-value">${abiertas}</div><div class="stat-label">Abiertas</div></div></div>
            <div class="stat-card"><div class="stat-icon red">🚨</div><div class="stat-info"><div class="stat-value">${criticas}</div><div class="stat-label">Prioridad crítica</div></div></div>
            <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${incidencias.filter(i => i.estado === 'resuelta').length}</div><div class="stat-label">Resueltas</div></div></div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Bandeja de incidencias</h2>
                <div class="filters-bar">
                    <select id="filter-inc-estado" onchange="filtrarIncidencias()">
                        <option value="Todos">Todos los estados</option>
                        <option value="abierta">Abierta</option>
                        <option value="en progreso">En progreso</option>
                        <option value="resuelta">Resuelta</option>
                    </select>
                    <select id="filter-inc-prioridad" onchange="filtrarIncidencias()">
                        <option value="Todas">Todas las prioridades</option>
                        <option value="critica">Crítica</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                    </select>
                </div>
            </div>
            <div style="padding:16px 20px" id="lista-incidencias">${renderListaIncidencias(incidencias)}</div>
        </div>
    </div>`;
}

function renderListaIncidencias(lista) {
    if (!lista.length) return `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <p>No hay incidencias con estos filtros</p>
    </div>`;

    return lista.map(i => `
    <div class="incidencia-card" onclick="verIncidencia(${i.id})">
        <div>
            <div class="inc-titulo">${i.titulo}</div>
            <div class="inc-meta">
                ${incEstadoBadge(i.estado)}
                ${prioridadBadge(i.prioridad)}
                <span class="badge" style="background:#f1f5f9;color:#64748b">${i.categoria}</span>
                <span class="inc-usuario">👤 ${i.usuario}</span>
            </div>
        </div>
        <div class="inc-actions">
            <span class="inc-fecha">${i.fecha}</span>
            <select class="estado-select" onchange="cambiarEstadoInc(${i.id}, this.value); event.stopPropagation()" onclick="event.stopPropagation()">
                ${['abierta','en progreso','resuelta'].map(e => `<option value="${e}" ${i.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
        </div>
    </div>`).join('');
}

async function filtrarIncidencias() {
    const estado    = document.getElementById('filter-inc-estado').value;
    const prioridad = document.getElementById('filter-inc-prioridad').value;
    const url = `${API}/incidencias?estado=${encodeURIComponent(estado)}&prioridad=${encodeURIComponent(prioridad)}`;
    const data = await fetch(url).then(r => r.json()).catch(() => []);
    document.getElementById('lista-incidencias').innerHTML = renderListaIncidencias(data);
}

async function cambiarEstadoInc(id, estado) {
    const res = await fetch(`${API}/incidencias/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
    });
    if (res.ok) showToast(`Estado actualizado: ${estado}`);
    else showToast('Error al actualizar', 'error');
}

async function verIncidencia(id) {
    const incidencias = await fetch(`${API}/incidencias`).then(r => r.json());
    const inc = incidencias.find(i => i.id === id);
    if (!inc) return;

    const comentariosHTML = inc.comentarios.length
        ? inc.comentarios.map(c => `
            <div class="comment-item">
                <div class="comment-meta"><span class="comment-author">${c.autor}</span><span>${c.fecha}</span></div>
                <div class="comment-text">${c.texto}</div>
            </div>`).join('')
        : `<p style="font-size:13px;color:var(--text-muted)">Sin comentarios aún.</p>`;

    openModal(inc.titulo, `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            ${incEstadoBadge(inc.estado)}
            ${prioridadBadge(inc.prioridad)}
            <span class="badge" style="background:#f1f5f9;color:#64748b">${inc.categoria}</span>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">
            Reportado por <strong>${inc.usuario}</strong> el ${inc.fecha}
        </div>
        <div class="detail-desc">${inc.descripcion}</div>
        <div class="comments-section">
            <h4>Comentarios (${inc.comentarios.length})</h4>
            <div id="comments-list">${comentariosHTML}</div>
            <div class="comment-form">
                <textarea id="nuevo-comentario" placeholder="Añadir respuesta del equipo..."></textarea>
                <button class="btn btn-primary btn-sm" onclick="enviarComentario(${inc.id})" style="align-self:flex-end">Enviar</button>
            </div>
        </div>
    `);
}

async function enviarComentario(incId) {
    const texto = document.getElementById('nuevo-comentario').value.trim();
    if (!texto) return showToast('Escribe un comentario', 'error');
    const res = await fetch(`${API}/incidencias/${incId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto })
    });
    if (res.ok) { showToast('Comentario enviado'); await verIncidencia(incId); }
    else showToast('Error al enviar comentario', 'error');
}

// ============================================
// PANEL FUTBOLISTA
// ============================================

function showPanelFutbolista(user) {
    currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('panel-futbolista').classList.remove('hidden');

    const initials = user.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    document.getElementById('pf-avatar').textContent = initials;
    document.getElementById('pf-nombre').textContent = user.nombre.split(' ').slice(0, 2).join(' ');

    pfRenderView('dashboard');
}

function pfRenderView(view) {
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.pfView === view);
    });
    const main = document.getElementById('pf-content');
    main.innerHTML = showLoading();
    if (view === 'dashboard')  pfRenderDashboard();
    else if (view === 'perfil')    pfRenderPerfil();
    else if (view === 'historial') pfRenderHistorial();
}

// — DASHBOARD —
async function pfRenderDashboard() {
    const userId = currentUser.id;
    const data = await fetch(`${API}/panel/${userId}/dashboard`).then(r => r.json()).catch(() => null);
    const main = document.getElementById('pf-content');

    if (!data?.ok) {
        main.innerHTML = `<p style="color:red;padding:24px">Error cargando el dashboard.</p>`;
        return;
    }

    const { perfil, ultimasComidas, ultimasRutinas, alertasRecientes } = data.resumen;

    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title">
                <h1>Bienvenido, ${perfil?.nombre || currentUser.nombre} ⚽</h1>
                <p>Aquí tienes tu resumen del día</p>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon blue">🍽</div>
                <div class="stat-info">
                    <div class="stat-value">${ultimasComidas.length}</div>
                    <div class="stat-label">Comidas recientes</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green">🏃</div>
                <div class="stat-info">
                    <div class="stat-value">${ultimasRutinas.length}</div>
                    <div class="stat-label">Rutinas recientes</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon yellow">🔔</div>
                <div class="stat-info">
                    <div class="stat-value">${alertasRecientes.filter(a => !a.leida).length}</div>
                    <div class="stat-label">Alertas sin leer</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple">📍</div>
                <div class="stat-info">
                    <div class="stat-value">${perfil?.posicion || '—'}</div>
                    <div class="stat-label">Tu posición</div>
                </div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card">
                <div class="card-header"><h2>🍽 Últimas comidas</h2></div>
                <div style="padding:16px">
                    ${ultimasComidas.length
                        ? ultimasComidas.map(c => `
                            <div class="incidencia-card" style="cursor:default">
                                <div>
                                    <div class="inc-titulo">${c.nombre}</div>
                                    <div class="inc-meta">
                                        <span class="badge" style="background:#f0fdf4;color:#16a34a">${c.tipo}</span>
                                        <span class="badge" style="background:#f1f5f9;color:#64748b">${c.calorias} kcal</span>
                                    </div>
                                </div>
                                <span class="inc-fecha">${c.fecha}</span>
                            </div>`).join('')
                        : `<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin comidas registradas aún.</p>`}
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="pfRenderView('historial')">Ver todo →</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h2>🏃 Últimas rutinas</h2></div>
                <div style="padding:16px">
                    ${ultimasRutinas.length
                        ? ultimasRutinas.map(r => `
                            <div class="incidencia-card" style="cursor:default">
                                <div>
                                    <div class="inc-titulo">${r.nombre}</div>
                                    <div class="inc-meta">
                                        <span class="badge" style="background:#eff6ff;color:#0ea5e9">${r.tipo}</span>
                                        <span class="badge" style="background:#f1f5f9;color:#64748b">${r.duracionMinutos} min</span>
                                        <span class="badge" style="background:#fdf4ff;color:#8b5cf6">${r.intensidad}</span>
                                    </div>
                                </div>
                                <span class="inc-fecha">${r.fecha}</span>
                            </div>`).join('')
                        : `<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin rutinas registradas aún.</p>`}
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="pfRenderView('historial')">Ver todo →</button>
                </div>
            </div>
        </div>

        ${alertasRecientes.length ? `
        <div class="card">
            <div class="card-header"><h2>🔔 Alertas recientes</h2></div>
            <div style="padding:16px">
                ${alertasRecientes.map(a => `
                    <div class="incidencia-card" style="cursor:default;${!a.leida ? 'border-left:3px solid #f59e0b' : ''}">
                        <div>
                            <div class="inc-titulo">${a.mensaje}</div>
                            <div class="inc-meta">
                                <span class="badge" style="background:#fef9c3;color:#b45309">${a.tipo}</span>
                                ${!a.leida
                                    ? '<span class="badge" style="background:#fef3c7;color:#d97706">Sin leer</span>'
                                    : '<span class="badge" style="background:#f1f5f9;color:#64748b">Leída</span>'}
                            </div>
                        </div>
                        <span class="inc-fecha">${a.fecha}</span>
                    </div>`).join('')}
            </div>
        </div>` : ''}
    </div>`;
}

// — PERFIL —
async function pfRenderPerfil() {
    const userId = currentUser.id;
    const data = await fetch(`${API}/panel/${userId}/perfil`).then(r => r.json()).catch(() => null);
    const main = document.getElementById('pf-content');
    const p = data?.perfil || {};

    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mi Perfil</h1><p>Tu información deportiva personal</p></div>
        </div>
        <div class="card" style="max-width:560px">
            <div class="card-header"><h2>Datos del jugador</h2></div>
            <div style="padding:24px;display:flex;flex-direction:column;gap:16px">
                <div class="form-group">
                    <label>Nombre completo</label>
                    <input type="text" id="pf-f-nombre" value="${p.nombre || currentUser.nombre || ''}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Edad</label>
                        <input type="number" id="pf-f-edad" value="${p.edad || ''}" placeholder="Ej: 22">
                    </div>
                    <div class="form-group">
                        <label>Posición</label>
                        <select id="pf-f-posicion">
                            ${['Portero','Defensa Central','Lateral','Mediocampista','Extremo','Delantero']
                                .map(pos => `<option ${p.posicion === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Peso (kg)</label>
                        <input type="number" id="pf-f-peso" value="${p.peso || ''}" placeholder="Ej: 72">
                    </div>
                    <div class="form-group">
                        <label>Altura (cm)</label>
                        <input type="number" id="pf-f-altura" value="${p.altura || ''}" placeholder="Ej: 178">
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="pfGuardarPerfil()">Guardar cambios</button>
                </div>
            </div>
        </div>
    </div>`;
}

async function pfGuardarPerfil() {
    const userId = currentUser.id;
    const body = {
        nombre:   document.getElementById('pf-f-nombre').value.trim(),
        edad:     Number(document.getElementById('pf-f-edad').value),
        posicion: document.getElementById('pf-f-posicion').value,
        peso:     Number(document.getElementById('pf-f-peso').value),
        altura:   Number(document.getElementById('pf-f-altura').value),
    };

    const res = await fetch(`${API}/panel/${userId}/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        showToast('Perfil actualizado correctamente');
        document.getElementById('pf-nombre').textContent = body.nombre.split(' ').slice(0, 2).join(' ');
    } else {
        showToast('Error al guardar perfil', 'error');
    }
}

// — HISTORIAL —
async function pfRenderHistorial() {
    const userId = currentUser.id;
    const main = document.getElementById('pf-content');

    const [comidas, rutinas, alertas] = await Promise.all([
        fetch(`${API}/panel/${userId}/historial/comidas`).then(r => r.json()).catch(() => ({ datos: [] })),
        fetch(`${API}/panel/${userId}/historial/rutinas`).then(r => r.json()).catch(() => ({ datos: [] })),
        fetch(`${API}/panel/${userId}/historial/alertas`).then(r => r.json()).catch(() => ({ datos: [] }))
    ]);

    main.innerHTML = `
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mi Historial</h1><p>Registro completo de tu actividad</p></div>
        </div>

        <div class="card">
            <div class="card-header"><h2>🍽 Comidas (${comidas.total || 0})</h2></div>
            <div style="padding:16px">
                ${comidas.datos?.length
                    ? comidas.datos.map(c => `
                        <div class="incidencia-card" style="cursor:default">
                            <div>
                                <div class="inc-titulo">${c.nombre}</div>
                                <div class="inc-meta">
                                    <span class="badge" style="background:#f0fdf4;color:#16a34a">${c.tipo}</span>
                                    <span class="badge" style="background:#f1f5f9;color:#64748b">${c.calorias} kcal</span>
                                    <span class="inc-usuario">🕐 ${c.hora}</span>
                                </div>
                            </div>
                            <span class="inc-fecha">${c.fecha}</span>
                        </div>`).join('')
                    : `<p style="color:var(--text-muted);font-size:13px">Sin comidas registradas.</p>`}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2>🏃 Rutinas (${rutinas.total || 0})</h2></div>
            <div style="padding:16px">
                ${rutinas.datos?.length
                    ? rutinas.datos.map(r => `
                        <div class="incidencia-card" style="cursor:default">
                            <div>
                                <div class="inc-titulo">${r.nombre}</div>
                                <div class="inc-meta">
                                    <span class="badge" style="background:#eff6ff;color:#0ea5e9">${r.tipo}</span>
                                    <span class="badge" style="background:#f1f5f9;color:#64748b">${r.duracionMinutos} min</span>
                                    <span class="badge" style="background:#fdf4ff;color:#8b5cf6">${r.intensidad}</span>
                                </div>
                                ${r.descripcion ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${r.descripcion}</div>` : ''}
                            </div>
                            <span class="inc-fecha">${r.fecha}</span>
                        </div>`).join('')
                    : `<p style="color:var(--text-muted);font-size:13px">Sin rutinas registradas.</p>`}
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2>🔔 Alertas (${alertas.total || 0})</h2></div>
            <div style="padding:16px">
                ${alertas.datos?.length
                    ? alertas.datos.map(a => `
                        <div class="incidencia-card" style="cursor:default;${!a.leida ? 'border-left:3px solid #f59e0b' : ''}">
                            <div>
                                <div class="inc-titulo">${a.mensaje}</div>
                                <div class="inc-meta">
                                    <span class="badge" style="background:#fef9c3;color:#b45309">${a.tipo}</span>
                                    ${!a.leida
                                        ? '<span class="badge" style="background:#fef3c7;color:#d97706">Sin leer</span>'
                                        : '<span class="badge" style="background:#f1f5f9;color:#64748b">Leída</span>'}
                                </div>
                            </div>
                            <span class="inc-fecha">${a.fecha}</span>
                        </div>`).join('')
                    : `<p style="color:var(--text-muted);font-size:13px">Sin alertas registradas.</p>`}
            </div>
        </div>
    </div>`;
}

// ========================
// INIT
// ========================
window.addEventListener('load', () => {
    const session = getSession();
    if (session) {
        if (session.rol === 'Futbolista') {
            showPanelFutbolista(session);
        } else {
            showPanel(session);
        }
    }
});