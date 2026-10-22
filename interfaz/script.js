/* =============================================
   VITAL SPORTS — script.js
   Auth · Admin · Nutricionista · Multi-deporte
============================================= */

const API = '/api';
let chartInstances = {};
let currentUser    = null;

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// ── Counter animation ──────────────────────────────
function animateCounters(root) {
    root.querySelectorAll('.stat-value, .soporte-stat-val, .paciente-stat-val, .sk-val').forEach(el => {
        const raw = el.textContent.trim();
        const match = raw.match(/^(\d+(\.\d+)?)(.*)?$/);
        if (!match || Number(match[1]) === 0) return;
        const target = parseFloat(match[1]);
        const suffix = match[3] || '';
        const duration = 700;
        const startTime = performance.now();
        const step = (now) => {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = '0' + suffix;
        requestAnimationFrame(step);
    });
}

function setupCounterObservers() {
    ['content', 'nt-content', 'pf-content'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        new MutationObserver(() => {
            requestAnimationFrame(() => animateCounters(el));
        }).observe(el, { childList: true });
    });
}

// Dark mode
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('vt-dark', isDark ? '1' : '0');
}

(function applyDarkOnLoad() {
    if (localStorage.getItem('vt-dark') === '1') {
        document.body.classList.add('dark');
    }
})();
let pollInterval   = null;

function startPolling(fn, segundos = 30) {
    stopPolling();
    pollInterval = setInterval(fn, segundos * 1000);
}

function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

// ── Sesión ─────────────────────────────────────
function getSession()       { try { return JSON.parse(sessionStorage.getItem('vt_user')); } catch { return null; } }
function getToken()         { return sessionStorage.getItem('vt_token') || ''; }
function setSession(u, tok) { sessionStorage.setItem('vt_user', JSON.stringify(u)); sessionStorage.setItem('vt_token', tok); }
function clearSession()     { sessionStorage.removeItem('vt_user'); sessionStorage.removeItem('vt_token'); }

// ── Fetch con token ────────────────────────────
async function apiFetch(url, opts = {}) {
    opts.headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...(opts.headers || {}) };
    const res = await fetch(url, opts);
    if (res.status === 401) { clearSession(); showAuthPanel(); throw new Error('Sesión expirada'); }
    return res;
}

// ── Enrutador de paneles ───────────────────────
function normalizeRole(rol) { return rol === 'Futbolista' ? 'Atleta' : rol; }
const isAtletaRole = (rol) => ['Atleta', 'Futbolista'].includes(rol);

function routeUser(user, token) {
    setSession(user, token);
    currentUser = user;
    hideAllPanels();
    if      (isAtletaRole(user.rol))       showPanelFutbolista(user);
    else if (user.rol === 'Nutricionista') showPanelNutricionista(user);
    else if (['Medico', 'Médico'].includes(user.rol)) showPanelMedico(user);
    else if (user.rol === 'Administrador') showPanel(user);
    else { clearSession(); showAuthPanel(); }
}

function hideAllPanels() {
    ['app','panel-nutricionista','panel-medico','panel-futbolista','auth-screen'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

function showAuthPanel() {
    setTitle('');
    currentUser = null;
    hideAllPanels();
    document.getElementById('auth-screen').classList.remove('hidden');
    showAuthScreen('screen-login');
}

function showAuthScreen(id) {
    document.querySelectorAll('#auth-screen .auth-container').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.style.animation='none'; void el.offsetWidth; el.style.animation=''; }
}

function getSportFieldConfig(deporte) {
    const config = {
        'Fútbol': {
            posicionLabel: 'Posición *',
            posicionOptions: ['Portero','Defensa Central','Lateral','Mediocampista','Extremo','Delantero'],
            frecuenciaLabel: 'Frecuencia de juego *',
            frecuenciaOptions: ['1-2 veces por semana','3-4 veces por semana','5+ veces por semana','Todos los días'],
            pieLabel: 'Pie dominante *',
            pieOptions: ['Derecho','Izquierdo','Ambos']
        },
        'Baloncesto': {
            posicionLabel: 'Posición *',
            posicionOptions: ['Base','Escolta','Alero','Pívot'],
            frecuenciaLabel: 'Sesiones por semana *',
            frecuenciaOptions: ['2-3 veces por semana','4-5 veces por semana','6+ veces por semana','Diario'],
            pieLabel: 'Mano dominante *',
            pieOptions: ['Derecha','Izquierda','Ambas']
        },
        'Tenis': {
            posicionLabel: 'Especialidad *',
            posicionOptions: ['Right-handed','Left-handed','Dobles','Individuales'],
            frecuenciaLabel: 'Frecuencia de entrenamiento *',
            frecuenciaOptions: ['1-2 días por semana','3-4 días por semana','5+ días por semana','Diario'],
            pieLabel: 'Mano dominante *',
            pieOptions: ['Derecha','Izquierda','Ambas']
        }
    };
    return config[deporte] || config['Fútbol'];
}

function updateSportSpecificFields() {
    const deporte = document.getElementById('reg-deporte')?.value || '';
    const posicionLabel = document.getElementById('reg-posicion-label');
    const frecuenciaLabel = document.getElementById('reg-frecuencia-label');
    const pieLabel = document.getElementById('reg-pie-label');
    const posicionSelect = document.getElementById('reg-posicion');
    const frecuenciaSelect = document.getElementById('reg-frecuencia');
    const pieSelect = document.getElementById('reg-pie');

    const choice = getSportFieldConfig(deporte);
    posicionLabel.textContent = choice.posicionLabel;
    frecuenciaLabel.textContent = choice.frecuenciaLabel;
    pieLabel.textContent = choice.pieLabel;

    posicionSelect.innerHTML = `<option value="">${choice.posicionLabel.replace('*','')}</option>${choice.posicionOptions.map(v => `<option value="${v}">${v}</option>`).join('')}`;
    frecuenciaSelect.innerHTML = `<option value="">${choice.frecuenciaLabel.replace('*','')}</option>${choice.frecuenciaOptions.map(v => `<option value="${v}">${v}</option>`).join('')}`;
    pieSelect.innerHTML = `<option value="">${choice.pieLabel.replace('*','')}</option>${choice.pieOptions.map(v => `<option value="${v}">${v}</option>`).join('')}`;
}

// ── Utilidades ─────────────────────────────────
function getInitials(name) { return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase(); }

function formatFecha(str) {
    if (!str) return '—';
    // ISO yyyy-mm-dd → dd/mm/yyyy
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [y,m,d] = str.slice(0,10).split('-');
        return `${d}/${m}/${y}`;
    }
    return str;
}

function avatarColor(name) {
    const c=[['#16a34a','#059669'],['#0ea5e9','#0284c7'],['#8b5cf6','#7c3aed'],['#f59e0b','#d97706'],['#ef4444','#dc2626'],['#ec4899','#db2777']];
    let h=0; for(let x of name) h=(h*31+x.charCodeAt(0))%c.length; return c[h];
}

function normalizeDisplayRole(rol) {
    if (['Futbolista', 'Atleta'].includes(rol)) return 'Atleta';
    return ['Medico', 'Médico'].includes(rol) ? 'Médico' : rol;
}
function getSportIcon(sport) { const map = { 'Fútbol':'⚽', 'Baloncesto':'🏀', 'Tenis':'🎾' }; return map[sport] || '🏅'; }
function getSportLabel(sport) { return sport || 'Deporte'; }
function getSportBadge(sport) { const map = { 'Fútbol':'⚽ Fútbol', 'Baloncesto':'🏀 Baloncesto', 'Tenis':'🎾 Tenis' }; return map[sport] || `🏅 ${sport || 'Deporte'}`; }
function rolBadge(rol)      { const m={'Atleta':'badge-futbolista','Futbolista':'badge-futbolista','Nutricionista':'badge-nutricionista','Administrador':'badge-administrador','Medico':'badge-medico','Médico':'badge-medico'}; return `<span class="badge ${m[rol]||''}">${normalizeDisplayRole(rol)}</span>`; }
function getSportBadgeNeutral(sport) { return getSportBadge(sport || 'Fútbol'); }
function estadoBadge(e)     { const m={'Activo':'badge-activo','Inactivo':'badge-inactivo'}; return `<span class="badge ${m[e]||''}">${e}</span>`; }
function prioridadBadge(p)  { const m={'alta':'badge-alta','media':'badge-media','baja':'badge-baja','critica':'badge-critica'}; return `<span class="badge ${m[p]||''}">${p}</span>`; }
function incEstadoBadge(e)  { const m={'abierta':'badge-abierta','en progreso':'badge-en-progreso','resuelta':'badge-resuelta'}; return `<span class="badge ${m[e]||''}">${e}</span>`; }

function showToast(msg, type='success', ms=2700) {
    document.querySelectorAll('.toast').forEach(t=>t.remove());
    const t=document.createElement('div'); t.className=`toast ${type}`; t.textContent=msg;
    document.body.appendChild(t); setTimeout(()=>t.remove(),ms);
}
function showLoading() {
    const s = (w,h='14px') => `<div class="skeleton" style="height:${h};max-width:${w};margin-bottom:0"></div>`;
    return `
    <div class="view-enter" style="padding:0">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:28px">
            <div class="skeleton" style="width:52px;height:52px;border-radius:50%;flex-shrink:0"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:9px">${s('42%','22px')}${s('26%','11px')}</div>
        </div>
        <div class="sk-stats">
            ${[0,0,0,0].map(()=>`<div class="sk-card"><div class="skeleton" style="width:42px;height:42px;border-radius:10px"></div>${s('50%','26px')}${s('68%','11px')}</div>`).join('')}
        </div>
        <div class="sk-grid">
            ${[0,0].map(()=>`<div class="sk-card">${s('55%','16px')}<div style="height:6px"></div>${[0,0,0].map(()=>`<div style="display:flex;gap:10px;align-items:center;margin-bottom:9px">${s('38%')}${s('20%')}</div>`).join('')}</div>`).join('')}
        </div>
    </div>`;
}

function showEmptyState(icon, titulo, desc, btnLabel='', btnAction='') {
    return `<div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3>${titulo}</h3>
        <p>${desc}</p>
        ${btnLabel ? `<button class="btn btn-primary" style="margin-top:8px" onclick="${btnAction}">${btnLabel}</button>` : ''}
    </div>`;
}

function showError(msg, retryFn='') {
    return `<div class="error-state">
        <div class="error-icon">⚠</div>
        <h3>Algo salió mal</h3>
        <p>${msg || 'No se pudo cargar la información.'}</p>
        ${retryFn ? `<button class="btn btn-danger" style="margin-top:8px" onclick="${retryFn}">Reintentar</button>` : ''}
    </div>`;
}

function setTitle(seccion) {
    document.title = seccion ? `${seccion} — Vital Sports` : 'Vital Sports';
}

function toggleSidebar(panelId) {
    document.getElementById(panelId).classList.toggle('sidebar-open');
}

function closeSidebar() {
    ['app','panel-nutricionista','panel-futbolista'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('sidebar-open');
    });
}

function openModal(title,body) { const ov=document.getElementById('modal-overlay'); document.getElementById('modal-title').textContent=title; document.getElementById('modal-body').innerHTML=body; ov.querySelector('.modal')?.classList.remove('modal-wide'); ov.classList.remove('hidden'); }
function closeModal()          { const ov=document.getElementById('modal-overlay'); ov.classList.add('hidden'); ov.querySelector('.modal').classList.remove('modal-wide'); }
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

// ────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────
async function doLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl  = document.getElementById('login-error');
    const btn      = document.getElementById('login-btn');

    if (!email || !password) { errorEl.textContent='Por favor completa todos los campos.'; errorEl.classList.remove('hidden'); return; }

    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0"></div>';
    btn.disabled  = true; errorEl.classList.add('hidden');

    try {
        const res  = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
        const data = await res.json();
        if (!res.ok) { errorEl.textContent=data.error||'Error al iniciar sesión'; errorEl.classList.remove('hidden'); }
        else          routeUser(data.user, data.token);
    } catch { errorEl.textContent='No se pudo conectar al servidor.'; errorEl.classList.remove('hidden'); }
    finally  { btn.innerHTML='<span>Iniciar sesión</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'; btn.disabled=false; }
}

document.addEventListener('DOMContentLoaded', ()=>{
    ['login-email','login-password'].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); }); });
});

function goToStep2() {
    const nombre=document.getElementById('reg-nombre').value.trim(), email=document.getElementById('reg-email').value.trim(),
          password=document.getElementById('reg-password').value, peso=document.getElementById('reg-peso').value,
          altura=document.getElementById('reg-altura').value, fecha=document.getElementById('reg-fecha').value,
          errorEl=document.getElementById('reg1-error');
    if(!nombre||!email||!password||!peso||!altura||!fecha){errorEl.textContent='Completa todos los campos obligatorios.';errorEl.classList.remove('hidden');return;}
    if(password.length<8){errorEl.textContent='La contraseña debe tener al menos 8 caracteres.';errorEl.classList.remove('hidden');return;}
    errorEl.classList.add('hidden'); showAuthScreen('screen-register-2');
}

async function doRegistro() {
    const nombre=document.getElementById('reg-nombre').value.trim(), email=document.getElementById('reg-email').value.trim(),
          password=document.getElementById('reg-password').value, peso=document.getElementById('reg-peso').value,
          altura=document.getElementById('reg-altura').value, fechaNacimiento=document.getElementById('reg-fecha').value,
          deporte=document.getElementById('reg-deporte').value, posicion=document.getElementById('reg-posicion').value,
          frecuencia=document.getElementById('reg-frecuencia').value, pie=document.getElementById('reg-pie').value,
          objetivo=document.getElementById('reg-objetivo').value, errorEl=document.getElementById('reg2-error');
    if(!deporte||!posicion||!frecuencia||!pie||!objetivo){errorEl.textContent='Completa todos los campos del perfil deportivo.';errorEl.classList.remove('hidden');return;}
    errorEl.classList.add('hidden'); document.getElementById('reg-loading').classList.remove('hidden');
    try {
        const res=await fetch(`${API}/auth/registro`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre,email,password,peso,altura,fechaNacimiento,deporte,posicion,frecuencia,pie,objetivo})});
        const data=await res.json();
        document.getElementById('reg-loading').classList.add('hidden');
        if(!res.ok){errorEl.textContent=data.error||'Error al crear la cuenta';errorEl.classList.remove('hidden');}
        else showAuthScreen('screen-success');
    } catch{document.getElementById('reg-loading').classList.add('hidden');errorEl.textContent='No se pudo conectar al servidor.';errorEl.classList.remove('hidden');}
}

function doLogout() {
    if(!confirm('¿Cerrar sesión?')) return;
    stopPolling();
    stopBadgePolling();
    clearSession(); currentUser=null;
    Object.values(chartInstances).forEach(c=>c.destroy()); chartInstances={};
    showAuthPanel();
}

// ────────────────────────────────────────────────
// PANEL ADMIN
// ────────────────────────────────────────────────
function showPanel(user) {
    setTitle('Dashboard');
    currentUser=user;
    hideAllPanels();
    document.getElementById('app').classList.remove('hidden');
    setupCounterObservers();
    document.getElementById('sidebar-avatar').textContent=getInitials(user.nombre);
    document.getElementById('sidebar-name').textContent=user.nombre.split(' ').slice(0,2).join(' ');
    document.getElementById('sidebar-role').textContent=user.rol;
    startBadgePolling();
    renderView('dashboard');
}

