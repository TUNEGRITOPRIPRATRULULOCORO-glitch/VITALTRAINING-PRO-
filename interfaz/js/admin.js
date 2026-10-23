/* =============================================
   VitalTraining — admin.js
   Panel del administrador: dashboard, usuarios, reportes y soporte.
============================================= */

// ────────────────────────────────────────────────
// PANEL ADMIN
// ────────────────────────────────────────────────
function showPanel(user) {
    setTitle('Dashboard');
    currentUser=user;
    hideAllPanels();
    document.getElementById('app').classList.remove('hidden');
    setupCounterObservers();
    pintarAvatarPropio();
    document.getElementById('sidebar-name').textContent=user.nombre.split(' ').slice(0,2).join(' ');
    document.getElementById('sidebar-role').textContent=user.rol;
    startBadgePolling();
    renderView('dashboard');
}

// filtros: { rol, estado, prioridad } para abrir la vista ya filtrada (desde una tarjeta)
async function renderView(view, filtros = {}) {
    closeSidebar();
    const titles = { dashboard:'Dashboard', usuarios:'Usuarios', reportes:'Reportes', soporte:'Soporte' };
    setTitle(titles[view] || view);
    stopPolling();
    document.querySelectorAll('#app .nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    document.getElementById('content').innerHTML=showLoading();
    Object.values(chartInstances).forEach(c=>c.destroy()); chartInstances={};
    if(view==='dashboard')     { await renderDashboardAdmin(); startPolling(renderDashboardAdmin, 30); }
    else if(view==='usuarios') await renderUsuarios(filtros);
    else if(view==='reportes') { await renderReportes(); startPolling(renderReportes, 30); }
    else if(view==='soporte')  await renderSoporte(filtros);
}

/**
 * Tarjeta de cifra que lleva a otra pantalla. accion es el código JS del clic,
 * p. ej. "renderView('usuarios',{rol:'Futbolista'})". activa: resalta el filtro aplicado.
 */
function statLink(icono, color, valor, etiqueta, accion, activa = false) {
    return `<button type="button" class="stat-card stat-link ${activa?'stat-link-activa':''}" onclick="${accion}">
        <div class="stat-icon ${color}">${icono}</div>
        <div class="stat-info"><div class="stat-value">${valor}</div><div class="stat-label">${etiqueta}</div></div>
        <span class="stat-link-ir" aria-hidden="true">→</span>
    </button>`;
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
            ${statLink('👥','green',stats.activos,'Usuarios activos',"renderView('usuarios',{estado:'Activo'})")}
            ${statLink('🎫','red',abiertas,'Tickets abiertos',"renderView('soporte',{estado:'abierta'})")}
            ${statLink('🍽','blue',stats.totalComidas,'Comidas registradas',"renderView('reportes')")}
            ${statLink('🏃','purple',stats.totalRutinas,'Rutinas registradas',"renderView('reportes')")}
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
                ${[['Atletas',stats.porRol.Futbolista,'#0ea5e9','Futbolista'],['Nutricionistas',stats.porRol.Nutricionista,'#8b5cf6','Nutricionista'],['Médicos',stats.porRol.Medico||0,'#075985','Medico'],['Admins',stats.porRol.Administrador,'#f59e0b','Administrador']].map(([l,v,c,rol])=>`
                <div class="meter-wrap meter-link" role="button" tabindex="0" title="Ver ${l.toLowerCase()}" onclick="renderView('usuarios',{rol:'${rol}'})" onkeydown="if(event.key==='Enter')this.click()"><span class="meter-label">${l}</span><div class="meter-bar"><div class="meter-fill" style="width:${stats.totalUsuarios?Math.round(v/stats.totalUsuarios*100):0}%;background:${c}"></div></div><span class="meter-val">${v}</span></div>`).join('')}
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
async function renderUsuarios(filtros = {}) {
    const users=await apiFetch(`${API}/usuarios`).then(r=>r.json()).catch(()=>[]);
    const main=document.getElementById('content');
    const rolF=filtros.rol||'', estF=filtros.estado||'';
    const esAtleta=r=>['Atleta','Futbolista'].includes(r);
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
            ${statLink('👥','green',users.length,'Total usuarios',"renderView('usuarios')",!rolF&&!estF)}
            ${statLink('✅','blue',users.filter(u=>u.estado==='Activo').length,'Activos',"renderView('usuarios',{estado:'Activo'})",estF==='Activo'&&!rolF)}
            ${statLink('⏸','red',users.filter(u=>u.estado==='Inactivo').length,'Inactivos',"renderView('usuarios',{estado:'Inactivo'})",estF==='Inactivo'&&!rolF)}
            ${statLink('🏅','purple',users.filter(u=>esAtleta(u.rol)).length,'Atletas',"renderView('usuarios',{rol:'Futbolista'})",rolF==='Futbolista'&&!estF)}
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
    if(rolF||estF){
        if(rolF) document.getElementById('filter-rol').value=rolF;
        if(estF) document.getElementById('filter-estado').value=estF;
        await filtrarUsuarios();
    }
}

function renderFilasUsuarios(users) {
    if(!users.length) return `<tr><td colspan="4"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>Sin resultados</p></div></td></tr>`;
    return users.map(u=>{
        const[c1,c2]=avatarColor(u.nombre);
        return `<tr><td><div class="td-user"><div class="user-avatar-sm" style="background:linear-gradient(135deg,${c1},${c2})">${avatarContenido(u.id,u.nombre)}</div><div><div class="user-name">${escapeHtml(u.nombre)}</div><div class="user-email">${escapeHtml(u.email)}</div></div></div></td><td>${rolBadge(u.rol)}</td><td>${estadoBadge(u.estado)}</td><td><div class="td-actions">${u.tieneFoto?`<button class="btn btn-ghost btn-sm" data-tooltip="Ver o retirar la foto" onclick="modalFotoUsuario(${u.id},this)">🖼 Foto</button>`:''}<button class="btn btn-ghost btn-sm" data-tooltip="Editar usuario" onclick="modalEditarUsuario(${u.id})">✏ Editar</button><button class="btn btn-danger btn-sm" data-tooltip="Eliminar permanentemente" onclick="eliminarUsuario(${u.id},'${u.nombre.replace(/'/g,"\\'")}')">✕ Eliminar</button></div></td></tr>`;
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
    if(res.ok){
        closeModal(); showToast('Usuario actualizado');
        if(Number(id)===Number(currentUser.id)) actualizarNombrePropio(nombre); // se editó a sí mismo
        await renderUsuarios();
    }
    else showToast('Error al actualizar','error');
}

// Moderación de fotos: el admin ve la foto en grande y puede retirarla (el usuario recibe un aviso)
function modalFotoUsuario(id, boton) {
    const nombre = escapeHtml(boton.closest('tr').querySelector('.user-name').textContent);
    openModal(`Foto de ${nombre}`, `
        <div class="foto-moderar">${avatarContenido(id, nombre)}</div>
        <p class="msg-ayuda">Si la foto es inapropiada (desnudos, violencia, ofensiva o de otra persona), retírala. ${nombre} recibirá un aviso para subir otra.</p>
        <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cerrar</button><button class="btn btn-danger" onclick="retirarFotoUsuario(${id})">🚫 Retirar foto</button></div>
    `);
}

async function retirarFotoUsuario(id) {
    if(!confirm('¿Retirar esta foto de perfil?')) return;
    const res=await apiFetch(`${API}/usuarios/${id}/foto`,{method:'DELETE'});
    if(!res.ok){ const d=await res.json().catch(()=>({})); return showToast(d.error||'No se pudo retirar la foto','error'); }
    _fotoVersion[id]=Date.now();
    closeModal(); showToast('Foto retirada'); await filtrarUsuarios();
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
            ${statLink('👥','green',stats.totalUsuarios,'Total usuarios',"renderView('usuarios')")}
            ${statLink('✅','blue',stats.activos,'Activos',"renderView('usuarios',{estado:'Activo'})")}
            ${statLink('🎫','red',stats.totalIncidencias,'Incidencias',"renderView('soporte')")}
            ${statLink('🚨','yellow',stats.incidenciasCriticas,'Críticas',"renderView('soporte',{prioridad:'critica'})")}
        </div>
        <div class="charts-grid">
            <div class="card"><div class="card-header"><h2>Usuarios por rol</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-roles"></canvas></div></div></div>
            <div class="card"><div class="card-header"><h2>Incidencias por estado</h2></div><div style="padding:20px"><div class="chart-wrap"><canvas id="chart-incidencias"></canvas></div></div></div>
        </div>
        <div class="card"><div class="card-header"><h2>Estado general</h2></div><div style="padding:24px">
            <div class="stats-grid" style="margin-bottom:0;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
                ${statLink('🏅','green',stats.porRol.Futbolista,'Atletas',"renderView('usuarios',{rol:'Futbolista'})")}
                ${statLink('🥗','purple',stats.porRol.Nutricionista,'Nutricionistas',"renderView('usuarios',{rol:'Nutricionista'})")}
                ${statLink('🩺','blue',stats.porRol.Medico||0,'Médicos',"renderView('usuarios',{rol:'Medico'})")}
                ${statLink('🛡','yellow',stats.porRol.Administrador,'Administradores',"renderView('usuarios',{rol:'Administrador'})")}
                ${statLink('✔','green',stats.incidenciasPorEstado.resuelta||0,'Incidencias resueltas',"renderView('soporte',{estado:'resuelta'})")}
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
async function renderSoporte(filtros = {}) {
    const inc=await apiFetch(`${API}/incidencias`).then(r=>r.json()).catch(()=>[]);
    const estF=filtros.estado||'', prioF=filtros.prioridad||'';
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
            ${statLink('🎫','red',inc.length,'Total',"renderView('soporte')",!estF&&!prioF)}
            ${statLink('🔓','yellow',abiertas,'Abiertas',"renderView('soporte',{estado:'abierta'})",estF==='abierta')}
            ${statLink('🚨','red',criticas,'Críticas',"renderView('soporte',{prioridad:'critica'})",prioF==='critica')}
            ${statLink('✅','green',inc.filter(i=>i.estado==='resuelta').length,'Resueltas',"renderView('soporte',{estado:'resuelta'})",estF==='resuelta')}
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
    if(estF||prioF){
        if(estF) document.getElementById('filter-inc-estado').value=estF;
        if(prioF) document.getElementById('filter-inc-prioridad').value=prioF;
        await filtrarIncidencias();
    }
    await msgMontar('admin-mensajes');
    // Viene de una tarjeta: lleva directo a los tickets filtrados
    if(estF||prioF) document.getElementById('lista-incidencias').closest('.card').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderListaIncidencias(lista) {
    if(!lista.length) return `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No hay incidencias</p></div>`;
    const CATS_NUTRI = ['Nutrición','Plan alimenticio','Salud','Alimentación'];
    return lista.map(i=>{
        const esNutri = CATS_NUTRI.includes(i.categoria);
        const destBadge = esNutri
            ? `<span class="badge badge-dest-nutri">🥗 Nutricionista</span>`
            : `<span class="badge badge-dest-soporte">🛠 Soporte</span>`;
        return `
        <div class="incidencia-card inc-${i.estado.replace(' ','-')}" onclick="verIncidencia(${i.id})">
            <div><div class="inc-titulo">${escapeHtml(i.titulo)}</div>
                <div class="inc-meta"><span class="badge badge-${i.prioridad}">Prioridad ${INC_PRIORIDAD[i.prioridad]||i.prioridad}</span>${destBadge}<span class="badge badge-cat">🏷 ${escapeHtml(i.categoria)}</span><span class="badge badge-autor">👤 ${escapeHtml(i.usuario)}</span></div>
                ${i.comentarios?.length?`<div class="inc-resumen">💬 ${i.comentarios.length} ${i.comentarios.length===1?'respuesta':'respuestas'}</div>`:'<div class="inc-resumen">Sin respuesta todavía · pulsa para responder</div>'}
            </div>
            <div class="inc-actions"><span class="inc-fecha">${i.fecha}</span>
                ${selectEstadoInc(i)}
            </div>
        </div>`;
    }).join('');
}

async function filtrarIncidencias() {
    const estado=document.getElementById('filter-inc-estado').value, prioridad=document.getElementById('filter-inc-prioridad').value;
    const data=await apiFetch(`${API}/incidencias?estado=${encodeURIComponent(estado)}&prioridad=${encodeURIComponent(prioridad)}`).then(r=>r.json()).catch(()=>[]);
    document.getElementById('lista-incidencias').innerHTML=renderListaIncidencias(data);
}

const INC_PRIORIDAD = { critica:'crítica', alta:'alta', media:'media', baja:'baja' };
const INC_ESTADOS = { abierta:'🔴 Abierta', 'en progreso':'🟡 En progreso', resuelta:'🟢 Resuelta' };

// Desplegable de estado con flecha y color según el estado
function selectEstadoInc(i, extra = '') {
    return `<label class="estado-select-wrap" onclick="event.stopPropagation()" title="Cambiar estado">
        <select class="estado-select estado-${i.estado.replace(' ','-')}" ${extra} onchange="cambiarEstadoInc(${i.id},this.value,this)">
            ${Object.entries(INC_ESTADOS).map(([v,t])=>`<option value="${v}" ${i.estado===v?'selected':''}>${t}</option>`).join('')}
        </select>
    </label>`;
}

async function cambiarEstadoInc(id,estado,select) {
    const res=await apiFetch(`${API}/incidencias/${id}/estado`,{method:'PUT',body:JSON.stringify({estado})});
    if(!res.ok) return showToast('Error al actualizar','error');
    showToast(`Estado: ${INC_ESTADOS[estado]}`);
    if(select){
        select.className=`estado-select estado-${estado.replace(' ','-')}`;
        select.closest('.incidencia-card')?.setAttribute('class',`incidencia-card inc-${estado.replace(' ','-')}`);
    }
}

async function verIncidencia(id) {
    const inc=await apiFetch(`${API}/incidencias`).then(r=>r.json());
    const i=inc.find(x=>Number(x.id)===Number(id)); if(!i) return;
    const comentariosHTML=i.comentarios.length?i.comentarios.map(c=>`<div class="comment-item"><div class="comment-meta"><span class="comment-author">${escapeHtml(c.autor)}</span><span>${c.fecha}</span></div><div class="comment-text">${escapeHtml(c.texto)}</div></div>`).join(''):`<p style="font-size:13px;color:var(--text-muted)">Sin comentarios aún.</p>`;
    openModal(escapeHtml(i.titulo),`
        <div class="inc-detalle-cabecera">
            <div class="inc-detalle-dato"><span>Estado</span>${selectEstadoInc(i, 'id="inc-modal-estado"')}</div>
            <div class="inc-detalle-dato"><span>Prioridad</span>${prioridadBadge(i.prioridad)}</div>
            <div class="inc-detalle-dato"><span>Tipo</span><span class="badge badge-cat">${escapeHtml(i.categoria)}</span></div>
        </div>
        <div class="inc-detalle-autor">Reportado por <strong>${escapeHtml(i.usuario)}</strong> el ${i.fecha}</div>
        <div class="detail-desc">${i.descripcion?.trim()?escapeHtml(i.descripcion):'<em>El atleta no escribió una descripción. Pregúntale los detalles en la respuesta.</em>'}</div>
        <div class="comments-section"><h4>Respuestas (${i.comentarios.length})</h4><div id="comments-list">${comentariosHTML}</div>
            <div class="comment-form"><textarea id="nuevo-comentario" placeholder="Escribe tu respuesta al atleta…"></textarea><button class="btn btn-primary btn-sm" onclick="enviarComentario(${i.id})" style="align-self:flex-end">Enviar respuesta</button></div>
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