async function renderView(view) {
    closeSidebar();
    const titles = { dashboard:'Dashboard', usuarios:'Usuarios', reportes:'Reportes', soporte:'Soporte' };
    setTitle(titles[view] || view);
    stopPolling();
    document.querySelectorAll('#app .nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    document.getElementById('content').innerHTML=showLoading();
    Object.values(chartInstances).forEach(c=>c.destroy()); chartInstances={};
    if(view==='dashboard')     { await renderDashboardAdmin(); startPolling(renderDashboardAdmin, 30); }
    else if(view==='usuarios') await renderUsuarios();
    else if(view==='reportes') { await renderReportes(); startPolling(renderReportes, 30); }
    else if(view==='soporte')  await renderSoporte();
}

// — DASHBOARD ADMIN —
async function renderDashboardAdmin() {
    const [stats, inc] = await Promise.all([
        apiFetch(`${API}/reportes`).then(r=>r.json()).catch(()=>null),
        apiFetch(`${API}/incidencias`).then(r=>r.json()).catch(()=>[])
    ]);
    const main = document.getElementById('content');
    if (!stats) { main.innerHTML=showError('No se pudo cargar el dashboard.','renderView(\'dashboard\')'); return; }
    const abiertas = inc.filter(i=>i.estado==='abierta').length;
    main.innerHTML=`
    <div class="view-enter">
        <div class="admin-welcome">
            <div class="admin-welcome-text">
                <h2>Bienvenido, ${escapeHtml(currentUser.nombre.split(' ')[0])} 👋</h2>
                <p>Aquí tienes el resumen de la plataforma hoy</p>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;position:relative">
            <div class="admin-welcome-date">${new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'})}</div>
            <div id="live-indicator" style="font-size:11px;opacity:0.6;display:flex;align-items:center;gap:5px"><span style="width:7px;height:7px;background:#4ade80;border-radius:50%;display:inline-block;animation:pulse 2s infinite"></span>En vivo · actualiza cada 30s</div>
        </div>
        </div>
        <div class="stats-grid" style="margin-bottom:24px">
            <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-info"><div class="stat-value">${stats.activos}</div><div class="stat-label">Usuarios activos</div></div></div>
            <div class="stat-card"><div class="stat-icon red">🎫</div><div class="stat-info"><div class="stat-value">${abiertas}</div><div class="stat-label">Tickets abiertos</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">🍽</div><div class="stat-info"><div class="stat-value">${stats.totalComidas}</div><div class="stat-label">Comidas registradas</div></div></div>
            <div class="stat-card"><div class="stat-icon purple">🏃</div><div class="stat-info"><div class="stat-value">${stats.totalRutinas}</div><div class="stat-label">Rutinas registradas</div></div></div>
        </div>
        <div class="charts-grid" style="margin-bottom:24px">
            <div class="card"><div class="card-header"><h2>Actividad últimos 7 días</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-actividad"></canvas></div></div></div>
            <div class="card"><div class="card-header"><h2>Distribución de usuarios</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-roles-dash"></canvas></div></div></div>
        </div>
        ${stats.fatigaPorAtleta.length ? `
        <div class="card"><div class="card-header"><h2>💪 Fatiga actual por atleta</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-fatiga"></canvas></div></div></div>` : ''}
        <div class="charts-grid" style="margin-top:24px">
            <div class="card"><div class="card-header"><h2>Incidencias recientes</h2><button class="btn btn-ghost btn-sm" onclick="renderView('soporte')">Ver todas →</button></div><div style="padding:12px 16px">
                ${inc.slice(0,4).map(i=>`<div class="mini-item" onclick="renderView('soporte')"><div class="mini-item-body"><div class="mini-item-title">${i.titulo}</div><div class="mini-item-sub">${i.usuario} · ${i.fecha}</div></div><div class="mini-item-right">${prioridadBadge(i.prioridad)}</div></div>`).join('')||'<p style="color:var(--text-muted);font-size:13px;padding:4px 0">Sin incidencias</p>'}
            </div></div>
            <div class="card"><div class="card-header"><h2>Estado del sistema</h2></div><div style="padding:20px;display:flex;flex-direction:column;gap:12px">
                ${[['Atletas',stats.porRol.Futbolista,'#0ea5e9'],['Nutricionistas',stats.porRol.Nutricionista,'#8b5cf6'],['Médicos',stats.porRol.Medico||0,'#075985'],['Admins',stats.porRol.Administrador,'#f59e0b']].map(([l,v,c])=>`
                <div class="meter-wrap"><span class="meter-label">${l}</span><div class="meter-bar"><div class="meter-fill" style="width:${stats.totalUsuarios?Math.round(v/stats.totalUsuarios*100):0}%;background:${c}"></div></div><span class="meter-val">${v}</span></div>`).join('')}
                <div class="insight-box" style="margin-top:8px"><strong>📊 Plataforma</strong>${stats.activos} activos · ${stats.totalSalud} registros de salud · ${stats.incidenciasAbiertas} tickets pendientes</div>
            </div></div>
        </div>
    </div>`;
    // Chart actividad
    const act = stats.actividadPorDia;
    chartInstances['act'] = new Chart(document.getElementById('chart-actividad').getContext('2d'),{
        type:'bar',
        data:{labels:act.map(d=>d.dia),datasets:[
            {label:'Comidas',data:act.map(d=>d.comidas),backgroundColor:'#86efac',borderRadius:4,borderSkipped:false},
            {label:'Rutinas',data:act.map(d=>d.rutinas),backgroundColor:'#7dd3fc',borderRadius:4,borderSkipped:false},
            {label:'Salud',data:act.map(d=>d.salud),backgroundColor:'#c4b5fd',borderRadius:4,borderSkipped:false}
        ]},
        options:{plugins:{legend:{position:'bottom',labels:{font:{family:'Outfit',size:12},padding:12}}},scales:{x:{grid:{display:false},ticks:{font:{family:'Outfit'}}},y:{beginAtZero:true,ticks:{stepSize:1,font:{family:'Outfit'}},grid:{color:'#f1f5f9'}}},maintainAspectRatio:false}
    });
    // Chart roles
    chartInstances['rd'] = new Chart(document.getElementById('chart-roles-dash').getContext('2d'),{
        type:'doughnut',
        data:{labels:['Atletas','Nutricionistas','Médicos','Admins'],datasets:[{data:[stats.porRol.Futbolista,stats.porRol.Nutricionista,stats.porRol.Medico||0,stats.porRol.Administrador],backgroundColor:['#0ea5e9','#8b5cf6','#075985','#f59e0b'],borderWidth:0,hoverOffset:6}]},
        options:{cutout:'65%',plugins:{legend:{position:'bottom',labels:{padding:16,font:{family:'Outfit',size:13}}}},maintainAspectRatio:false}
    });
    // Chart fatiga
    if (stats.fatigaPorAtleta.length) {
        const fa = stats.fatigaPorAtleta;
        const canvas = document.getElementById('chart-fatiga');
        const wrap = canvas.parentElement;
        const containerW = wrap.getBoundingClientRect().width || 600;
        const targetW = fa.length * 80;
        if (targetW < containerW) {
            wrap.style.display = 'flex';
            wrap.style.justifyContent = 'center';
            canvas.style.width = Math.max(targetW, 220) + 'px';
        } else {
            wrap.style.overflowX = 'auto';
            canvas.style.width = targetW + 'px';
        }
        chartInstances['fatiga'] = new Chart(canvas.getContext('2d'),{
            type:'bar',
            data:{labels:fa.map(f=>f.nombre.split(' ')[0]),datasets:[{label:'Fatiga',data:fa.map(f=>f.fatiga),backgroundColor:fa.map(f=>f.fatiga>=8?'#fca5a5':f.fatiga>=5?'#fcd34d':'#86efac'),borderColor:fa.map(f=>f.fatiga>=8?'#ef4444':f.fatiga>=5?'#f59e0b':'#22c55e'),borderWidth:1.5,borderRadius:8,borderSkipped:false,maxBarThickness:52}]},
            options:{plugins:{legend:{display:false},tooltip:{callbacks:{title:i=>fa[i[0].dataIndex].nombre,label:i=>`Fatiga: ${i.raw}/10`}}},scales:{x:{grid:{display:false},ticks:{font:{family:'Outfit',size:12}}},y:{beginAtZero:true,max:10,ticks:{stepSize:2,font:{family:'Outfit'}},grid:{color:'#f1f5f9'}}},maintainAspectRatio:false}
        });
    }
}

// — USUARIOS —
async function renderUsuarios() {
    const users=await apiFetch(`${API}/usuarios`).then(r=>r.json()).catch(()=>[]);
    const main=document.getElementById('content');
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Gestión de Usuarios</h1><p>${users.length} usuarios registrados</p></div>
            <button class="btn btn-primary" onclick="modalNuevoUsuario()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo usuario
            </button>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-info"><div class="stat-value">${users.length}</div><div class="stat-label">Total usuarios</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">✅</div><div class="stat-info"><div class="stat-value">${users.filter(u=>u.estado==='Activo').length}</div><div class="stat-label">Activos</div></div></div>
            <div class="stat-card"><div class="stat-icon red">⏸</div><div class="stat-info"><div class="stat-value">${users.filter(u=>u.estado==='Inactivo').length}</div><div class="stat-label">Inactivos</div></div></div>
            <div class="stat-card"><div class="stat-icon purple">⚽</div><div class="stat-info"><div class="stat-value">${users.filter(u=>u.rol==='Futbolista').length}</div><div class="stat-label">Atletas</div></div></div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2>Listado de usuarios</h2>
                <div class="filters-bar">
                    <div class="search-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" id="search-u" placeholder="Buscar..." oninput="filtrarUsuarios()">
                    </div>
                    <select id="filter-rol" onchange="filtrarUsuarios()"><option>Todos los roles</option><option value="Futbolista">Atleta</option><option>Nutricionista</option><option value="Medico">Médico</option><option>Administrador</option></select>
                    <select id="filter-estado" onchange="filtrarUsuarios()"><option>Todos los estados</option><option>Activo</option><option>Inactivo</option></select>
                </div>
            </div>
            <div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th style="text-align:right">Acciones</th></tr></thead><tbody id="tabla-usuarios">${renderFilasUsuarios(users)}</tbody></table></div>
        </div>
    </div>`;
}

function renderFilasUsuarios(users) {
    if(!users.length) return `<tr><td colspan="4"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>Sin resultados</p></div></td></tr>`;
    return users.map(u=>{
        const[c1,c2]=avatarColor(u.nombre);
        return `<tr><td><div class="td-user"><div class="user-avatar-sm" style="background:linear-gradient(135deg,${c1},${c2})">${getInitials(u.nombre)}</div><div><div class="user-name">${escapeHtml(u.nombre)}</div><div class="user-email">${escapeHtml(u.email)}</div></div></div></td><td>${rolBadge(u.rol)}</td><td>${estadoBadge(u.estado)}</td><td><div class="td-actions"><button class="btn btn-ghost btn-sm" data-tooltip="Editar usuario" onclick="modalEditarUsuario(${u.id})">✏ Editar</button><button class="btn btn-danger btn-sm" data-tooltip="Eliminar permanentemente" onclick="eliminarUsuario(${u.id},'${u.nombre.replace(/'/g,"\\'")}')">✕ Eliminar</button></div></td></tr>`;
    }).join('');
}

async function filtrarUsuarios() {
    const q=document.getElementById('search-u').value, rol=document.getElementById('filter-rol').value, estado=document.getElementById('filter-estado').value;
    const data=await apiFetch(`${API}/usuarios?q=${encodeURIComponent(q)}&rol=${encodeURIComponent(rol)}&estado=${encodeURIComponent(estado)}`).then(r=>r.json()).catch(()=>[]);
    document.getElementById('tabla-usuarios').innerHTML=renderFilasUsuarios(data);
}

function modalNuevoUsuario() {
    openModal('Nuevo usuario',`
        <div class="form-group"><label>Nombre completo</label><input type="text" id="f-nombre" placeholder="Ej: Juan Pérez"></div>
        <div class="form-group"><label>Correo electrónico</label><input type="text" id="f-email" placeholder="juan@email.com"></div>
        <div class="form-row">
            <div class="form-group"><label>Rol</label><select id="f-rol"><option value="Futbolista">Atleta</option><option>Nutricionista</option><option value="Medico">Médico</option><option>Administrador</option></select></div>
            <div class="form-group"><label>Estado</label><select id="f-estado"><option>Activo</option><option>Inactivo</option></select></div>
        </div>
        <div class="form-group"><label>Contraseña inicial (mín. 8 caracteres)</label><input type="text" id="f-password" placeholder="Mínimo 8 caracteres"></div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="guardarNuevoUsuario()">Crear usuario</button></div>
    `);
}

async function guardarNuevoUsuario() {
    const nombre=document.getElementById('f-nombre').value.trim(), email=document.getElementById('f-email').value.trim(),
          rol=document.getElementById('f-rol').value, estado=document.getElementById('f-estado').value,
          password=document.getElementById('f-password').value;
    if(!nombre||!email) return showToast('Completa todos los campos','error');
    if(!password||password.length<8) return showToast('La contraseña debe tener al menos 8 caracteres','error');
    const res=await apiFetch(`${API}/usuarios`,{method:'POST',body:JSON.stringify({nombre,email,rol,estado,password})});
    if(res.ok){ closeModal(); showToast(`Usuario ${escapeHtml(nombre)} creado correctamente`, 'success'); await renderUsuarios(); }
    else { const d=await res.json().catch(()=>({})); showToast(d.error||'Error al crear usuario','error'); }
}

async function modalEditarUsuario(id) {
    const users=await apiFetch(`${API}/usuarios`).then(r=>r.json());
    const u=users.find(x=>Number(x.id)===Number(id)); if(!u) return;
    openModal('Editar usuario',`
        <div class="form-group"><label>Nombre completo</label><input type="text" id="f-nombre" value="${escapeHtml(u.nombre)}"></div>
        <div class="form-group"><label>Correo electrónico</label><input type="text" id="f-email" value="${escapeHtml(u.email)}"></div>
        <div class="form-row">
            <div class="form-group"><label>Rol</label><select id="f-rol">${['Futbolista','Nutricionista','Medico','Administrador'].map(r=>`<option value="${r}" ${r===u.rol?'selected':''}>${r === 'Futbolista' ? 'Atleta' : r === 'Medico' ? 'Médico' : r}</option>`).join('')}</select></div>
            <div class="form-group"><label>Estado</label><select id="f-estado">${['Activo','Inactivo'].map(e=>`<option ${e===u.estado?'selected':''}>${e}</option>`).join('')}</select></div>
        </div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="guardarEdicionUsuario(${id})">Guardar</button></div>
    `);
}

async function guardarEdicionUsuario(id) {
    const nombre=document.getElementById('f-nombre').value.trim(), email=document.getElementById('f-email').value.trim(),
          rol=document.getElementById('f-rol').value, estado=document.getElementById('f-estado').value;
    if(!nombre||!email) return showToast('Completa todos los campos','error');
    const res=await apiFetch(`${API}/usuarios/${id}`,{method:'PUT',body:JSON.stringify({nombre,email,rol,estado})});
    if(res.ok){closeModal();showToast('Usuario actualizado');await renderUsuarios();}
    else showToast('Error al actualizar','error');
}

async function eliminarUsuario(id,nombre) {
    if(!confirm(`¿Eliminar a ${nombre}?`)) return;
    const res=await apiFetch(`${API}/usuarios/${id}`,{method:'DELETE'});
    if(res.ok){showToast(`${nombre} eliminado`);await renderUsuarios();}
    else showToast('Error al eliminar','error');
}

// — REPORTES —
async function renderReportes() {
    const stats=await apiFetch(`${API}/reportes`).then(r=>r.json()).catch(()=>null);
    const main=document.getElementById('content');
    if(!stats){main.innerHTML=showError('No se pudo cargar los reportes.','renderView(\'reportes\')');return;}
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header"><div class="view-title"><h1>Reportes y Estadísticas</h1><p>Métricas globales de la plataforma</p></div></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon green">👥</div><div class="stat-info"><div class="stat-value">${stats.totalUsuarios}</div><div class="stat-label">Total usuarios</div></div></div>
            <div class="stat-card"><div class="stat-icon blue">✅</div><div class="stat-info"><div class="stat-value">${stats.activos}</div><div class="stat-label">Activos</div></div></div>
            <div class="stat-card"><div class="stat-icon red">🎫</div><div class="stat-info"><div class="stat-value">${stats.totalIncidencias}</div><div class="stat-label">Incidencias</div></div></div>
            <div class="stat-card"><div class="stat-icon yellow">🚨</div><div class="stat-info"><div class="stat-value">${stats.incidenciasCriticas}</div><div class="stat-label">Críticas</div></div></div>
        </div>
        <div class="charts-grid">
            <div class="card"><div class="card-header"><h2>Usuarios por rol</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-roles"></canvas></div></div></div>
            <div class="card"><div class="card-header"><h2>Incidencias por estado</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-incidencias"></canvas></div></div></div>
        </div>
        <div class="card"><div class="card-header"><h2>Estado general</h2></div><div style="padding:24px">
            <div class="stats-grid" style="margin-bottom:0;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
                <div class="stat-card"><div class="stat-icon green">⚽</div><div class="stat-info"><div class="stat-value">${stats.porRol.Futbolista}</div><div class="stat-label">Atletas</div></div></div>
                <div class="stat-card"><div class="stat-icon purple">🥗</div><div class="stat-info"><div class="stat-value">${stats.porRol.Nutricionista}</div><div class="stat-label">Nutricionistas</div></div></div>
                <div class="stat-card"><div class="stat-icon blue">🩺</div><div class="stat-info"><div class="stat-value">${stats.porRol.Medico||0}</div><div class="stat-label">Médicos</div></div></div>
                <div class="stat-card"><div class="stat-icon yellow">🛡</div><div class="stat-info"><div class="stat-value">${stats.porRol.Administrador}</div><div class="stat-label">Administradores</div></div></div>
                <div class="stat-card"><div class="stat-icon green">✔</div><div class="stat-info"><div class="stat-value">${stats.incidenciasPorEstado.resuelta||0}</div><div class="stat-label">Resueltas</div></div></div>
            </div>
            <div class="insight-box"><strong>📊 Insight</strong>
                ${stats.activos>stats.inactivos?`El ${Math.round(stats.activos/stats.totalUsuarios*100)}% de los usuarios están activos.`:`Hay ${stats.inactivos} usuarios inactivos.`}
                ${stats.incidenciasCriticas>0?` <strong>${stats.incidenciasCriticas}</strong> incidencia(s) crítica(s) pendientes.`:' Sin incidencias críticas activas. ¡Excelente!'}
            </div>
        </div></div>
    </div>`;
    chartInstances['roles']=new Chart(document.getElementById('chart-roles').getContext('2d'),{type:'doughnut',data:{labels:['Atleta','Nutricionista','Médico','Administrador'],datasets:[{data:[stats.porRol.Futbolista,stats.porRol.Nutricionista,stats.porRol.Medico||0,stats.porRol.Administrador],backgroundColor:['#0ea5e9','#8b5cf6','#075985','#f59e0b'],borderWidth:0,hoverOffset:6}]},options:{cutout:'65%',plugins:{legend:{position:'bottom',labels:{padding:16,font:{family:'Outfit',size:13}}}},maintainAspectRatio:false}});
    const iEst=stats.incidenciasPorEstado;
    chartInstances['inc']=new Chart(document.getElementById('chart-incidencias').getContext('2d'),{type:'bar',data:{labels:['Abierta','En progreso','Resuelta'],datasets:[{label:'Incidencias',data:[iEst.abierta||0,iEst['en progreso']||0,iEst.resuelta||0],backgroundColor:['#fca5a5','#fcd34d','#86efac'],borderRadius:8,borderSkipped:false}]},options:{plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{family:'Outfit'}}},y:{beginAtZero:true,ticks:{stepSize:1,font:{family:'Outfit'}},grid:{color:'#f1f5f9'}}},maintainAspectRatio:false}});
}

// — SOPORTE (ADMIN) —
async function renderSoporte() {
    const inc=await apiFetch(`${API}/incidencias`).then(r=>r.json()).catch(()=>[]);
    const main=document.getElementById('content');
    const abiertas=inc.filter(i=>i.estado==='abierta').length, criticas=inc.filter(i=>i.prioridad==='critica').length;
    const sinLeer=(await apiFetch(`${API}/mensajes/no-leidos`).then(r=>r.json()).catch(()=>null))?.total||0;
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header"><div class="view-title"><h1>Soporte</h1><p>${sinLeer ? `${sinLeer} ${sinLeer===1?'mensaje':'mensajes'} del equipo sin leer · ` : ''}${inc.length} tickets · ${abiertas} abiertos</p></div></div>
        <div class="card msg-prioridad">
            <div class="card-header">
                <div><h2>⭐ Mensajes del equipo · prioridad</h2><p class="msg-ayuda">Nutricionistas y médicos. Se atienden antes que los tickets de atletas.</p></div>
            </div>
            <div style="padding:16px 20px"><div id="admin-mensajes"></div></div>
        </div>
        <h2 class="msg-seccion-titulo">🎫 Tickets de atletas</h2>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon red">🎫</div><div class="stat-info"><div class="stat-value">${inc.length}</div><div class="stat-label">Total</div></div></div>
            <div class="stat-card"><div class="stat-icon yellow">🔓</div><div class="stat-info"><div class="stat-value">${abiertas}</div><div class="stat-label">Abiertas</div></div></div>
            <div class="stat-card"><div class="stat-icon red">🚨</div><div class="stat-info"><div class="stat-value">${criticas}</div><div class="stat-label">Críticas</div></div></div>
            <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${inc.filter(i=>i.estado==='resuelta').length}</div><div class="stat-label">Resueltas</div></div></div>
        </div>
        <div class="card">
            <div class="card-header"><h2>Bandeja de incidencias</h2>
                <div class="filters-bar">
                    <select id="filter-inc-estado" onchange="filtrarIncidencias()"><option value="Todos">Todos los estados</option><option value="abierta">Abierta</option><option value="en progreso">En progreso</option><option value="resuelta">Resuelta</option></select>
                    <select id="filter-inc-prioridad" onchange="filtrarIncidencias()"><option value="Todas">Todas las prioridades</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select>
                </div>
            </div>
            <div style="padding:16px 20px" id="lista-incidencias">${renderListaIncidencias(inc)}</div>
        </div>
    </div>`;
    msgActualizarBadges();
    await msgMontar('admin-mensajes');
}

function renderListaIncidencias(lista) {
    if(!lista.length) return `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No hay incidencias</p></div>`;
    const CATS_NUTRI = ['Nutrición','Plan alimenticio','Salud','Alimentación'];
    return lista.map(i=>{
        const esNutri = CATS_NUTRI.includes(i.categoria);
        const destBadge = esNutri
            ? `<span class="badge" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0">🥗 Nutricionista</span>`
            : `<span class="badge" style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe">🛠 Soporte</span>`;
        return `
        <div class="incidencia-card" onclick="verIncidencia(${i.id})">
            <div><div class="inc-titulo">${escapeHtml(i.titulo)}</div>
                <div class="inc-meta">${incEstadoBadge(i.estado)}${prioridadBadge(i.prioridad)}${destBadge}<span class="badge" style="background:#f1f5f9;color:#64748b">${escapeHtml(i.categoria)}</span><span class="inc-usuario">👤 ${escapeHtml(i.usuario)}</span></div>
            </div>
            <div class="inc-actions"><span class="inc-fecha">${i.fecha}</span>
                <select class="estado-select" onchange="cambiarEstadoInc(${i.id},this.value);event.stopPropagation()" onclick="event.stopPropagation()">
                    ${['abierta','en progreso','resuelta'].map(e=>`<option value="${e}" ${i.estado===e?'selected':''}>${e}</option>`).join('')}
                </select>
            </div>
        </div>`;
    }).join('');
}

async function filtrarIncidencias() {
    const estado=document.getElementById('filter-inc-estado').value, prioridad=document.getElementById('filter-inc-prioridad').value;
    const data=await apiFetch(`${API}/incidencias?estado=${encodeURIComponent(estado)}&prioridad=${encodeURIComponent(prioridad)}`).then(r=>r.json()).catch(()=>[]);
    document.getElementById('lista-incidencias').innerHTML=renderListaIncidencias(data);
}

async function cambiarEstadoInc(id,estado) {
    const res=await apiFetch(`${API}/incidencias/${id}/estado`,{method:'PUT',body:JSON.stringify({estado})});
    if(res.ok) showToast(`Estado: ${estado}`); else showToast('Error al actualizar','error');
}

async function verIncidencia(id) {
    const inc=await apiFetch(`${API}/incidencias`).then(r=>r.json());
    const i=inc.find(x=>Number(x.id)===Number(id)); if(!i) return;
    const comentariosHTML=i.comentarios.length?i.comentarios.map(c=>`<div class="comment-item"><div class="comment-meta"><span class="comment-author">${escapeHtml(c.autor)}</span><span>${c.fecha}</span></div><div class="comment-text">${escapeHtml(c.texto)}</div></div>`).join(''):`<p style="font-size:13px;color:var(--text-muted)">Sin comentarios aún.</p>`;
    openModal(escapeHtml(i.titulo),`
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${incEstadoBadge(i.estado)}${prioridadBadge(i.prioridad)}<span class="badge" style="background:#f1f5f9;color:#64748b">${escapeHtml(i.categoria)}</span></div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Reportado por <strong>${escapeHtml(i.usuario)}</strong> el ${i.fecha}</div>
        <div class="detail-desc">${escapeHtml(i.descripcion)}</div>
        <div class="comments-section"><h4>Comentarios (${i.comentarios.length})</h4><div id="comments-list">${comentariosHTML}</div>
            <div class="comment-form"><textarea id="nuevo-comentario" placeholder="Añadir respuesta..."></textarea><button class="btn btn-primary btn-sm" onclick="enviarComentario(${i.id})" style="align-self:flex-end">Enviar</button></div>
        </div>
    `);
}

async function enviarComentario(incId) {
    const texto=document.getElementById('nuevo-comentario').value.trim();
    if(!texto) return showToast('Escribe un comentario','error');
    const res=await apiFetch(`${API}/incidencias/${incId}/comentarios`,{method:'POST',body:JSON.stringify({texto})});
    if(res.ok){showToast('Comentario enviado');await verIncidencia(incId);}
    else showToast('Error al enviar','error');
}

// ────────────────────────────────────────────────
// PANEL NUTRICIONISTA
// ────────────────────────────────────────────────
function showPanelNutricionista(user) {
    setTitle('Dashboard');
    currentUser=user;
    hideAllPanels();
    document.getElementById('panel-nutricionista').classList.remove('hidden');
    document.getElementById('nt-avatar').textContent=getInitials(user.nombre);
    document.getElementById('nt-nombre').textContent=user.nombre.split(' ').slice(0,2).join(' ');
    setupCounterObservers();
    ntRenderView('dashboard');
    startBadgePolling();
}

function ntRenderView(view) {
    closeSidebar();
    const titles = { dashboard:'Dashboard', pacientes:'Mis Atletas', soporte:'Mensajes' };
    setTitle(titles[view] || view);
    stopPolling();
    document.querySelectorAll('#panel-nutricionista .nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.ntView===view));
    document.getElementById('nt-content').innerHTML=showLoading();
    if(view==='dashboard') { ntRenderDashboard(); startPolling(ntRenderDashboard, 30); }
    else if(view==='pacientes') ntRenderPacientes();
    else if(view==='soporte')   ntRenderSoporte();
}

function ntActualizarBadgeSoporte() {
    return msgActualizarBadges();
}

async function ntRenderDashboard() {
    const futbolistas = await apiFetch(`${API}/nutricionista/futbolistas`).then(r=>r.json()).catch(()=>[]);
    const main = document.getElementById('nt-content');
    const conSalud   = futbolistas.filter(f=>f.ultimaSalud).length;
    const fatigaAlta = futbolistas.filter(f=>f.ultimaSalud?.fatiga>=8).length;
    const sinDatos   = futbolistas.filter(f=>!f.ultimaSalud).length;
    const conDatos   = futbolistas.filter(f=>f.ultimaSalud);
    const deportes = [...new Set(futbolistas.map(f => f.deporte_principal || f.deporte || 'Fútbol'))];
    main.innerHTML=`
    <div class="view-enter">
        <div class="nutri-welcome">
            <h2>Hola, ${escapeHtml(currentUser.nombre.split(' ')[0])} 🥗</h2>
            <p>Tienes ${futbolistas.length} atletas activos bajo tu seguimiento</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
                ${deportes.map(d => `<span class="badge badge-activo" style="padding:5px 10px;display:inline-flex;align-items:center;gap:6px;">${getSportBadge(d)}</span>`).join('') || '<span class="badge badge-activo">🏅 Sin deportes activos</span>'}
            </div>
        </div>
        <div class="stats-grid" style="margin-bottom:24px">
            <div class="stat-card"><div class="stat-icon purple">⚽</div><div class="stat-info"><div class="stat-value">${futbolistas.length}</div><div class="stat-label">Atletas activos</div></div></div>
            <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-value">${conSalud}</div><div class="stat-label">Con datos de salud</div></div></div>
            <div class="stat-card"><div class="stat-icon red">🔥</div><div class="stat-info"><div class="stat-value">${fatigaAlta}</div><div class="stat-label">Fatiga alta (≥8)</div></div></div>
            <div class="stat-card"><div class="stat-icon yellow">⚠️</div><div class="stat-info"><div class="stat-value">${sinDatos}</div><div class="stat-label">Sin registro</div></div></div>
        </div>
        ${fatigaAlta>0?`<div class="insight-box" style="margin-bottom:24px;border-left-color:#ef4444;background:#fee2e2;color:#991b1b">
            <strong>⚠️ Atención:</strong> ${fatigaAlta} atleta(s) con fatiga ≥ 8. Revisa su estado antes del entrenamiento.
        </div>`:''}
        ${conDatos.length?`
        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>📊 Fatiga del equipo</h2><span style="font-size:12px;color:var(--text-muted)">Último registro por atleta</span></div>
            <div style="padding:20px"><div class="chart-wrap"><canvas id="chart-nt-fatiga"></canvas></div></div>
        </div>`:''}
        <div class="card">
            <div class="card-header"><h2>Estado de tus atletas</h2><button class="btn btn-ghost btn-sm" onclick="ntRenderView('pacientes')">Ver todos →</button></div>
            <div style="padding:12px 16px;display:flex;flex-direction:column;gap:6px">
                ${futbolistas.length?futbolistas.map(f=>{
                    const s=f.ultimaSalud;
                    const color=s?(s.fatiga>=8?'var(--danger)':s.fatiga>=5?'var(--warning)':'var(--primary)'):'var(--text-muted)';
                    const [c1,c2]=avatarColor(f.nombre);
                    return `<div class="mini-item" style="cursor:pointer" onclick="ntVerDetalle(${f.id})">
                        <div class="mini-item-icon" style="background:linear-gradient(135deg,${c1},${c2});color:white;font-weight:700;font-size:11px">${getInitials(f.nombre)}</div>
                        <div class="mini-item-body">
                            <div class="mini-item-title">${escapeHtml(f.nombre)}</div>
                            <div class="mini-item-sub">${escapeHtml(f.perfil?.posicion||'Sin posición')} · ${f.totalComidas} comidas · ${f.totalRutinas} rutinas</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px">
                            <div style="color:${color};font-weight:700;font-family:var(--mono)">${s?s.fatiga+'/10':'—'}</div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>`;
                }).join(''):`<p style="color:var(--text-muted);font-size:13px;padding:8px">Sin atletas activos.</p>`}
            </div>
        </div>
    </div>`;
    if(conDatos.length){
        setTimeout(()=>{
            const ctx=document.getElementById('chart-nt-fatiga')?.getContext('2d');
            if(!ctx) return;
            if(chartInstances['nt-fatiga']){chartInstances['nt-fatiga'].destroy();delete chartInstances['nt-fatiga'];}
            chartInstances['nt-fatiga']=new Chart(ctx,{type:'bar',data:{
                labels:conDatos.map(f=>f.nombre.split(' ')[0]),
                datasets:[
                    {label:'Fatiga',data:conDatos.map(f=>f.ultimaSalud.fatiga),backgroundColor:conDatos.map(f=>f.ultimaSalud.fatiga>=8?'rgba(239,68,68,0.8)':f.ultimaSalud.fatiga>=5?'rgba(245,158,11,0.8)':'rgba(22,163,74,0.8)'),borderRadius:6},
                    {label:'Sueño',data:conDatos.map(f=>f.ultimaSalud.sueno),backgroundColor:'rgba(14,165,233,0.5)',borderRadius:6},
                    {label:'Recuperación',data:conDatos.map(f=>f.ultimaSalud.recuperacion),backgroundColor:'rgba(22,163,74,0.4)',borderRadius:6}
                ]
            },options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:0,max:10,ticks:{stepSize:2}}},plugins:{legend:{position:'bottom'}}}});
        },0);
    }
}

let _ntTodosPacientes = [];

async function ntRenderPacientes() {
    const [pacientes, rendimiento] = await Promise.all([
        apiFetch(`${API}/nutricionista/futbolistas`).then(r=>r.json()).catch(()=>[]),
        rdCargarEquipo()
    ]);
    _ntTodosPacientes = pacientes.map(f => ({ ...f, rendimiento: rendimiento[f.id] || null }));
    const main = document.getElementById('nt-content');
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mis Atletas</h1><p>${_ntTodosPacientes.length} atletas activos</p></div>
            <div class="filters-bar">
                <div class="search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" id="nt-search" placeholder="Buscar atleta..." oninput="ntFiltrarPacientes()" style="width:200px">
                </div>
                <select id="nt-filter-fatiga" onchange="ntFiltrarPacientes()">
                    <option value="">Todos</option>
                    <option value="alta">Fatiga alta (≥8)</option>
                    <option value="media">Fatiga media (4-7)</option>
                    <option value="sin">Sin registro hoy</option>
                </select>
            </div>
        </div>
        <div id="nt-pacientes-grid" class="pacientes-grid">
            ${_ntTodosPacientes.length ? _ntTodosPacientes.map(f=>ntCardFutbolista(f)).join('') :
            `<div class="empty-state" style="grid-column:1/-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>No hay atletas activos</p></div>`}
        </div>
    </div>`;
}

function ntFiltrarPacientes() {
    const q      = document.getElementById('nt-search')?.value.toLowerCase() || '';
    const filtro = document.getElementById('nt-filter-fatiga')?.value || '';
    let lista    = _ntTodosPacientes;
    if (q) lista = lista.filter(f => f.nombre.toLowerCase().includes(q));
    if (filtro === 'alta')  lista = lista.filter(f => f.ultimaSalud?.fatiga >= 8);
    if (filtro === 'media') lista = lista.filter(f => f.ultimaSalud?.fatiga >= 4 && f.ultimaSalud?.fatiga < 8);
    if (filtro === 'sin')   lista = lista.filter(f => !f.ultimaSalud);
    const grid = document.getElementById('nt-pacientes-grid');
    if (grid) grid.innerHTML = lista.length ? lista.map(f=>ntCardFutbolista(f)).join('') :
        `<div class="empty-state" style="grid-column:1/-1"><p>Sin resultados</p></div>`;
}

function ntCardFutbolista(f) {
    const[c1,c2]=avatarColor(f.nombre);
    const salud=f.ultimaSalud;
    const fatigaColor=salud?(salud.fatiga>=7?'var(--danger)':salud.fatiga>=4?'var(--warning)':'var(--primary)'):'var(--text-muted)';
    return `
    <div class="paciente-card" onclick="ntVerDetalle(${f.id})">
        <div class="paciente-header">
            <div class="paciente-avatar" style="background:linear-gradient(135deg,${c1},${c2})">${getInitials(f.nombre)}</div>
            <div class="paciente-info">
                <div class="paciente-nombre">${escapeHtml(f.nombre)}</div>
                <div class="paciente-pos">${escapeHtml(f.posicion||'Sin posición definida')}</div>
            </div>
        </div>
        <div class="paciente-stats">
            <div class="paciente-stat"><span class="paciente-stat-val">${f.totalComidas}</span><span class="paciente-stat-lab">Comidas</span></div>
            <div class="paciente-stat"><span class="paciente-stat-val">${f.totalRutinas}</span><span class="paciente-stat-lab">Rutinas</span></div>
            <div class="paciente-stat"><span class="paciente-stat-val" style="color:${fatigaColor}">${salud?salud.fatiga+'/10':'—'}</span><span class="paciente-stat-lab">Fatiga</span></div>
        </div>
        ${f.rendimiento ? `
        <div class="rd-paciente">
            <div><span class="rd-paciente-lab">Listo hoy</span>${rdBadgeListo(f.rendimiento.listo)}</div>
            <div><span class="rd-paciente-lab">Carga</span>${rdBadgeRiesgo(f.rendimiento.carga)}</div>
            <div><span class="rd-paciente-lab">Plan</span><strong>${f.rendimiento.cumplimiento.porcentaje != null ? f.rendimiento.cumplimiento.porcentaje + '%' : '—'}</strong></div>
        </div>` : ''}
        <div class="paciente-footer">
            <span class="btn btn-ghost btn-sm" style="width:100%;justify-content:center">Ver detalle →</span>
        </div>
    </div>`;
}

async function ntVerDetalle(userId) {
    try {
        const data=await apiFetch(`${API}/nutricionista/futbolistas/${userId}`).then(r=>r.json()).catch(()=>null);
        if(!data?.ok) return showToast('No se pudo cargar el atleta. Intenta de nuevo.','error');
        const d=data.detalle;
        const [c1,c2]=avatarColor(d.nombre);
        const chartId=`chart-nt-sal-${userId}`;

        // Banner de estado de salud
        const ult=d.salud[0]||null;
        let statusBanner='';
        if(!ult){
            statusBanner=`<div class="nt-status nt-status-grey">⚪ Sin registros de salud — invita al atleta a registrar su estado</div>`;
        } else {
            const problemas=[];
            if(ult.fatiga>=8)         problemas.push(`Fatiga alta (${ult.fatiga}/10)`);
            if(ult.recuperacion<=3)   problemas.push(`Recuperación baja (${ult.recuperacion}/10)`);
            if(ult.sueno<=4)          problemas.push(`Poco sueño (${ult.sueno}/10)`);
            if(problemas.length){
                statusBanner=`<div class="nt-status nt-status-red">🔴 Atención: ${problemas.join(' · ')} — Último registro: ${formatFecha(ult.fecha)}</div>`;
            } else {
                statusBanner=`<div class="nt-status nt-status-green">🟢 Estado normal — Último registro: ${formatFecha(ult.fecha)} · Fatiga ${ult.fatiga}/10</div>`;
            }
        }

        const saludHTML=`
            ${statusBanner}
            ${d.salud.length>=2?`<div class="chart-wrap" style="margin-bottom:16px"><canvas id="${chartId}"></canvas></div>`:''}
            ${d.salud.length?d.salud.slice(0,7).map(s=>`
                <div class="salud-row">
                    <span class="salud-fecha">${formatFecha(s.fecha)}</span>
                    <div class="salud-meters">
                        ${saludMeter('Fatiga',s.fatiga,'danger')}
                        ${saludMeter('Sueño',s.sueno,'blue')}
                        ${saludMeter('Recup.',s.recuperacion,'green')}
                    </div>
                    ${s.notas?`<span class="salud-nota">${escapeHtml(s.notas)}</span>`:''}
                </div>`).join(''):`<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin datos de salud registrados.</p>`}`;

        const notasHTML=`
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
                ${d.notas?.length?d.notas.map(n=>`
                    <div class="mini-item mini-item-unread">
                        <div class="mini-item-body">
                            <div class="mini-item-title">${escapeHtml(n.texto)}</div>
                            <div class="mini-item-sub">${escapeHtml(n.nutricionistaNombre)} · ${formatFecha(n.fecha)}</div>
                        </div>
                    </div>`).join(''):`<p style="color:var(--text-muted);font-size:13px">Sin notas aún.</p>`}
            </div>
            <div style="display:flex;gap:8px">
                <textarea id="nt-nueva-nota" placeholder="Escribe una recomendación o nota..." style="flex:1;font-family:var(--font);font-size:13px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;resize:none;height:60px;outline:none"></textarea>
                <button class="btn btn-primary btn-sm" style="align-self:flex-end" onclick="ntGuardarNota(${userId})">Guardar</button>
            </div>`;

        const comidasHTML=`
            <div style="margin-bottom:14px">
                ${d.comidas.length?d.comidas.map(c=>`
                    <div class="mini-item" onclick="verDetalleComida(${JSON.stringify(c).replace(/"/g,'&quot;')})" style="cursor:pointer">
                        <div class="mini-item-icon yellow">🍽</div>
                        <div class="mini-item-body">
                            <div class="mini-item-title">${escapeHtml(c.nombre)}</div>
                            <div class="mini-item-sub">${escapeHtml(c.tipo)}${c.calorias?` · ${escapeHtml(c.calorias)} kcal`:''}${c.proteina?` · ${escapeHtml(c.proteina)}g prot`:''} · ${formatFecha(c.fecha)}${c.registradoPor?' · por '+escapeHtml(c.registradoPor):''}</div>
                        </div>
                        <span style="font-size:12px;color:var(--text-muted)">Ver →</span>
                    </div>`).join(''):`<p style="color:var(--text-muted);font-size:13px">Sin comidas registradas.</p>`}
            </div>
            <details style="border:1px solid var(--border);border-radius:8px;padding:12px">
                <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--primary)">+ Registrar comida</summary>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
                    <div class="form-group" style="margin:0"><label>Nombre *</label><input type="text" id="nt-c-nombre" placeholder="Pollo con arroz"></div>
                    <div class="form-group" style="margin:0"><label>Tipo</label><select id="nt-c-tipo"><option value="desayuno">Desayuno</option><option value="almuerzo" selected>Almuerzo</option><option value="cena">Cena</option><option value="merienda">Merienda</option></select></div>
                    <div class="form-group" style="margin:0"><label>Calorías</label><input type="number" id="nt-c-cals" placeholder="500"></div>
                    <div class="form-group" style="margin:0"><label>Fecha</label><input type="date" id="nt-c-fecha" value="${new Date().toISOString().slice(0,10)}"></div>
                </div>
                <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="ntRegistrarComida(${userId})">Guardar comida</button>
            </details>`;

        const rutinasHTML=`
            <div style="margin-bottom:14px">
                ${d.rutinas.length?d.rutinas.map(r=>`
                    <div class="mini-item" onclick="verDetalleRutina(${JSON.stringify(r).replace(/"/g,'&quot;')})" style="cursor:pointer">
                        <div class="mini-item-icon green">🏃</div>
                        <div class="mini-item-body">
                            <div class="mini-item-title">${escapeHtml(r.nombre)}</div>
                            <div class="mini-item-sub">${escapeHtml(r.tipo)}${r.duracionMinutos?` · ${escapeHtml(r.duracionMinutos)} min`:''}${r.intensidad?` · ${escapeHtml(r.intensidad)}`:''}${r.descripcion?` · ${escapeHtml(r.descripcion)}`:''} · ${formatFecha(r.fecha)}${r.registradoPor?' · por '+escapeHtml(r.registradoPor):''}</div>
                        </div>
                        <span style="font-size:12px;color:var(--text-muted)">Ver →</span>
                    </div>`).join(''):`<p style="color:var(--text-muted);font-size:13px">Sin rutinas registradas.</p>`}
            </div>
            <details style="border:1px solid var(--border);border-radius:8px;padding:12px">
                <summary style="cursor:pointer;font-size:13px;font-weight:600;color:var(--primary)">+ Registrar rutina</summary>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
                    <div class="form-group" style="margin:0"><label>Nombre *</label><input type="text" id="nt-r-nombre" placeholder="Cardio técnico"></div>
                    <div class="form-group" style="margin:0"><label>Tipo</label><select id="nt-r-tipo"><option value="entrenamiento" selected>Entrenamiento</option><option value="partido">Partido</option><option value="recuperacion">Recuperación</option></select></div>
                    <div class="form-group" style="margin:0"><label>Duración (min)</label><input type="number" id="nt-r-dur" placeholder="60" value="60"></div>
                    <div class="form-group" style="margin:0"><label>Intensidad</label><select id="nt-r-int"><option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option></select></div>
                    <div class="form-group" style="margin:0;grid-column:1/-1"><label>Descripción</label><input type="text" id="nt-r-desc" placeholder="Opcional"></div>
                </div>
                <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="ntRegistrarRutina(${userId})">Guardar rutina</button>
            </details>`;

        document.getElementById('modal-title').textContent=d.nombre;
        document.getElementById('modal-body').innerHTML=`
            <div class="paciente-hero">
                <div class="paciente-avatar" style="background:linear-gradient(135deg,${c1},${c2})">${getInitials(d.nombre)}</div>
                <div class="paciente-hero-info">
                    <h3>${escapeHtml(d.nombre)}</h3>
                    <div class="paciente-hero-meta">
                        <span>⚽ ${escapeHtml(d.perfil?.posicion||'Posición no definida')}</span>
                        <span>⚖️ ${escapeHtml(String(d.perfil?.peso||'—'))} kg</span>
                        <span>📏 ${escapeHtml(String(d.perfil?.altura||'—'))} cm</span>
                    </div>
                </div>
            </div>
            <div class="detalle-tabs">
                <button class="detalle-tab active" onclick="switchTab(this,'tab-salud')">💪 Salud</button>
                <button class="detalle-tab" onclick="switchTab(this,'tab-notas')">📝 Notas</button>
                <button class="detalle-tab" onclick="switchTab(this,'tab-comidas')">🍽 Comidas</button>
                <button class="detalle-tab" onclick="switchTab(this,'tab-rutinas')">🏃 Rutinas</button>
            </div>
            <div id="tab-salud" class="detalle-tab-content" style="padding:16px">${saludHTML}</div>
            <div id="tab-notas" class="detalle-tab-content hidden" style="padding:16px">${notasHTML}</div>
            <div id="tab-comidas" class="detalle-tab-content hidden" style="padding:16px">${comidasHTML}</div>
            <div id="tab-rutinas" class="detalle-tab-content hidden" style="padding:16px">${rutinasHTML}</div>`;

        const ov=document.getElementById('modal-overlay');
        ov.querySelector('.modal').classList.add('modal-wide');
        ov.classList.remove('hidden');

        if(d.salud.length>=2){
            setTimeout(()=>{
                const ctx=document.getElementById(chartId)?.getContext('2d');
                if(!ctx) return;
                const rec=d.salud.slice(0,7).reverse();
                new Chart(ctx,{type:'line',data:{
                    labels:rec.map(s=>formatFecha(s.fecha)),
                    datasets:[
                        {label:'Fatiga',data:rec.map(s=>s.fatiga),borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,0.08)',tension:.4,fill:true,pointBackgroundColor:'#ef4444'},
                        {label:'Sueño',data:rec.map(s=>s.sueno),borderColor:'#0ea5e9',backgroundColor:'rgba(14,165,233,0.08)',tension:.4,fill:true,pointBackgroundColor:'#0ea5e9'},
                        {label:'Recuperación',data:rec.map(s=>s.recuperacion),borderColor:'#16a34a',backgroundColor:'rgba(22,163,74,0.08)',tension:.4,fill:true,pointBackgroundColor:'#16a34a'}
                    ]
                },options:{responsive:true,scales:{y:{min:0,max:10,ticks:{stepSize:2}}},plugins:{legend:{position:'bottom'}}}});
            },0);
        }
    } catch(err) {
        console.error('ntVerDetalle:', err);
        showToast('Error inesperado al abrir el atleta','error');
    }
}

async function ntGuardarNota(userId) {
    const texto=document.getElementById('nt-nueva-nota').value.trim();
    if(!texto) return showToast('Escribe una nota antes de guardar','error');
    const res=await apiFetch(`${API}/nutricionista/futbolistas/${userId}/notas`,{method:'POST',body:JSON.stringify({texto})});
    if(res.ok){showToast('Nota guardada');ntVerDetalle(userId);}
    else showToast('Error al guardar la nota','error');
}

async function ntRegistrarComida(userId) {
    const nombre=document.getElementById('nt-c-nombre').value.trim();
    if(!nombre) return showToast('El nombre es obligatorio','error');
    const body={nombre,tipo:document.getElementById('nt-c-tipo').value,calorias:document.getElementById('nt-c-cals').value,fecha:document.getElementById('nt-c-fecha').value};
    const res=await apiFetch(`${API}/nutricionista/futbolistas/${userId}/comidas`,{method:'POST',body:JSON.stringify(body)});
    if(res.ok){showToast('Comida registrada');ntVerDetalle(userId);}
    else showToast('Error al registrar','error');
}

async function ntRegistrarRutina(userId) {
    const nombre=document.getElementById('nt-r-nombre').value.trim();
    if(!nombre) return showToast('El nombre es obligatorio','error');
    const body={nombre,tipo:document.getElementById('nt-r-tipo').value,duracionMinutos:document.getElementById('nt-r-dur').value,intensidad:document.getElementById('nt-r-int').value,descripcion:document.getElementById('nt-r-desc').value.trim()};
    const res=await apiFetch(`${API}/nutricionista/futbolistas/${userId}/rutinas`,{method:'POST',body:JSON.stringify(body)});
    if(res.ok){showToast('Rutina registrada');ntVerDetalle(userId);}
    else showToast('Error al registrar','error');
}

function saludMeter(label, val, color) {
    const pct=Math.round(val/10*100);
    const colors={danger:'#ef4444',blue:'#0ea5e9',green:'#16a34a'};
    return `<div class="meter-wrap"><span class="meter-label">${label}</span><div class="meter-bar"><div class="meter-fill" style="width:${pct}%;background:${colors[color]||colors.blue}"></div></div><span class="meter-val">${val}/10</span></div>`;
}

function switchTab(btn, tabId) {
    btn.closest('.modal').querySelectorAll('.detalle-tab').forEach(t=>t.classList.remove('active'));
    btn.closest('.modal').querySelectorAll('.detalle-tab-content').forEach(t=>t.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.remove('hidden');
}

// ────────────────────────────────────────────────
// PANEL MEDICO
// ────────────────────────────────────────────────
let _medicoAtletas = [];

function showPanelMedico(user) {
    setTitle('Expedientes médicos');
    currentUser = user;
    hideAllPanels();
    document.getElementById('panel-medico').classList.remove('hidden');
    document.getElementById('md-avatar').textContent = getInitials(user.nombre);
    document.getElementById('md-nombre').textContent = user.nombre.split(' ').slice(0, 2).join(' ');
    startBadgePolling();
    medicoRenderView('expedientes');
}

function medicoRenderView(view) {
    closeSidebar();
    stopPolling();
    setTitle(view === 'mensajes' ? 'Mensajes' : 'Expedientes médicos');
    document.querySelectorAll('#panel-medico .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.mdView === view));
    if (view === 'mensajes') medicoRenderMensajes();
    else medicoRenderAtletas();
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
        main.innerHTML = `
        <div class="view-enter">
            <div class="view-header">
                <div class="view-title"><h1>Expedientes médicos</h1><p>${_medicoAtletas.length} atletas activos</p></div>
                <button class="btn btn-ghost" onclick="medicoRenderAtletas()">Actualizar</button>
            </div>
            ${enRiesgo.length || noListos.length ? `
            <div class="rd-aviso">
                ${enRiesgo.length ? `<div>⚠️ <strong>${enRiesgo.length} ${enRiesgo.length === 1 ? 'atleta' : 'atletas'} con riesgo alto de lesión por carga:</strong> ${enRiesgo.map(a => escapeHtml(a.nombre)).join(', ')}</div>` : ''}
                ${noListos.length ? `<div>🛑 <strong>${noListos.length} ${noListos.length === 1 ? 'atleta necesita' : 'atletas necesitan'} descanso hoy:</strong> ${noListos.map(a => escapeHtml(a.nombre)).join(', ')}</div>` : ''}
            </div>` : ''}
            <div class="card">
                <div class="card-header"><h2>Atletas</h2></div>
                <div class="table-wrap"><table><thead><tr><th>Atleta</th><th>Listo hoy</th><th>Carga</th><th>Cumplimiento</th><th>Ficha médica</th><th></th></tr></thead><tbody>
                    ${_medicoAtletas.length ? _medicoAtletas.map(atleta => {
                        const rd = rendimiento[atleta.id];
                        return `
                        <tr>
                            <td><div class="user-name">${escapeHtml(atleta.nombre)}</div><div class="user-email">${escapeHtml(atleta.email)}</div></td>
                            <td>${rd ? rdBadgeListo(rd.listo) : '—'}</td>
                            <td>${rd ? rdBadgeRiesgo(rd.carga) : '—'}</td>
                            <td>${rd?.cumplimiento.porcentaje != null ? rd.cumplimiento.porcentaje + '%' : '—'}</td>
                            <td>${atleta.completado ? '<span class="badge badge-activo">Completa</span>' : '<span class="badge badge-inactivo">Pendiente</span>'}</td>
                            <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="medicoVerPerfil(${Number(atleta.id)})">Ver expediente</button></td>
                        </tr>`;
                    }).join('') : '<tr><td colspan="6"><div class="empty-state"><p>No hay atletas activos.</p></div></td></tr>'}
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
                <button class="btn btn-ghost" onclick="medicoRenderAtletas()">Volver a expedientes</button>
            </div>
            ${perfil ? `<div class="stats-grid">
                <div class="card"><div class="card-header"><h2>Condiciones</h2></div><div class="card-body">${condiciones.length ? condiciones.map(item => `<p>${escapeHtml(item)}</p>`).join('') : '<p>Sin condiciones registradas.</p>'}</div></div>
                <div class="card"><div class="card-header"><h2>Alergias</h2></div><div class="card-body">${alergias.length ? alergias.map(item => `<p>${escapeHtml(item)}</p>`).join('') : '<p>Sin alergias registradas.</p>'}</div></div>
                <div class="card"><div class="card-header"><h2>Preferencias alimentarias</h2></div><div class="card-body"><p>${escapeHtml(perfil.preferencias || 'Sin restricciones')}</p></div></div>
            </div>` : '<div class="card"><div class="card-body"><p>Este atleta aún no ha completado su perfil médico.</p></div></div>'}
        </div>`;
    } catch (error) {
        main.innerHTML = showError(escapeHtml(error.message), `medicoVerPerfil(${Number(userId)})`);
    }
}

// ────────────────────────────────────────────────
// PANEL ATLETA
// ────────────────────────────────────────────────
async function showPanelAtleta(user) {
    setTitle('Dashboard');
    currentUser=user;
    hideAllPanels();
    document.getElementById('panel-futbolista').classList.remove('hidden');
    document.getElementById('pf-avatar').textContent=getInitials(user.nombre);
    document.getElementById('pf-nombre').textContent=user.nombre.split(' ').slice(0,2).join(' ');
    setupCounterObservers();
    startBadgePolling();
    // Server-side check — cannot be bypassed client-side
    const check=await apiFetch(`${API}/perfil-medico/${user.id}`).then(r=>r.json()).catch(()=>null);
    if (!check?.perfil) {
        pfRenderOnboarding();
    } else {
        pfRenderView('dashboard');
    }
}

const showPanelFutbolista = showPanelAtleta;

function pfRenderView(view) {
    closeSidebar();
    const titles = { dashboard:'Dashboard', perfil:'Mi Perfil', salud:'Mi Salud', historial:'Historial', plan:'Mi Plan', ia:'Asistente IA', soporte:'Mensajes y soporte' };
    setTitle(titles[view] || view);
    stopPolling();
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b=>{ b.disabled=false; b.classList.toggle('active',b.dataset.pfView===view); });
    document.getElementById('pf-content').innerHTML=showLoading();
    Object.values(chartInstances).forEach(c=>c.destroy()); chartInstances={};
    if(view==='dashboard')  pfRenderDashboard();
    else if(view==='perfil')    pfRenderPerfil();
    else if(view==='salud')     pfRenderSalud();
    else if(view==='historial') pfRenderHistorial();
    else if(view==='ia')        pfRenderIA();
    else if(view==='plan')      pfRenderPlan();
    else if(view==='soporte')   pfRenderSoporte();
}

// — DASHBOARD —
async function pfRenderDashboard() {
    const userId=currentUser.id;
    const [data, saludData, rdData] = await Promise.all([
        apiFetch(`${API}/panel/${userId}/dashboard`).then(r=>r.json()).catch(()=>null),
        apiFetch(`${API}/salud/${userId}`).then(r=>r.json()).catch(()=>[]),
        apiFetch(`${API}/rendimiento/${userId}`).then(r=>r.json()).catch(()=>null)
    ]);
    const main=document.getElementById('pf-content');
    if(!data?.ok){main.innerHTML=showError('No se pudo cargar el dashboard.','pfRenderView(\'dashboard\')');return;}
    const{perfil,ultimasComidas,ultimasRutinas,alertasRecientes}=data.resumen;
    const ultimaSalud=saludData[0]||null;
    const rendimiento=rdData?.ok?rdData.resumen:null;

    const deporteActual = currentUser.deporte_principal || 'Fútbol';
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title">
                <div class="sport-pill sport-pill-${deporteActual.toLowerCase().replace(/[^a-z]/g,'')}">${getSportBadgeNeutral(deporteActual)}</div>
                <h1>Bienvenido, ${escapeHtml(currentUser.nombre.split(' ')[0])} ${getSportIcon(deporteActual)}</h1>
                <p>Tu resumen deportivo de hoy</p>
            </div>
            <button class="btn btn-primary" onclick="pfRenderView('salud')">+ Registrar salud</button>
        </div>
        ${rendimiento?rdSeccionDashboard(rendimiento):''}
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon blue">🍽</div><div class="stat-info"><div class="stat-value">${ultimasComidas.length}</div><div class="stat-label">Comidas recientes</div></div></div>
            <div class="stat-card"><div class="stat-icon green">🏃</div><div class="stat-info"><div class="stat-value">${ultimasRutinas.length}</div><div class="stat-label">Rutinas recientes</div></div></div>
            <div class="stat-card"><div class="stat-icon yellow">🔔</div><div class="stat-info"><div class="stat-value">${alertasRecientes.filter(a=>!a.leida).length}</div><div class="stat-label">Alertas</div></div></div>
            <div class="stat-card"><div class="stat-icon ${ultimaSalud&&ultimaSalud.fatiga>=7?'red':'green'}">💪</div><div class="stat-info"><div class="stat-value">${ultimaSalud?ultimaSalud.fatiga+'/10':'—'}</div><div class="stat-label">Fatiga hoy</div></div></div>
        </div>
        ${ultimaSalud?`
        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>📊 Mi estado físico hoy</h2><span class="inc-fecha">${formatFecha(ultimaSalud.fecha)}</span></div>
            <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
                ${saludMeterBig('Fatiga',ultimaSalud.fatiga,'danger')}
                ${saludMeterBig('Sueño',ultimaSalud.sueno,'blue')}
                ${saludMeterBig('Recuperación',ultimaSalud.recuperacion,'green')}
            </div>
            ${ultimaSalud.notas?`<div style="padding:0 20px 20px;font-size:13px;color:var(--text-muted)">📝 ${escapeHtml(ultimaSalud.notas)}</div>`:''}
        </div>`:''}
        <div class="charts-grid">
            <div class="card"><div class="card-header"><h2>🍽 Últimas comidas</h2></div><div style="padding:16px">
                ${ultimasComidas.length?ultimasComidas.map(c=>`<div class="mini-item"><strong>${escapeHtml(c.nombre)}</strong><span>${escapeHtml(c.tipo)} · ${c.calorias} kcal</span></div>`).join(''):`<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin comidas registradas.</p>`}
                <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="pfGoToHistorial('comidas')">Ver comidas →</button>
            </div></div>
            <div class="card"><div class="card-header"><h2>🏃 Últimas rutinas</h2></div><div style="padding:16px">
                ${ultimasRutinas.length?ultimasRutinas.map(r=>`<div class="mini-item"><strong>${escapeHtml(r.nombre)}</strong><span>${escapeHtml(r.tipo)} · ${r.duracionMinutos}min · ${escapeHtml(r.intensidad)}</span></div>`).join(''):`<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin rutinas registradas.</p>`}
                <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="pfGoToHistorial('rutinas')">Ver rutinas →</button>
            </div></div>
        </div>
        ${alertasRecientes.length?`
        <div class="card"><div class="card-header"><h2>🔔 Alertas recientes</h2>
            ${alertasRecientes.some(a=>!a.leida)?`<button class="btn btn-ghost btn-sm" onclick="pfLeerTodas()">Marcar todas leídas</button>`:''}
        </div><div style="padding:16px">
            ${alertasRecientes.map(a=>`
            <div class="mini-item ${!a.leida?'mini-item-unread':''}" style="gap:10px">
                <div class="mini-item-body"><div class="mini-item-title">${escapeHtml(a.mensaje)}</div><div class="mini-item-sub">${escapeHtml(a.tipo)} · ${formatFecha(a.fecha)}</div></div>
                ${!a.leida?`<button class="btn btn-ghost btn-sm" onclick="pfLeerAlerta(${a.id},this)">✓ Leída</button>`:'<span style="font-size:11px;color:var(--text-muted)">Leída</span>'}
            </div>`).join('')}
        </div></div>`:''}
    </div>`;
    if(rendimiento) rdDibujarCarga(rendimiento.carga.serie);
}

function saludMeterBig(label, val, color) {
    const pct=Math.round(val/10*100);
    const colors={danger:'#ef4444',blue:'#0ea5e9',green:'#16a34a'};
    return `<div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:${colors[color]};font-family:var(--mono)">${val}<span style="font-size:1rem;color:var(--text-muted)">/10</span></div><div class="meter-bar" style="margin:8px auto;max-width:100px"><div class="meter-fill" style="width:${pct}%;background:${colors[color]}"></div></div><div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.6px">${label}</div></div>`;
}

// — RENDIMIENTO (listo para entrenar · carga · cumplimiento) —
const RD_NIVEL = {
    alto:        { clase:'rd-ok',   etiqueta:'Listo' },
    medio:       { clase:'rd-warn', etiqueta:'Moderado' },
    bajo:        { clase:'rd-bad',  etiqueta:'Descanso' },
    'sin-datos': { clase:'rd-none', etiqueta:'Sin registro' }
};
const RD_RIESGO = {
    optimo:      { clase:'rd-ok',   etiqueta:'Óptima' },
    precaucion:  { clase:'rd-warn', etiqueta:'Precaución' },
    alto:        { clase:'rd-bad',  etiqueta:'Riesgo alto' },
    bajo:        { clase:'rd-warn', etiqueta:'Carga baja' },
    'sin-datos': { clase:'rd-none', etiqueta:'Sin datos' }
};
const RD_CUMPL = {
    completo:'Completado', parcial:'Parcial', fallado:'No realizado', pendiente:'Pendiente hoy',
    descanso:'Descanso', 'sin-plan':'Sin plan'
};

function rdBadgeListo(listo) {
    const n = RD_NIVEL[listo?.nivel] || RD_NIVEL['sin-datos'];
    return `<span class="rd-badge ${n.clase}">${listo?.puntaje ?? '—'} · ${n.etiqueta}</span>`;
}

function rdBadgeRiesgo(carga) {
    const r = RD_RIESGO[carga?.riesgo] || RD_RIESGO['sin-datos'];
    const ratio = carga?.ratio != null ? `${String(carga.ratio).replace('.', ',')} · ` : '';
    return `<span class="rd-badge ${r.clase}">${ratio}${r.etiqueta}</span>`;
}

function rdTarjetaListo(listo) {
    const n = RD_NIVEL[listo.nivel] || RD_NIVEL['sin-datos'];
    const pct = listo.puntaje ?? 0;
    const circ = 2 * Math.PI * 42;
    return `
    <div class="card rd-card">
        <div class="card-header"><h2>⚡ Listo para entrenar</h2></div>
        <div class="rd-card-body rd-listo">
            <svg class="rd-anillo ${n.clase}" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="42" class="rd-anillo-fondo"/>
                <circle cx="50" cy="50" r="42" class="rd-anillo-valor" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct / 100)}"/>
                <text x="50" y="50" class="rd-anillo-num">${listo.puntaje ?? '—'}</text>
            </svg>
            <div>
                <span class="rd-badge ${n.clase}">${n.etiqueta}</span>
                <p class="rd-mensaje">${escapeHtml(listo.mensaje)}</p>
                ${listo.nivel === 'sin-datos' ? `<button class="btn btn-primary btn-sm" onclick="pfRenderView('salud')">Registrar salud</button>` : ''}
            </div>
        </div>
    </div>`;
}

function rdTarjetaCarga(carga) {
    const ratio = carga.ratio != null ? String(carga.ratio).replace('.', ',') : '—';
    return `
    <div class="card rd-card">
        <div class="card-header"><h2>📈 Carga de entrenamiento</h2>${rdBadgeRiesgo(carga)}</div>
        <div class="rd-card-body">
            <div class="rd-carga-cifras">
                <div><span class="rd-cifra">${ratio}</span><span class="rd-cifra-lab">Ratio semana / mes</span></div>
                <div><span class="rd-cifra">${carga.aguda}</span><span class="rd-cifra-lab">Carga 7 días</span></div>
            </div>
            <p class="rd-mensaje">${escapeHtml(carga.mensaje)}</p>
            <div class="rd-chart"><canvas id="chart-carga" aria-label="Carga diaria de los últimos 28 días"></canvas></div>
            <p class="rd-nota">Carga = minutos × esfuerzo (1-10). Zona óptima: 0,8 – 1,3.</p>
        </div>
    </div>`;
}

function rdTarjetaCumplimiento(cumpl, racha) {
    const celdas = cumpl.dias.map(d =>
        `<div class="rd-dia rd-dia-${d.estado}" title="${d.dia} ${formatFecha(d.fecha)} · ${RD_CUMPL[d.estado]}">${d.dia[0]}</div>`
    ).join('');
    const leyenda = ['completo','parcial','fallado','descanso'].map(e =>
        `<span><i class="rd-dia rd-dia-${e}"></i>${RD_CUMPL[e]}</span>`).join('');
    return `
    <div class="card rd-card">
        <div class="card-header"><h2>📅 Cumplimiento · 4 semanas</h2>${racha ? `<span class="rd-racha">🔥 ${racha} ${racha === 1 ? 'día' : 'días'}</span>` : ''}</div>
        <div class="rd-card-body">
            <div class="rd-carga-cifras">
                <div><span class="rd-cifra">${cumpl.porcentaje ?? '—'}${cumpl.porcentaje != null ? '%' : ''}</span><span class="rd-cifra-lab">Del plan cumplido</span></div>
                <div><span class="rd-cifra">${cumpl.completos}<small>/${cumpl.completos + cumpl.parciales + cumpl.fallados}</small></span><span class="rd-cifra-lab">Sesiones completas</span></div>
            </div>
            <div class="rd-calendario">${celdas}</div>
            <div class="rd-leyenda">${leyenda}</div>
        </div>
    </div>`;
}

function rdSeccionDashboard(r) {
    return `<div class="rd-grid">${rdTarjetaListo(r.listo)}${rdTarjetaCarga(r.carga)}${rdTarjetaCumplimiento(r.cumplimiento, r.racha)}</div>`;
}

function rdDibujarCarga(serie) {
    const canvas = document.getElementById('chart-carga');
    if (!canvas || typeof Chart === 'undefined') return;
    const ultimos7 = serie.length - 7;
    chartInstances['carga'] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: serie.map(d => formatFecha(d.fecha)),
            datasets: [{
                label: 'Carga',
                data: serie.map(d => d.carga),
                backgroundColor: serie.map((_, i) => i >= ultimos7 ? '#16a34a' : '#86efac'),
                borderRadius: 3, borderSkipped: false
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { display: false } },
                y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { font: { family: 'Outfit', size: 10 }, maxTicksLimit: 4 } }
            },
            maintainAspectRatio: false
        }
    });
}

async function rdCargarEquipo() {
    const data = await apiFetch(`${API}/rendimiento/equipo`).then(r => r.json()).catch(() => null);
    return Object.fromEntries((data?.atletas || []).map(a => [a.id, a]));
}

// — PERFIL —
async function pfRenderPerfil() {
    const userId=currentUser.id;
    const data=await apiFetch(`${API}/panel/${userId}/perfil`).then(r=>r.json()).catch(()=>null);
    const main=document.getElementById('pf-content');
    const p=data?.perfil||{};
    const sportOptions=['Fútbol','Baloncesto','Tenis'];
    const deporteActual = p.deportePrincipal || currentUser.deporte_principal || 'Fútbol';
    const sportConfig = getSportFieldConfig(deporteActual);
    const posicionActual = p.posicion || sportConfig.posicionOptions[0];

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header"><div class="view-title"><h1>Mi Perfil</h1><p>Tu información deportiva y de rendimiento</p></div></div>
        <div class="card" style="max-width:560px">
            <div class="card-header"><h2>Datos del perfil</h2></div>
            <div style="padding:24px;display:flex;flex-direction:column;gap:16px">
                <div class="form-group"><label>Nombre completo</label><input type="text" id="pf-f-nombre" value="${escapeHtml(p.nombre||currentUser.nombre||'')}"></div>
                <div class="form-row">
                    <div class="form-group"><label>Deporte principal</label><select id="pf-f-deporte" onchange="pfRenderPerfil()">${sportOptions.map(s=>`<option value="${s}" ${deporteActual===s?'selected':''}>${s}</option>`).join('')}</select></div>
                    <div class="form-group"><label>${sportConfig.posicionLabel.replace('*','')}</label><select id="pf-f-posicion">${sportConfig.posicionOptions.map(pos=>`<option value="${pos}" ${posicionActual===pos?'selected':''}>${pos}</option>`).join('')}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Edad</label><input type="number" id="pf-f-edad" value="${p.edad||''}" placeholder="22"></div>
                    <div class="form-group"><label>Altura (cm)</label><input type="number" id="pf-f-altura" value="${p.altura||''}" placeholder="178"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Peso (kg)</label><input type="number" id="pf-f-peso" value="${p.peso||''}" placeholder="72"></div>
                    <div class="form-group" style="display:flex;align-items:flex-end"><span style="color:var(--text-muted);font-size:12px;display:block;width:100%">Tu selección de deporte se sincroniza con el registro inicial.</span></div>
                </div>
                <div class="form-actions"><button class="btn btn-primary" onclick="pfGuardarPerfil()">Guardar cambios</button></div>
            </div>
        </div>
    </div>`;
}

async function pfGuardarPerfil() {
    const userId=currentUser.id;
    const body={
        nombre: document.getElementById('pf-f-nombre').value.trim(),
        edad: Number(document.getElementById('pf-f-edad').value),
        posicion: document.getElementById('pf-f-posicion').value,
        peso: Number(document.getElementById('pf-f-peso').value),
        altura: Number(document.getElementById('pf-f-altura').value),
        deportePrincipal: document.getElementById('pf-f-deporte').value
    };
    const res=await apiFetch(`${API}/panel/${userId}/perfil`,{method:'PUT',body:JSON.stringify(body)});
    if(res.ok){
        showToast('Perfil actualizado');
        currentUser.deporte_principal = body.deportePrincipal;
        setSession(currentUser, getToken());
        document.getElementById('pf-nombre').textContent = body.nombre.split(' ').slice(0,2).join(' ');
    }
    else showToast('Error al guardar','error');
}

// — SALUD —
async function pfRenderSalud() {
    const userId=currentUser.id;
    const registros=await apiFetch(`${API}/salud/${userId}`).then(r=>r.json()).catch(()=>[]);
    const main=document.getElementById('pf-content');
    const latest=registros[0], prev=registros[1];

    const wellness=latest?Math.round(((10-Number(latest.fatiga))+Number(latest.sueno)+Number(latest.recuperacion))/29*100):null;
    const wsClass=wellness>=70?'ws-good':wellness>=40?'ws-mid':'ws-bad';

    function trendArrow(field){
        if(!prev)return '';
        const d=Number(latest[field])-Number(prev[field]);
        if(field==='fatiga'){ // fatiga alta es malo
            if(d>0)return `<span class="sk-trend sk-trend-bad">↑ ${d} peor</span>`;
            if(d<0)return `<span class="sk-trend sk-trend-good">↓ ${Math.abs(d)} mejor</span>`;
        } else {
            if(d>0)return `<span class="sk-trend sk-trend-good">↑ ${d}</span>`;
            if(d<0)return `<span class="sk-trend sk-trend-bad">↓ ${Math.abs(d)}</span>`;
        }
        return `<span class="sk-trend sk-trend-flat">= igual</span>`;
    }

    const avgOf=f=>registros.length?Math.round(registros.slice(0,7).reduce((s,r)=>s+Number(r[f]),0)/Math.min(registros.length,7)*10)/10:'—';

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header" style="align-items:center">
            <div class="view-title"><h1>Mi Salud</h1><p>Seguimiento de tu estado físico diario</p></div>
            ${wellness!==null?`<div class="wellness-badge">
                <div class="wellness-ring ${wsClass}">
                    <span class="wellness-num">${wellness}</span>
                    <span class="wellness-den">/100</span>
                </div>
                <div class="wellness-info">
                    <span class="wellness-title">Índice de bienestar</span>
                    <span class="wellness-sub">${wellness>=70?'Excelente estado':wellness>=40?'Estado moderado':'Necesita atención'}</span>
                </div>
            </div>`:''}
        </div>

        ${latest?`<div class="salud-kpis">
            <div class="salud-kpi kpi-fatiga">
                <div class="sk-icon">😓</div>
                <div class="sk-body">
                    <div class="sk-val">${latest.fatiga}<span>/10</span></div>
                    <div class="sk-label">Fatiga hoy</div>
                    ${trendArrow('fatiga')}
                    <div class="sk-avg">Prom. 7d: ${avgOf('fatiga')}</div>
                </div>
            </div>
            <div class="salud-kpi kpi-sueno">
                <div class="sk-icon">😴</div>
                <div class="sk-body">
                    <div class="sk-val">${latest.sueno}<span>/10</span></div>
                    <div class="sk-label">Sueño hoy</div>
                    ${trendArrow('sueno')}
                    <div class="sk-avg">Prom. 7d: ${avgOf('sueno')}</div>
                </div>
            </div>
            <div class="salud-kpi kpi-rec">
                <div class="sk-icon">⚡</div>
                <div class="sk-body">
                    <div class="sk-val">${latest.recuperacion}<span>/10</span></div>
                    <div class="sk-label">Recuperación hoy</div>
                    ${trendArrow('recuperacion')}
                    <div class="sk-avg">Prom. 7d: ${avgOf('recuperacion')}</div>
                </div>
            </div>
        </div>`:''}

        ${registros.length>=2?`
        <div class="card" style="margin-bottom:24px">
            <div class="card-header">
                <h2>📊 Tendencia de salud</h2>
                <span style="font-size:12px;color:var(--text-muted)">Últimos ${Math.min(registros.length,14)} días</span>
            </div>
            <div style="padding:20px 24px 16px">
                <div class="salud-chart-legend">
                    <span class="scl-item scl-fatiga">● Fatiga</span>
                    <span class="scl-item scl-sueno">● Sueño</span>
                    <span class="scl-item scl-rec">● Recuperación</span>
                    <span class="scl-zone">Zona alerta fatiga ≥ 8</span>
                </div>
                <div class="chart-wrap" style="height:240px"><canvas id="chart-salud-trend"></canvas></div>
            </div>
        </div>`:''}

        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>📝 Registrar hoy</h2></div>
            <div style="padding:24px;display:flex;flex-direction:column;gap:20px">
                <div>
                    <label class="range-label">Fatiga <span id="val-fatiga">5</span>/10</label>
                    <input type="range" id="s-fatiga" min="1" max="10" value="5" oninput="document.getElementById('val-fatiga').textContent=this.value" class="range-input range-danger">
                    <div class="range-hints"><span>Sin fatiga</span><span>Muy cansado</span></div>
                </div>
                <div>
                    <label class="range-label">Horas de sueño <span id="val-sueno">7</span>/10</label>
                    <input type="range" id="s-sueno" min="1" max="10" value="7" oninput="document.getElementById('val-sueno').textContent=this.value" class="range-input range-blue">
                    <div class="range-hints"><span>Muy poco</span><span>Excelente</span></div>
                </div>
                <div>
                    <label class="range-label">Recuperación <span id="val-rec">5</span>/10</label>
                    <input type="range" id="s-rec" min="1" max="10" value="5" oninput="document.getElementById('val-rec').textContent=this.value" class="range-input range-green">
                    <div class="range-hints"><span>Sin recuperar</span><span>Totalmente recuperado</span></div>
                </div>
                <div class="form-group" style="margin:0"><label>Notas (opcional)</label><textarea id="s-notas" placeholder="Ej: pierna derecha molesta, dormí bien..." style="height:70px"></textarea></div>
                <button class="btn btn-primary" onclick="pfGuardarSalud()">Guardar registro de hoy</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2>📈 Historial de salud</h2></div>
            <div style="padding:16px">
                ${registros.length?registros.map(s=>`
                <div class="salud-row">
                    <span class="salud-fecha">${formatFecha(s.fecha)}</span>
                    <div class="salud-meters">
                        ${saludMeter('Fatiga',s.fatiga,'danger')}
                        ${saludMeter('Sueño',s.sueno,'blue')}
                        ${saludMeter('Recup.',s.recuperacion,'green')}
                    </div>
                    ${s.notas?`<span class="salud-nota">${escapeHtml(s.notas)}</span>`:''}
                </div>`).join(''):showEmptyState('📊','Sin registros todavía','Empieza hoy para ver tu historial de salud y tendencias.')}
            </div>
        </div>
    </div>`;

    if(registros.length>=2){
        const recientes=registros.slice(0,14).reverse();
        const labels=recientes.map(s=>s.fecha.slice(5)); // MM-DD
        const ctx=document.getElementById('chart-salud-trend').getContext('2d');

        const gradFatiga=ctx.createLinearGradient(0,0,0,240);
        gradFatiga.addColorStop(0,'rgba(239,68,68,0.18)');
        gradFatiga.addColorStop(1,'rgba(239,68,68,0)');
        const gradSueno=ctx.createLinearGradient(0,0,0,240);
        gradSueno.addColorStop(0,'rgba(14,165,233,0.15)');
        gradSueno.addColorStop(1,'rgba(14,165,233,0)');
        const gradRec=ctx.createLinearGradient(0,0,0,240);
        gradRec.addColorStop(0,'rgba(22,163,74,0.15)');
        gradRec.addColorStop(1,'rgba(22,163,74,0)');

        new Chart(ctx,{
            type:'line',
            data:{labels,datasets:[
                {label:'Fatiga',data:recientes.map(s=>s.fatiga),borderColor:'#ef4444',backgroundColor:gradFatiga,tension:.45,fill:true,pointBackgroundColor:'#ef4444',pointRadius:4,pointHoverRadius:6,borderWidth:2.5},
                {label:'Sueño',data:recientes.map(s=>s.sueno),borderColor:'#0ea5e9',backgroundColor:gradSueno,tension:.45,fill:true,pointBackgroundColor:'#0ea5e9',pointRadius:4,pointHoverRadius:6,borderWidth:2.5},
                {label:'Recuperación',data:recientes.map(s=>s.recuperacion),borderColor:'#16a34a',backgroundColor:gradRec,tension:.45,fill:true,pointBackgroundColor:'#16a34a',pointRadius:4,pointHoverRadius:6,borderWidth:2.5}
            ]},
            options:{
                responsive:true,
                maintainAspectRatio:false,
                interaction:{mode:'index',intersect:false},
                plugins:{
                    legend:{display:false},
                    tooltip:{
                        backgroundColor:'#0f172a',
                        titleColor:'#94a3b8',
                        bodyColor:'#f1f5f9',
                        padding:12,
                        cornerRadius:10,
                        titleFont:{family:'Outfit',size:11},
                        bodyFont:{family:'Outfit',size:13},
                        callbacks:{
                            title:i=>`📅 ${recientes[i[0].dataIndex].fecha}`,
                            afterBody:items=>{
                                const r=recientes[items[0].dataIndex];
                                const w=Math.round(((10-Number(r.fatiga))+Number(r.sueno)+Number(r.recuperacion))/30*100);
                                return [`Bienestar: ${w}/100`];
                            }
                        }
                    },
                    ...(typeof window.chartjsPluginAnnotation !== 'undefined' || (Chart.registry && Chart.registry.plugins.get('annotation')) ? {annotation:{annotations:{alertZone:{type:'box',yMin:8,yMax:10,backgroundColor:'rgba(239,68,68,0.07)',borderColor:'rgba(239,68,68,0.25)',borderWidth:1,label:{display:true,content:'⚠ Zona alerta',color:'#ef4444',font:{size:10,family:'Outfit'}}}}}} : {})
                },
                scales:{
                    x:{grid:{display:false},ticks:{font:{family:'Outfit',size:11},color:'#94a3b8'}},
                    y:{min:0,max:10,ticks:{stepSize:2,font:{family:'Outfit',size:11},color:'#94a3b8'},grid:{color:'#f1f5f9'},border:{display:false}}
                }
            }
        });
    }
}

async function pfGuardarSalud() {
    const userId=currentUser.id;
    const body={fatiga:document.getElementById('s-fatiga').value,sueno:document.getElementById('s-sueno').value,recuperacion:document.getElementById('s-rec').value,notas:document.getElementById('s-notas').value.trim(),fecha:new Date().toISOString().slice(0,10)};
    const res=await apiFetch(`${API}/salud/${userId}`,{method:'POST',body:JSON.stringify(body)});
    if(res.ok){showToast('Registro de salud guardado');pfRenderSalud();}
    else {
        const data=await res.json().catch(()=>({}));
        showToast(data.error||'Error al guardar','error');
    }
}

async function pfLeerAlerta(alertaId, btn) {
    const userId=currentUser.id;
    const res=await apiFetch(`${API}/panel/${userId}/alertas/${alertaId}/leer`,{method:'PUT'});
    if(res.ok){ const item=btn.closest('.mini-item'); item.classList.remove('mini-item-unread'); btn.outerHTML='<span style="font-size:11px;color:var(--text-muted)">Leída</span>'; }
}

async function pfLeerTodas() {
    const userId=currentUser.id;
    const res=await apiFetch(`${API}/panel/${userId}/alertas/leer-todas`,{method:'PUT'});
    if(res.ok) pfRenderDashboard();
}

// — HISTORIAL —
function pfGoToHistorial(sub) {
    document.querySelectorAll('[data-pf-view]').forEach(b=>b.classList.remove('active'));
    document.querySelector('[data-pf-view="historial"]')?.classList.add('active');
    if(sub==='comidas') pfRenderHistorialComidas();
    else if(sub==='rutinas') pfRenderHistorialRutinas();
    else pfRenderHistorial();
}

async function pfRenderHistorial() {
    const userId=currentUser.id;
    const[comidas,rutinas]=await Promise.all([
        apiFetch(`${API}/panel/${userId}/historial/comidas`).then(r=>r.json()).catch(()=>({datos:[],total:0})),
        apiFetch(`${API}/panel/${userId}/historial/rutinas`).then(r=>r.json()).catch(()=>({datos:[],total:0}))
    ]);
    const ultimaComida=comidas.datos?.[0];
    const ultimaRutina=rutinas.datos?.[0];
    const main=document.getElementById('pf-content');
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mi Historial</h1><p>Registra y consulta tu actividad diaria</p></div>
        </div>
        <div class="historial-landing">
            <div class="historial-card" onclick="pfRenderHistorialComidas()">
                <div class="historial-card-icon" style="background:linear-gradient(135deg,#fde68a,#f59e0b)">🍽</div>
                <div class="historial-card-body">
                    <h3>Registro de Comidas</h3>
                    <p>Lleva el control de tu alimentación diaria</p>
                    <div class="historial-card-meta">
                        <span class="historial-card-count">${comidas.total||0} comidas</span>
                        ${ultimaComida?`<span class="historial-card-last">Última: ${formatFecha(ultimaComida.fecha)}</span>`:'<span class="historial-card-last">Sin registros aún</span>'}
                    </div>
                </div>
                <div class="historial-card-arrow">→</div>
            </div>
            <div class="historial-card" onclick="pfRenderHistorialRutinas()">
                <div class="historial-card-icon" style="background:linear-gradient(135deg,#86efac,#16a34a)">🏃</div>
                <div class="historial-card-body">
                    <h3>Registro de Entrenamientos</h3>
                    <p>Documenta tus sesiones de entrenamiento</p>
                    <div class="historial-card-meta">
                        <span class="historial-card-count">${rutinas.total||0} sesiones</span>
                        ${ultimaRutina?`<span class="historial-card-last">Última: ${formatFecha(ultimaRutina.fecha)}</span>`:'<span class="historial-card-last">Sin registros aún</span>'}
                    </div>
                </div>
                <div class="historial-card-arrow">→</div>
            </div>
        </div>
    </div>`;
}

async function pfRenderHistorialComidas() {
    const userId=currentUser.id;
    const comidas=await apiFetch(`${API}/panel/${userId}/historial/comidas`).then(r=>r.json()).catch(()=>({datos:[],total:0}));
    const hoy=new Date().toISOString().slice(0,10);
    const main=document.getElementById('pf-content');
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header" style="align-items:center">
            <div style="display:flex;align-items:center;gap:12px">
                <button class="btn btn-ghost btn-sm" onclick="pfRenderHistorial()">← Volver</button>
                <div class="view-title" style="margin:0"><h1>Registro de Comidas</h1><p>${comidas.total||0} comidas registradas</p></div>
            </div>
        </div>

        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h2>➕ Nueva comida</h2></div>
            <div style="padding:20px">
                <div class="form-row" style="margin-bottom:14px">
                    <div class="form-group" style="margin:0">
                        <label>Nombre de la comida *</label>
                        <input type="text" id="hst-nombre" placeholder="Ej: Pollo con arroz integral">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label>Tipo</label>
                        <select id="hst-tipo">
                            <option>Desayuno</option><option>Merienda mañana</option><option>Almuerzo</option>
                            <option>Merienda tarde</option><option>Cena</option><option>Otro</option>
                        </select>
                    </div>
                </div>
                <div class="form-row" style="margin-bottom:14px">
                    <div class="form-group" style="margin:0"><label>Calorías (kcal)</label><input type="number" id="hst-kcal" placeholder="Ej: 480" min="0"></div>
                    <div class="form-group" style="margin:0"><label>Proteína (g)</label><input type="number" id="hst-proteina" placeholder="Opcional" min="0"></div>
                    <div class="form-group" style="margin:0"><label>Fecha</label><input type="date" id="hst-fecha" value="${hoy}"></div>
                </div>
                <div class="form-group" style="margin-bottom:14px">
                    <label>Notas (opcional)</label>
                    <input type="text" id="hst-notas" placeholder="Ej: Comí menos arroz, sin sal">
                </div>
                <div id="hst-error" class="auth-error hidden"></div>
                <button class="btn btn-primary" onclick="pfRegistrarComida(${userId})">Registrar comida</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2>🍽 Comidas registradas (${comidas.total||0})</h2></div>
            <div style="padding:16px" id="lista-comidas">
                ${comidas.datos?.length?comidas.datos.map(c=>`
                <div class="mini-item" id="comida-${c.id}" onclick="verDetalleComida(${JSON.stringify(c).replace(/"/g,'&quot;')})" style="cursor:pointer">
                    <div class="mini-item-icon yellow">🍽</div>
                    <div class="mini-item-body">
                        <div class="mini-item-title">${escapeHtml(c.nombre)}</div>
                        <div class="mini-item-sub">${escapeHtml(c.tipo)}${c.calorias?` · ${escapeHtml(c.calorias)} kcal`:''}${c.proteina?` · ${escapeHtml(c.proteina)}g prot`:''}${c.notas?` · ${escapeHtml(c.notas)}`:''} · ${formatFecha(c.fecha)}</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" data-tooltip="Eliminar comida" onclick="event.stopPropagation();pfEliminarComida(${userId},${c.id})">✕</button>
                </div>`).join(''):showEmptyState('🍽','Sin comidas registradas','Usa el formulario de arriba para registrar tu primera comida.')}
            </div>
        </div>
    </div>`;
}

async function pfRenderHistorialRutinas() {
    const userId=currentUser.id;
    const rutinas=await apiFetch(`${API}/panel/${userId}/historial/rutinas`).then(r=>r.json()).catch(()=>({datos:[],total:0}));
    const hoy=new Date().toISOString().slice(0,10);
    const main=document.getElementById('pf-content');
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header" style="align-items:center">
            <div style="display:flex;align-items:center;gap:12px">
                <button class="btn btn-ghost btn-sm" onclick="pfRenderHistorial()">← Volver</button>
                <div class="view-title" style="margin:0"><h1>Registro de Entrenamientos</h1><p>${rutinas.total||0} sesiones registradas</p></div>
            </div>
        </div>

        <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h2>➕ Nueva sesión</h2></div>
            <div style="padding:20px">
                <div class="form-row" style="margin-bottom:14px">
                    <div class="form-group" style="margin:0">
                        <label>Nombre del entrenamiento *</label>
                        <input type="text" id="rut-nombre" placeholder="Ej: Cardio matutino">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label>Tipo</label>
                        <select id="rut-tipo">
                            <option>Cardio</option><option>Fuerza</option><option>Técnica</option>
                            <option>Velocidad</option><option>Resistencia</option><option>Flexibilidad</option><option>Otro</option>
                        </select>
                    </div>
                </div>
                <div class="form-row" style="margin-bottom:14px">
                    <div class="form-group" style="margin:0"><label>Duración (minutos)</label><input type="number" id="rut-duracion" placeholder="Ej: 45" min="1"></div>
                    <div class="form-group" style="margin:0"><label>Intensidad</label>
                        <select id="rut-intensidad"><option>Baja</option><option selected>Media</option><option>Alta</option><option>Muy alta</option></select>
                    </div>
                    <div class="form-group" style="margin:0"><label>Fecha</label><input type="date" id="rut-fecha" value="${hoy}"></div>
                </div>
                <div class="form-group" style="margin-bottom:14px">
                    <label>Descripción (opcional)</label>
                    <input type="text" id="rut-descripcion" placeholder="Ej: Series de 10x100m, pausa 90s">
                </div>
                <div id="rut-error" class="auth-error hidden"></div>
                <button class="btn btn-primary" onclick="pfRegistrarRutina(${userId})">Registrar entrenamiento</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header"><h2>🏃 Sesiones de entrenamiento (${rutinas.total||0})</h2></div>
            <div style="padding:16px" id="lista-rutinas">
                ${rutinas.datos?.length?rutinas.datos.map(r=>`
                <div class="mini-item" id="rutina-${r.id}" onclick="verDetalleRutina(${JSON.stringify(r).replace(/"/g,'&quot;')})" style="cursor:pointer">
                    <div class="mini-item-icon green">🏃</div>
                    <div class="mini-item-body">
                        <div class="mini-item-title">${escapeHtml(r.nombre)}</div>
                        <div class="mini-item-sub">${escapeHtml(r.tipo)}${r.duracionMinutos?` · ${escapeHtml(r.duracionMinutos)} min`:''}${r.intensidad?` · ${escapeHtml(r.intensidad)}`:''}${r.descripcion?` · ${escapeHtml(r.descripcion)}`:''} · ${formatFecha(r.fecha)}</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" data-tooltip="Eliminar sesión" onclick="event.stopPropagation();pfEliminarRutina(${userId},${r.id})">✕</button>
                </div>`).join(''):showEmptyState('🏃','Sin sesiones registradas','Usa el formulario de arriba para registrar tu primer entrenamiento.')}
            </div>
        </div>
    </div>`;
}

function verDetalleComida(c) {
    if(typeof c === 'string') c = JSON.parse(c);
    openModal(`🍽 ${escapeHtml(c.nombre)}`, `
        <div class="detalle-grid">
            <div class="detalle-item">
                <span class="detalle-lbl">Tipo</span>
                <span class="detalle-val">${escapeHtml(c.tipo)||'—'}</span>
            </div>
            <div class="detalle-item">
                <span class="detalle-lbl">Fecha</span>
                <span class="detalle-val">${formatFecha(c.fecha)}</span>
            </div>
            <div class="detalle-item">
                <span class="detalle-lbl">Calorías</span>
                <span class="detalle-val detalle-highlight">${c.calorias?escapeHtml(c.calorias)+' kcal':'No registrado'}</span>
            </div>
            <div class="detalle-item">
                <span class="detalle-lbl">Proteína</span>
                <span class="detalle-val detalle-highlight">${c.proteina?escapeHtml(c.proteina)+'g':'No registrado'}</span>
            </div>
            ${c.notas?`<div class="detalle-item detalle-full">
                <span class="detalle-lbl">Notas</span>
                <span class="detalle-val detalle-nota">${escapeHtml(c.notas)}</span>
            </div>`:''}
            ${c.registradoPor?`<div class="detalle-item detalle-full">
                <span class="detalle-lbl">Registrado por</span>
                <span class="detalle-val">${escapeHtml(c.registradoPor)}</span>
            </div>`:''}
        </div>
    `);
}

function verDetalleRutina(r) {
    if(typeof r === 'string') r = JSON.parse(r);
    const intensidadColor = {Baja:'badge-baja',Media:'badge-media',Alta:'badge-alta','Muy alta':'badge-critica'};
    openModal(`🏃 ${escapeHtml(r.nombre)}`, `
        <div class="detalle-grid">
            <div class="detalle-item">
                <span class="detalle-lbl">Tipo</span>
                <span class="detalle-val">${escapeHtml(r.tipo)||'—'}</span>
            </div>
            <div class="detalle-item">
                <span class="detalle-lbl">Fecha</span>
                <span class="detalle-val">${formatFecha(r.fecha)}</span>
            </div>
            <div class="detalle-item">
                <span class="detalle-lbl">Duración</span>
                <span class="detalle-val detalle-highlight">${r.duracionMinutos?escapeHtml(r.duracionMinutos)+' minutos':'No registrado'}</span>
            </div>
            <div class="detalle-item">
                <span class="detalle-lbl">Intensidad</span>
                <span class="detalle-val"><span class="badge ${intensidadColor[r.intensidad]||''}">${escapeHtml(r.intensidad)||'—'}</span></span>
            </div>
            ${r.descripcion?`<div class="detalle-item detalle-full">
                <span class="detalle-lbl">Descripción</span>
                <span class="detalle-val detalle-nota">${escapeHtml(r.descripcion)}</span>
            </div>`:''}
            ${r.registradoPor?`<div class="detalle-item detalle-full">
                <span class="detalle-lbl">Registrado por</span>
                <span class="detalle-val">${escapeHtml(r.registradoPor)}</span>
            </div>`:''}
        </div>
    `);
}

async function pfRegistrarComida(userId) {
    const nombre=document.getElementById('hst-nombre').value.trim();
    const tipo=document.getElementById('hst-tipo').value;
    const calorias=document.getElementById('hst-kcal').value;
    const proteina=document.getElementById('hst-proteina').value;
    const fecha=document.getElementById('hst-fecha').value;
    const notas=document.getElementById('hst-notas').value.trim();
    const errEl=document.getElementById('hst-error');
    if(!nombre){errEl.textContent='El nombre de la comida es obligatorio.';errEl.classList.remove('hidden');return;}
    errEl.classList.add('hidden');
    const res=await apiFetch(`${API}/panel/${userId}/comidas`,{method:'POST',body:JSON.stringify({nombre,tipo,calorias,proteina,notas,fecha})}).then(r=>r.json()).catch(()=>null);
    if(!res?.ok){errEl.textContent=res?.error||'Error al registrar.';errEl.classList.remove('hidden');return;}
    showToast('Comida registrada ✓');
    pfRenderHistorialComidas();
}

async function pfEliminarComida(userId, comidaId) {
    if(!confirm('¿Eliminar esta comida del registro?'))return;
    const res=await apiFetch(`${API}/panel/${userId}/comidas/${comidaId}`,{method:'DELETE'}).then(r=>r.json()).catch(()=>null);
    if(res?.ok){showToast('Comida eliminada');pfRenderHistorialComidas();}
    else showToast('Error al eliminar','error');
}

async function pfRegistrarRutina(userId) {
    const nombre=document.getElementById('rut-nombre').value.trim();
    const tipo=document.getElementById('rut-tipo').value;
    const duracionMinutos=document.getElementById('rut-duracion').value;
    const intensidad=document.getElementById('rut-intensidad').value;
    const fecha=document.getElementById('rut-fecha').value;
    const descripcion=document.getElementById('rut-descripcion').value.trim();
    const errEl=document.getElementById('rut-error');
    if(!nombre){errEl.textContent='El nombre del entrenamiento es obligatorio.';errEl.classList.remove('hidden');return;}
    errEl.classList.add('hidden');
    const res=await apiFetch(`${API}/panel/${userId}/rutinas`,{method:'POST',body:JSON.stringify({nombre,tipo,duracionMinutos,intensidad,descripcion,fecha})}).then(r=>r.json()).catch(()=>null);
    if(!res?.ok){errEl.textContent=res?.error||'Error al registrar.';errEl.classList.remove('hidden');return;}
    showToast('Entrenamiento registrado ✓');
    pfRenderHistorialRutinas();
}

async function pfEliminarRutina(userId, rutinaId) {
    if(!confirm('¿Eliminar esta sesión del registro?'))return;
    const res=await apiFetch(`${API}/panel/${userId}/rutinas/${rutinaId}`,{method:'DELETE'}).then(r=>r.json()).catch(()=>null);
    if(res?.ok){showToast('Sesión eliminada');pfRenderHistorialRutinas();}
    else showToast('Error al eliminar','error');
}

// — ONBOARDING: PERFIL MÉDICO —
let _onbCat  = null;
let _onbDatos = {};

// actualizando=true cuando el atleta ya tiene perfil y entra desde "Actualizar perfil":
// el menú sigue activo, se puede volver sin guardar y se parte de sus respuestas actuales.
let _onbActualizando = false;

async function pfRenderOnboarding(actualizando = false) {
    _onbActualizando = actualizando;
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b=>{
        b.disabled = !actualizando;
        b.classList.toggle('active', actualizando && b.dataset.pfView === 'plan');
    });
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const [catalogo, actual] = await Promise.all([
        apiFetch(`${API}/perfil-medico/catalogos`).then(r=>r.json()).catch(()=>null),
        actualizando ? apiFetch(`${API}/perfil-medico/${currentUser.id}`).then(r=>r.json()).catch(()=>null) : null
    ]);
    _onbCat = catalogo;
    if(!_onbCat?.ok){ main.innerHTML=showError('No se pudo cargar el catálogo médico.',`pfRenderOnboarding(${actualizando})`); return; }
    const p = actual?.perfil;
    _onbDatos={
        condiciones: p?.condiciones || [],
        alergias:    p?.alergias || [],
        preferencia: p?.preferencias || 'Sin restricciones'
    };
    pfOnboardingStep1();
}

function pfOnbVolverHTML() {
    return _onbActualizando
        ? `<button class="btn btn-ghost btn-sm onb-volver" onclick="pfRenderView('plan')">← Volver a mi plan sin guardar cambios</button>`
        : '';
}

function pfOnboardingStep1() {
    const catLabels={
        musculoesqueleticas:'🦴 Musculoesqueléticas',
        cardiorrespiratorias:'❤️ Cardiorrespiratorias',
        metabolicas:'⚗️ Metabólicas',
        digestivas:'🫁 Digestivas',
        neurologicasMentales:'🧠 Neurológicas / Mentales',
        otras:'🩺 Otras condiciones'
    };
    const condHTML=Object.entries(_onbCat.CONDICIONES).map(([key,conds])=>`
        <div class="onb-group">
            <div class="onb-group-title">
                ${catLabels[key]||key}
                <button class="onb-ninguna-cat-btn" onclick="pfOnboardingNingunaCat('onb-cat-${key}')">Ninguna</button>
            </div>
            <div class="onb-checks" id="onb-cat-${key}">
                ${conds.map(c=>`
                <label class="onb-check ${_onbDatos.condiciones.includes(c)?'checked':''}">
                    <input type="checkbox" value="${c.replace(/"/g,'&quot;')}" ${_onbDatos.condiciones.includes(c)?'checked':''}>
                    <span>${c}</span>
                </label>`).join('')}
            </div>
        </div>`).join('');
    document.getElementById('pf-content').innerHTML=`
    <div class="onb-wizard view-enter">
        ${pfOnbVolverHTML()}
        <div class="onb-progress">
            <div class="onb-step onb-step-active">1. Condiciones</div>
            <div class="onb-step-line"></div>
            <div class="onb-step">2. Alergias</div>
            <div class="onb-step-line"></div>
            <div class="onb-step">3. Preferencias</div>
        </div>
        <div class="onb-header">
            <h1>Tu Perfil Médico Deportivo</h1>
            <p>Para personalizar tu plan de entrenamiento y nutrición necesitamos conocer tu estado de salud. Esta información es confidencial y solo podrán consultarla el equipo médico, tu nutricionista y administradores autorizados.</p>
        </div>
        <div class="onb-section-title">¿Tienes alguna de estas condiciones de salud?</div>
        <p class="onb-hint">Selecciona las que apliquen. Cada categoría tiene su botón <strong>Ninguna</strong> si no aplica ninguna de ese grupo.</p>
        <div class="onb-conditions">${condHTML}</div>
        <div class="onb-actions">
            <div></div>
            <button class="btn btn-primary" onclick="pfOnboardingGoStep2()">Siguiente: Alergias →</button>
        </div>
    </div>`;
}

function pfOnboardingNingunaCat(grupoId) {
    document.querySelectorAll(`#${grupoId} input[type=checkbox]`).forEach(cb=>cb.checked=false);
}

function pfOnboardingGoStep2() {
    _onbDatos.condiciones=Array.from(document.querySelectorAll('.onb-conditions input[type=checkbox]:checked')).map(el=>el.value);
    pfOnboardingStep2();
}

function pfOnboardingStep2() {
    const gruposAlerg = {
        'Cereales y gluten':     ['Gluten (trigo, cebada, centeno)'],
        'Lácteos':               ['Lácteos / Lactosa'],
        'Proteínas animales':    ['Huevo','Mariscos','Pescado'],
        'Frutos secos':          ['Frutos secos (nueces, almendras, etc.)','Cacahuetes / Maní'],
        'Otros alimentos':       ['Soya / Soja','Maíz','Cítricos (naranja, limón)','Fresas / Frutos rojos','Chocolate / Cacao'],
        'Aditivos y especias':   ['Sulfitos (conservas, vino)','Sésamo / Ajonjolí','Mostaza','Apio']
    };
    const alergGruposHTML = Object.entries(gruposAlerg).map(([grupo, items])=>`
        <div class="onb-group">
            <div class="onb-group-title">
                ${grupo}
                <button class="onb-ninguna-cat-btn" onclick="pfOnboardingNingunaCat('onb-alerg-${grupo.replace(/\s/g,'-')}')">Ninguna</button>
            </div>
            <div class="onb-checks" id="onb-alerg-${grupo.replace(/\s/g,'-')}">
                ${items.map(a=>`
                <label class="onb-check ${_onbDatos.alergias.includes(a)?'checked':''}">
                    <input type="checkbox" value="${a.replace(/"/g,'&quot;')}" ${_onbDatos.alergias.includes(a)?'checked':''}>
                    <span>${a}</span>
                </label>`).join('')}
            </div>
        </div>`).join('');
    document.getElementById('pf-content').innerHTML=`
    <div class="onb-wizard view-enter">
        ${pfOnbVolverHTML()}
        <div class="onb-progress">
            <div class="onb-step onb-step-done">✓ Condiciones</div>
            <div class="onb-step-line onb-step-line-done"></div>
            <div class="onb-step onb-step-active">2. Alergias</div>
            <div class="onb-step-line"></div>
            <div class="onb-step">3. Preferencias</div>
        </div>
        <div class="onb-header">
            <h1>Alergias e Intolerancias Alimentarias</h1>
            <p>Selecciona los alimentos que no puedes consumir. Cada grupo tiene su botón <strong>Ninguna</strong> si no aplica ninguno de ese grupo.</p>
        </div>
        <div class="onb-section-title">¿Eres alérgico o intolerante a alguno de estos alimentos?</div>
        <div class="onb-conditions">${alergGruposHTML}</div>
        <div class="onb-actions">
            <button class="btn btn-ghost" onclick="pfOnboardingStep1()">← Atrás</button>
            <button class="btn btn-primary" onclick="pfOnboardingGoStep3()">Siguiente: Preferencias →</button>
        </div>
    </div>`;
}

function pfOnboardingGoStep3() {
    _onbDatos.alergias=Array.from(document.querySelectorAll('.onb-conditions input[type=checkbox]:checked')).map(el=>el.value);
    pfOnboardingStep3();
}

function pfOnboardingStep3() {
    const prefHTML=_onbCat.PREFERENCIAS.map(p=>`
        <label class="onb-radio ${_onbDatos.preferencia===p?'checked':''}">
            <input type="radio" name="pref" value="${p.replace(/"/g,'&quot;')}" ${_onbDatos.preferencia===p?'checked':''}>
            <span>${p}</span>
        </label>`).join('');
    document.getElementById('pf-content').innerHTML=`
    <div class="onb-wizard view-enter">
        ${pfOnbVolverHTML()}
        <div class="onb-progress">
            <div class="onb-step onb-step-done">✓ Condiciones</div>
            <div class="onb-step-line onb-step-line-done"></div>
            <div class="onb-step onb-step-done">✓ Alergias</div>
            <div class="onb-step-line onb-step-line-done"></div>
            <div class="onb-step onb-step-active">3. Preferencias</div>
        </div>
        <div class="onb-header">
            <h1>Preferencias Alimentarias</h1>
            <p>Tu preferencia ayuda a diseñar un plan nutricional que disfrutes y puedas mantener a largo plazo.</p>
        </div>
        <div class="onb-section-title">¿Cuál es tu preferencia alimentaria?</div>
        <div class="onb-radios">${prefHTML}</div>
        <div class="onb-actions">
            <button class="btn btn-ghost" onclick="pfOnboardingStep2()">← Atrás</button>
            <button class="btn btn-primary" onclick="pfOnboardingGuardar()">✓ Generar mi plan personalizado</button>
        </div>
    </div>`;
}

async function pfOnboardingGuardar() {
    const sel=document.querySelector('.onb-radios input[type=radio]:checked');
    _onbDatos.preferencia=sel?sel.value:'Sin restricciones';
    const main=document.getElementById('pf-content');
    main.innerHTML=`
    <div class="onb-wizard">
        <div class="onb-header">
            <h1>⏳ Generando tu plan personalizado...</h1>
            <p>Estamos creando tu rutina de entrenamiento y plan alimenticio basado en tu perfil médico. Esto toma unos segundos.</p>
        </div>
        <div style="display:flex;justify-content:center;padding:40px"><div class="auth-spinner-lg"></div></div>
    </div>`;
    const perfilData=await apiFetch(`${API}/panel/${currentUser.id}/perfil`).then(r=>r.json()).catch(()=>null);
    const posicion=perfilData?.perfil?.posicion||'Mediocampista';
    const res=await apiFetch(`${API}/perfil-medico/${currentUser.id}`,{
        method:'POST', body:JSON.stringify({..._onbDatos, posicion})
    });
    if(!res.ok){ showToast('Error al guardar el perfil médico. Intenta de nuevo.','error'); pfOnboardingStep3(); return; }
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b=>b.disabled=false);
    showToast(_onbActualizando?'Perfil actualizado. Tu plan se ha regenerado.':'¡Perfil médico completado! Tu plan personalizado ha sido generado.','success',5000);
    pfRenderView('plan');
}

// — MI PLAN (ATLETA) —
async function pfRenderPlan() {
    const userId=currentUser.id;
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const data=await apiFetch(`${API}/perfil-medico/${userId}`).then(r=>r.json()).catch(()=>null);
    if(!data?.perfil){ main.innerHTML=showError('No tienes un perfil médico guardado.','pfRenderView(\'plan\')'); return; }
    const{condiciones=[],alergias=[],preferencias='',planAlimenticio={},rutinaSemanal={}}=data.perfil;

    const semanaAlim   = planAlimenticio?.semana || [];
    const semanaRutina = rutinaSemanal?.semana   || [];

    const condTags=condiciones.length
        ? condiciones.map(c=>`<span class="plan-tag plan-tag-cond">${c}</span>`).join('')
        : `<span class="plan-tag plan-tag-none">Sin condiciones de salud</span>`;
    const alergTags=alergias.length
        ? alergias.map(a=>`<span class="plan-tag plan-tag-alerg">${a}</span>`).join('')
        : `<span class="plan-tag plan-tag-none">Sin alergias</span>`;
    const prefTag=`<span class="plan-tag plan-tag-pref">${preferencias||'Sin restricciones'}</span>`;

    const diasAlim   = semanaAlim.length;
    const diasRutina = semanaRutina.filter(d=>d.ejercicios&&d.ejercicios.length).length;

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mi Plan Personalizado</h1><p>Diseñado para tu rendimiento y recuperación</p></div>
            <button class="btn btn-ghost" onclick="pfRenderOnboarding(true)">⚙️ Actualizar perfil</button>
        </div>

        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>🩺 Tu Perfil Médico</h2></div>
            <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
                <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:6px">Condiciones de salud</div><div class="plan-perfil-tags">${condTags}</div></div>
                <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:6px">Alergias / Intolerancias</div><div class="plan-perfil-tags">${alergTags}</div></div>
                <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:6px">Preferencia alimentaria</div><div class="plan-perfil-tags">${prefTag}</div></div>
            </div>
        </div>

        <div class="historial-landing">
            <div class="historial-card" onclick="pfRenderPlanAlimenticio()">
                <div class="historial-card-icon">🍽</div>
                <div class="historial-card-title">Plan Alimenticio</div>
                <div class="historial-card-meta">${diasAlim ? diasAlim + ' días planificados' : 'Sin plan asignado'}</div>
                <div class="historial-card-arrow">→</div>
            </div>
            <div class="historial-card" onclick="pfRenderPlanRutina()">
                <div class="historial-card-icon">🏋</div>
                <div class="historial-card-title">Rutina de Entrenamiento</div>
                <div class="historial-card-meta">${diasRutina ? diasRutina + ' días de ejercicio' : 'Sin rutina asignada'}</div>
                <div class="historial-card-arrow">→</div>
            </div>
        </div>
    </div>`;
}

async function pfRenderPlanAlimenticio() {
    const userId=currentUser.id;
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const data=await apiFetch(`${API}/perfil-medico/${userId}`).then(r=>r.json()).catch(()=>null);
    if(!data?.perfil){ main.innerHTML=showError('No tienes un perfil médico guardado.','pfRenderPlan()'); return; }
    const{planAlimenticio={}}=data.perfil;
    const semanaAlim = planAlimenticio?.semana || [];
    const notasPlan  = planAlimenticio?.notas  || [];

    const SLOTS=[
        {key:'desayuno',      label:'Desayuno'},
        {key:'meriendaMañana',label:'Merienda mañana'},
        {key:'almuerzo',      label:'Almuerzo'},
        {key:'meriendaTarde', label:'Merienda tarde'},
        {key:'cena',          label:'Cena'}
    ];

    const planHTML=semanaAlim.length?semanaAlim.map(dia=>{
        const totalKcal=SLOTS.reduce((s,sl)=>s+(dia[sl.key]?.kcal||0),0);
        const comidasHTML=SLOTS.map(sl=>{
            const c=dia[sl.key]||{};
            return `
            <div class="plan-meal">
                <div class="plan-meal-tipo">${sl.label}</div>
                <div class="plan-meal-nombre">${c.nombre||'—'}</div>
                <div class="plan-meal-kcal">${c.kcal||0} kcal</div>
                ${c.proteina!=null?`<div class="plan-meal-macros">P:${c.proteina}g · C:${c.carbs}g · G:${c.grasa}g</div>`:''}
            </div>`;}).join('');
        return `
        <div class="plan-day-card">
            <div class="plan-day-header">
                <div class="plan-day-name">${dia.dia||''}</div>
                <div class="plan-day-kcal">~${totalKcal} kcal</div>
            </div>
            <div class="plan-meals-grid">${comidasHTML}</div>
        </div>`;}).join('')
        :`<p style="color:var(--text-muted);padding:16px 0">Plan no disponible.</p>`;

    const notasPlanHTML=notasPlan.length
        ?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;font-size:13px;color:#166534;margin-bottom:20px;line-height:1.8">${notasPlan.join('<br>')}</div>`:'';

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title">
                <button class="btn btn-ghost btn-sm" onclick="pfRenderPlan()" style="margin-bottom:6px">← Volver al plan</button>
                <h1>🍽 Plan Alimenticio</h1>
                <p>Tu menú personalizado para los 7 días</p>
            </div>
        </div>
        <div class="card">
            <div style="padding:20px">${notasPlanHTML}${planHTML}</div>
        </div>
    </div>`;
}

async function pfRenderPlanRutina() {
    const userId=currentUser.id;
    const main=document.getElementById('pf-content');
    main.innerHTML=showLoading();
    const data=await apiFetch(`${API}/perfil-medico/${userId}`).then(r=>r.json()).catch(()=>null);
    if(!data?.perfil){ main.innerHTML=showError('No tienes un perfil médico guardado.','pfRenderPlan()'); return; }
    const{rutinaSemanal={}}=data.perfil;
    const semanaRutina = rutinaSemanal?.semana || [];
    const notasRutina  = rutinaSemanal?.notas  || [];

    const cumplData=await apiFetch(`${API}/panel/${userId}/cumplimiento`).then(r=>r.json()).catch(()=>({datos:[]}));
    const cumplidos=cumplData.datos||[];
    const hoy=new Date().toISOString().slice(0,10);
    const diasSemana=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const diaHoy=diasSemana[new Date().getDay()];

    const rutinaHTML=semanaRutina.length?semanaRutina.map(dia=>{
        const esDescanso=!dia.ejercicios||dia.ejercicios.length===0;
        const yaCompleto=cumplidos.some(c=>c.diaSemana===dia.dia&&String(c.fecha||'').slice(0,10)===hoy);
        const esHoy=dia.dia===diaHoy;
        const ejercHTML=esDescanso
            ?`<span style="color:var(--text-muted);font-size:13px">Descanso activo · estiramientos suaves</span>`
            :dia.ejercicios.map(e=>{
                const det=e.series
                    ? (e.repeticiones ? `${e.series}×${e.repeticiones} reps` : `${e.series}×${e.tiempo||''}`)
                    : (e.tiempo||e.impacto||'');
                const nombreEsc=e.nombre.replace(/'/g,"\\'").replace(/"/g,'&quot;');
                return `<div class="plan-ejercicio"><div class="plan-ejercicio-info"><span>${e.nombre}</span><span class="plan-ejercicio-series">${det}</span></div><button class="btn-video" onclick="verVideoEjercicio('${nombreEsc}')">▶ Ver video</button></div>`;
            }).join('');
        const cumplBtn=esDescanso?''
            :yaCompleto
                ?`<span class="cumpl-badge cumpl-ok">✅ Completado hoy</span>`
                :esHoy
                    ?`<button class="btn btn-primary btn-sm cumpl-btn" onclick="pfModalCumplimiento('${dia.dia}','${(dia.tipo||'').replace(/'/g,"\\'").replace(/"/g,'&quot;')}')">✓ Marcar como completado</button>`
                    :``;
        return `
        <div class="plan-rutina-dia ${yaCompleto?'plan-dia-completo':''}">
            <div class="plan-rutina-dia-header">
                <div class="plan-rutina-dia-nombre">${dia.dia||''} — ${dia.tipo||''}</div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${cumplBtn}
                    <div class="plan-rutina-dia-tipo ${esDescanso?'descanso':''}">${esDescanso?'Descanso':'Entrenamiento'}</div>
                </div>
            </div>
            <div class="plan-ejercicios">${ejercHTML}</div>
        </div>`;}).join('')
        :`<p style="color:var(--text-muted);padding:16px 0">Rutina no disponible.</p>`;

    const notasRutinaHTML=notasRutina.length
        ?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;font-size:13px;color:#1e40af;margin-bottom:20px;line-height:1.8">${notasRutina.join('<br>')}</div>`:'';

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title">
                <button class="btn btn-ghost btn-sm" onclick="pfRenderPlan()" style="margin-bottom:6px">← Volver al plan</button>
                <h1>🏋 Rutina de Entrenamiento</h1>
                <p>Tu programa de ejercicio semanal</p>
            </div>
        </div>
        <div class="card">
            <div style="padding:20px">${notasRutinaHTML}${rutinaHTML}</div>
        </div>
    </div>`;
}

const RPE_ETIQUETAS = ['', 'Muy fácil', 'Muy fácil', 'Fácil', 'Fácil', 'Moderado', 'Moderado', 'Duro', 'Duro', 'Muy duro', 'Máximo'];

function pfModalCumplimiento(diaSemana, tipo) {
    const diaEsc=diaSemana.replace(/'/g,"\\'"), tipoEsc=tipo.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    openModal(`Sesión del ${diaSemana}`, `
        <div class="form-group"><label>¿Cómo te fue?</label>
            <div class="rd-opciones">
                <label class="rd-opcion"><input type="radio" name="cumpl-estado" value="completo" checked><span class="rd-radio"></span>La hice completa</label>
                <label class="rd-opcion"><input type="radio" name="cumpl-estado" value="parcial"><span class="rd-radio"></span>La hice a medias</label>
            </div>
        </div>
        <div class="form-group"><label>Duración (minutos)</label><input type="number" id="cumpl-minutos" value="60" min="1" max="300"></div>
        <div class="form-group"><label>¿Qué tan dura fue? <strong id="cumpl-rpe-lab">6 · Moderado</strong></label>
            <input type="range" id="cumpl-rpe" class="range-green" min="1" max="10" value="6" oninput="document.getElementById('cumpl-rpe-lab').textContent=this.value+' · '+RPE_ETIQUETAS[this.value]">
            <div class="rd-rango-lab"><span>1 · Muy fácil</span><span>10 · Máximo</span></div>
        </div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="pfMarcarCumplimiento('${diaEsc}','${tipoEsc}')">Guardar</button></div>`);
}

async function pfMarcarCumplimiento(diaSemana, tipo) {
    const userId=currentUser.id;
    const fecha=new Date().toISOString().slice(0,10);
    const estado=document.querySelector('input[name="cumpl-estado"]:checked')?.value||'completo';
    const duracionMinutos=Number(document.getElementById('cumpl-minutos')?.value)||60;
    const rpe=Number(document.getElementById('cumpl-rpe')?.value)||null;
    const res=await apiFetch(`${API}/panel/${userId}/cumplimiento`,{method:'POST',body:JSON.stringify({diaSemana,tipo,fecha,estado,duracionMinutos,rpe})}).then(r=>r.json()).catch(()=>null);
    closeModal();
    if(res?.ok){showToast(estado==='parcial'?`${diaSemana} registrado como parcial`:`¡${diaSemana} completado! 💪`);pfRenderPlanRutina();}
    else showToast('Error al registrar cumplimiento','error');
}

function verVideoEjercicio(nombre) {
    const query = encodeURIComponent(nombre + ' ejercicio tutorial');
    const ytUrl = `https://www.youtube.com/results?search_query=${query}`;
    openModal('▶ ' + nombre, `
        <div class="video-preview-box">
            <div class="video-preview-icon">▶</div>
            <div class="video-preview-nombre">${nombre}</div>
            <div class="video-preview-hint">Los videos se abren en YouTube para mayor compatibilidad</div>
            <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary video-preview-btn">
                Buscar en YouTube
            </a>
        </div>
    `);
}

// — ASISTENTE IA (ATLETA) —
function pfRenderIA() {
    const main = document.getElementById('pf-content');
    const categorias = [
        {
            titulo: '🏋️ Entrenamiento individual',
            preguntas: [
                { tipo: 'entrenamiento_personalizado', label: 'Crear mi rutina personalizada' },
                { tipo: 'entrenar_hoy', label: '¿Puedo entrenar hoy?' },
                { tipo: 'fatiga', label: '¿Qué tan cargado estoy?' }
            ]
        },
        {
            titulo: '🍽 Nutrición individual',
            preguntas: [
                { tipo: 'alimentacion_personalizada', label: 'Crear mi plan nutricional' },
                { tipo: 'nutricion', label: '¿Cómo va mi alimentación?' },
                { tipo: 'calorias', label: '¿Cuántas calorías consumo?' }
            ]
        },
        {
            titulo: '📋 Mi plan real',
            preguntas: [
                { tipo: 'personalizado', label: 'Generar mi plan completo' },
                { tipo: 'resumen', label: 'Resumen de mi semana' },
                { tipo: 'mejorar', label: 'Qué necesito mejorar' }
            ]
        }
    ];

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Asistente IA</h1><p>Plan personalizado según tu perfil, tu deporte y tu objetivo</p></div>
        </div>
        <div class="ia-layout">
            <div class="ia-col-preguntas">
                ${categorias.map(cat=>`
                <div class="ia-categoria">
                    <div class="ia-cat-titulo">${cat.titulo}</div>
                    <div class="ia-preguntas">
                        ${cat.preguntas.map(p=>`
                        <button class="ia-btn" onclick="pfConsultarIA('${p.tipo}',this)">${p.label}</button>`).join('')}
                    </div>
                </div>`).join('')}
            </div>
            <div class="ia-col-respuesta">
                <div id="ia-respuesta" class="ia-respuesta ia-placeholder">
                    <div class="ia-placeholder-inner">
                        <span class="ia-placeholder-icon">🤖</span>
                        <p>Selecciona una opción y la IA te generará un plan adaptado a ti.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

async function pfConsultarIA(tipo, btn) {
    document.querySelectorAll('.ia-btn').forEach(b=>b.classList.remove('ia-btn-active'));
    btn.classList.add('ia-btn-active');
    const box = document.getElementById('ia-respuesta');
    box.className = 'ia-respuesta ia-loading';
    box.innerHTML = '<div class="ia-spinner"></div> Analizando tus datos...';

    const data = await apiFetch(`${API}/ia/${currentUser.id}/consulta?tipo=${tipo}`).then(r=>r.json()).catch(()=>null);

    if (!data?.ok) {
        box.className = 'ia-respuesta ia-tipo-danger';
        box.innerHTML = '❌ Error al obtener el análisis. Intenta de nuevo.';
        return;
    }

    const colores = { success:'ia-tipo-success', warning:'ia-tipo-warning', danger:'ia-tipo-danger', info:'ia-tipo-info' };
    box.className = `ia-respuesta ${colores[data.tipo]||'ia-tipo-info'}`;
    box.innerHTML = `
        <div class="ia-resp-header">
            <span class="ia-resp-icono">${data.icono||'🤖'}</span>
            <span class="ia-resp-tipo">${btn.textContent}</span>
        </div>
        <div class="ia-resp-texto">${(data.respuesta||'').replace(/\n/g,'<br>')}</div>`;
}

// — SOPORTE (NUTRICIONISTA) —
async function ntRenderSoporte() {
    const main = document.getElementById('nt-content');
    const inc = await apiFetch(`${API}/incidencias`).then(r=>r.json()).catch(()=>[]);
    const abiertas = inc.filter(i=>i.estado==='abierta').length;

    // Los atletas ya no abren tickets al nutricionista (ahora escriben por chat);
    // los tickets antiguos se siguen mostrando mientras existan
    const ticketsHTML = inc.length ? `
        <div class="card">
            <div class="card-header">
                <h2>Tickets anteriores · ${abiertas} sin resolver</h2>
                <div style="display:flex;gap:8px">
                    <select id="nt-filter-estado" onchange="ntFiltrarSoporte()" style="font-size:13px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-2);color:var(--text)">
                        <option value="Todos">Todos</option>
                        <option value="abierta">Abiertos</option>
                        <option value="en progreso">En progreso</option>
                        <option value="resuelta">Resueltos</option>
                    </select>
                </div>
            </div>
            <div style="padding:16px 20px" id="nt-lista-soporte">
                ${ntRenderListaSoporte(inc)}
            </div>
        </div>` : '';

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mensajes</h1><p>Habla con tus atletas, con el equipo médico y con administración</p></div>
        </div>
        <div id="nt-mensajes"></div>
        ${ticketsHTML}
    </div>`;
    await msgMontar('nt-mensajes');
}

function ntRenderListaSoporte(lista) {
    if (!lista.length) return `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Sin consultas pendientes</p></div>`;
    return lista.map(i=>`
        <div class="incidencia-card" onclick="ntVerIncidencia(${i.id})" style="cursor:pointer">
            <div class="inc-header">
                <div class="inc-titulo">${escapeHtml(i.titulo)}</div>
                <div class="inc-meta">${incEstadoBadge(i.estado)}${prioridadBadge(i.prioridad)}<span class="badge" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0">${escapeHtml(i.categoria)}</span><span class="inc-usuario">👤 ${escapeHtml(i.usuario)}</span></div>
            </div>
            <div class="inc-footer">
                <span style="font-size:12px;color:var(--text-muted)">${i.fecha} · ${i.comentarios?.length||0} respuesta(s)</span>
                <span style="font-size:12px;color:var(--primary);font-weight:600">Responder →</span>
            </div>
        </div>`).join('');
}

async function ntFiltrarSoporte() {
    const estado = document.getElementById('nt-filter-estado').value;
    const params = estado !== 'Todos' ? `?estado=${encodeURIComponent(estado)}` : '';
    const inc = await apiFetch(`${API}/incidencias${params}`).then(r=>r.json()).catch(()=>[]);
    document.getElementById('nt-lista-soporte').innerHTML = ntRenderListaSoporte(inc);
}

async function ntVerIncidencia(id) {
    const inc = await apiFetch(`${API}/incidencias`).then(r=>r.json()).catch(()=>[]);
    const i = inc.find(x=>x.id===id); if(!i) return;
    const comentariosHTML = i.comentarios?.length
        ? i.comentarios.map(c=>`<div class="comment-item"><div class="comment-meta"><span class="comment-author">${escapeHtml(c.autor)}</span><span>${c.fecha}</span></div><div class="comment-text">${escapeHtml(c.texto)}</div></div>`).join('')
        : `<p style="font-size:13px;color:var(--text-muted)">Sin respuestas aún. Sé el primero en responder.</p>`;
    openModal(escapeHtml(i.titulo), `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${incEstadoBadge(i.estado)}${prioridadBadge(i.prioridad)}<span class="badge" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0">${escapeHtml(i.categoria)}</span><span class="inc-usuario">👤 ${escapeHtml(i.usuario)}</span></div>
        <div class="detail-desc" style="margin-bottom:16px">${escapeHtml(i.descripcion||'Sin descripción.')}</div>
        <div style="margin-bottom:12px">
            <label style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Cambiar estado</label>
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
                <button class="btn btn-sm ${i.estado==='abierta'?'btn-primary':'btn-ghost'}" onclick="ntCambiarEstado(${i.id},'abierta')">Abierta</button>
                <button class="btn btn-sm ${i.estado==='en progreso'?'btn-primary':'btn-ghost'}" onclick="ntCambiarEstado(${i.id},'en progreso')">En progreso</button>
                <button class="btn btn-sm ${i.estado==='resuelta'?'btn-primary':'btn-ghost'}" onclick="ntCambiarEstado(${i.id},'resuelta')">Resuelta</button>
            </div>
        </div>
        <div class="comments-section">
            <h4>Conversación (${i.comentarios?.length||0})</h4>
            <div id="nt-comments-list">${comentariosHTML}</div>
            <div style="display:flex;gap:8px;margin-top:12px">
                <input type="text" id="nt-comment-input" placeholder="Escribe tu respuesta al atleta..." style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-2);color:var(--text)">
                <button class="btn btn-primary btn-sm" onclick="ntEnviarRespuesta(${i.id})">Enviar</button>
            </div>
        </div>
    `);
}

async function ntCambiarEstado(id, estado) {
    const res = await apiFetch(`${API}/incidencias/${id}/estado`, {method:'PUT', body:JSON.stringify({estado})});
    if (res.ok) { showToast('Estado actualizado'); closeModal(); ntRenderSoporte(); }
    else showToast('Error al actualizar estado','error');
}

async function ntEnviarRespuesta(id) {
    const texto = document.getElementById('nt-comment-input').value.trim();
    if (!texto) return showToast('Escribe un mensaje primero','error');
    const res = await apiFetch(`${API}/incidencias/${id}/comentarios`, {method:'POST', body:JSON.stringify({texto})});
    if (res.ok) { showToast('Respuesta enviada'); ntVerIncidencia(id); ntActualizarBadgeSoporte(); }
    else showToast('Error al enviar respuesta','error');
}

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

function msgAvatar(nombre, extra = '') {
    const [c1, c2] = avatarColor(nombre);
    return `<span class="msg-avatar ${extra}" style="background:linear-gradient(135deg,${c1},${c2})">${getInitials(nombre)}</span>`;
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
                ${msgAvatar(c.nombre)}
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
            ${msgAvatar(contacto.nombre)}
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
    msgActualizarBadges();
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
    msgActualizarBadges();
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
    msgActualizarBadges();
    badgeInterval = setInterval(msgActualizarBadges, 30000);
}

function stopBadgePolling() {
    if (badgeInterval) { clearInterval(badgeInterval); badgeInterval = null; }
}

// — MENSAJES Y SOPORTE (ATLETA) —
const CATEGORIAS_TICKET = ['Problema técnico', 'Error de app', 'Cuenta o acceso', 'Consulta general'];

async function pfRenderSoporte() {
    const userId=currentUser.id;
    const inc=await apiFetch(`${API}/incidencias?userId=${userId}`).then(r=>r.json()).catch(()=>[]);
    const main=document.getElementById('pf-content');
    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header">
            <div class="view-title"><h1>Mensajes y soporte</h1><p>Habla directo con tu nutricionista y tu médico. Para problemas con la app, abre un ticket.</p></div>
        </div>

        <div id="pf-mensajes"></div>

        <div class="card">
            <div class="card-header">
                <div><h2>🛠️ Soporte técnico</h2><p class="msg-ayuda">Los tickets llegan a la bandeja del equipo de administración y los atiende el primero que esté disponible.</p></div>
                <button class="btn btn-primary btn-sm" onclick="pfModalNuevaIncidencia()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nuevo ticket
                </button>
            </div>
            <div style="padding:16px 20px">
                ${inc.length?inc.map(i=>`
                <div class="incidencia-card" onclick="pfVerIncidencia(${i.id})">
                    <div><div class="inc-titulo">${escapeHtml(i.titulo)}</div>
                        <div class="inc-meta">${incEstadoBadge(i.estado)}${prioridadBadge(i.prioridad)}<span class="badge" style="background:#f1f5f9;color:#64748b">${escapeHtml(i.categoria)}</span></div>
                    </div>
                    <div class="inc-actions"><span class="inc-fecha">${i.fecha}</span></div>
                </div>`).join(''):`<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No tienes tickets abiertos</p></div>`}
            </div>
        </div>
    </div>`;
    await msgMontar('pf-mensajes');
}

function pfModalNuevaIncidencia() {
    openModal('Nuevo ticket de soporte',`
        <div class="form-group"><label>Título *</label><input type="text" id="inc-titulo" placeholder="Describe brevemente el problema"></div>
        <div class="form-row">
            <div class="form-group">
                <label>Tipo</label>
                <select id="inc-categoria">${CATEGORIAS_TICKET.map(c=>`<option>${c}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Prioridad</label><select id="inc-prioridad"><option value="baja">Baja</option><option value="media" selected>Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></div>
        </div>
        <div class="msg-aviso-ticket">Llegará a la bandeja de <strong>Administración</strong>. Para dudas de alimentación o salud, escribe directamente a tu nutricionista o a tu médico.</div>
        <div class="form-group"><label>Descripción</label><textarea id="inc-desc" placeholder="Explica qué pasó, en qué pantalla y qué esperabas que ocurriera..."></textarea></div>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="pfCrearIncidencia()">Enviar ticket</button></div>
    `);
}

async function pfCrearIncidencia() {
    const titulo=document.getElementById('inc-titulo').value.trim();
    if(!titulo) return showToast('El título es obligatorio','error');
    const categoria=document.getElementById('inc-categoria').value;
    const body={titulo,categoria,prioridad:document.getElementById('inc-prioridad').value,descripcion:document.getElementById('inc-desc').value.trim()};
    const res=await apiFetch(`${API}/incidencias`,{method:'POST',body:JSON.stringify(body)});
    if(res.ok){closeModal();showToast('Ticket enviado correctamente');pfRenderSoporte();}
    else showToast('Error al enviar el ticket','error');
}

async function pfVerIncidencia(id) {
    const inc=await apiFetch(`${API}/incidencias?userId=${currentUser.id}`).then(r=>r.json());
    const i=inc.find(x=>x.id===id); if(!i) return;
    const comentariosHTML=i.comentarios.length?i.comentarios.map(c=>`<div class="comment-item"><div class="comment-meta"><span class="comment-author">${escapeHtml(c.autor)}</span><span>${c.fecha}</span></div><div class="comment-text">${escapeHtml(c.texto)}</div></div>`).join(''):`<p style="font-size:13px;color:var(--text-muted)">Sin respuestas aún.</p>`;
    openModal(escapeHtml(i.titulo),`
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${incEstadoBadge(i.estado)}${prioridadBadge(i.prioridad)}<span class="badge" style="background:#f1f5f9;color:#64748b">${escapeHtml(i.categoria)}</span></div>
        <div class="detail-desc">${escapeHtml(i.descripcion||'Sin descripción.')}</div>
        <div class="comments-section"><h4>Respuestas del equipo (${i.comentarios.length})</h4><div id="comments-list">${comentariosHTML}</div></div>
    `);
}

// ────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────
window.addEventListener('load', ()=>{
    const session=getSession(), token=getToken();
    if(session && token) routeUser(session, token);
});
