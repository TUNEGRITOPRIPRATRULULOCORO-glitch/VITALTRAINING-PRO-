/* =============================================
   VitalTraining — nutricionista.js
   Panel del nutricionista: atletas, expedientes y soporte.
============================================= */
/* global currentUser:writable -- declaradas en comun.js; aquí se les asigna valor */

// ────────────────────────────────────────────────
// PANEL NUTRICIONISTA
// ────────────────────────────────────────────────
function showPanelNutricionista(user) {
    setTitle('Dashboard');
    currentUser=user;
    hideAllPanels();
    document.getElementById('panel-nutricionista').classList.remove('hidden');
    pintarAvatarPropio();
    document.getElementById('nt-nombre').textContent=user.nombre.split(' ').slice(0,2).join(' ');
    setupCounterObservers();
    ntRenderView('dashboard');
    startBadgePolling();
}

// filtro: '' | 'con' | 'alta' | 'media' | 'sin' para abrir "Mis Atletas" ya filtrado
function ntRenderView(view, filtro = '') {
    closeSidebar();
    const titles = { dashboard:'Dashboard', pacientes:'Mis Atletas', citas:'Citas', soporte:'Mensajes' };
    setTitle(titles[view] || view);
    stopPolling();
    document.querySelectorAll('#panel-nutricionista .nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.ntView===view));
    document.getElementById('nt-content').innerHTML=showLoading();
    if(view==='dashboard') { enSegundoPlano(ntRenderDashboard()); startPolling(ntRenderDashboard, 30); }
    else if(view==='pacientes') enSegundoPlano(ntRenderPacientes(filtro));
    else if(view==='citas')     enSegundoPlano(citasRenderProfesional('nt-content'));
    else if(view==='soporte')   enSegundoPlano(ntRenderSoporte());
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
            ${statLink('🏅','purple',futbolistas.length,'Atletas activos',"ntRenderView('pacientes')")}
            ${statLink('✅','green',conSalud,'Con datos de salud',"ntRenderView('pacientes','con')")}
            ${statLink('🔥','red',fatigaAlta,'Fatiga alta (≥8)',"ntRenderView('pacientes','alta')")}
            ${statLink('⚠️','yellow',sinDatos,'Sin registro',"ntRenderView('pacientes','sin')")}
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
                        <div class="mini-item-icon" style="background:linear-gradient(135deg,${c1},${c2});color:white;font-weight:700;font-size:11px">${avatarContenido(f.id,f.nombre)}</div>
                        <div class="mini-item-body">
                            <div class="mini-item-title">${escapeHtml(f.nombre)}</div>
                            <div class="mini-item-sub">${ntResumenFicha(f.ficha)} · ${f.totalComidas} comidas · ${f.totalRutinas} rutinas</div>
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

async function ntRenderPacientes(filtro = '') {
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
                    <option value="con">Con datos de salud</option>
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
    if (filtro) { document.getElementById('nt-filter-fatiga').value = filtro; ntFiltrarPacientes(); }
}

function ntFiltrarPacientes() {
    const q      = document.getElementById('nt-search')?.value.toLowerCase() || '';
    const filtro = document.getElementById('nt-filter-fatiga')?.value || '';
    let lista    = _ntTodosPacientes;
    if (q) lista = lista.filter(f => f.nombre.toLowerCase().includes(q));
    if (filtro === 'con')   lista = lista.filter(f => f.ultimaSalud);
    if (filtro === 'alta')  lista = lista.filter(f => f.ultimaSalud?.fatiga >= 8);
    if (filtro === 'media') lista = lista.filter(f => f.ultimaSalud?.fatiga >= 4 && f.ultimaSalud?.fatiga < 8);
    if (filtro === 'sin')   lista = lista.filter(f => !f.ultimaSalud);
    const grid = document.getElementById('nt-pacientes-grid');
    if (grid) grid.innerHTML = lista.length ? lista.map(f=>ntCardFutbolista(f)).join('') :
        `<div class="empty-state" style="grid-column:1/-1"><p>Sin resultados</p></div>`;
}

// "⚽ Delantero · 72 kg · 178 cm" para la tarjeta del atleta
function ntResumenFicha(ficha) {
    if (!ficha) return 'Sin datos deportivos';
    const cfg = getSportFieldConfig(ficha.deporte);
    const partes = [ficha.posicion ? escapeHtml(ficha.posicion) : `Sin ${cfg.posicionLabel.replace(' *', '').toLowerCase()}`];
    if (ficha.peso) partes.push(`${ficha.peso} kg`);
    if (ficha.altura) partes.push(`${ficha.altura} cm`);
    return `${getSportIcon(ficha.deporte)} ${partes.join(' · ')}`;
}

function ntCardFutbolista(f) {
    const[c1,c2]=avatarColor(f.nombre);
    const salud=f.ultimaSalud;
    const fatigaColor=salud?(salud.fatiga>=7?'var(--danger)':salud.fatiga>=4?'var(--warning)':'var(--primary)'):'var(--text-muted)';
    return `
    <div class="paciente-card" onclick="ntVerDetalle(${f.id})">
        <div class="paciente-header">
            <div class="paciente-avatar" style="background:linear-gradient(135deg,${c1},${c2})">${avatarContenido(f.id,f.nombre)}</div>
            <div class="paciente-info">
                <div class="paciente-nombre">${escapeHtml(f.nombre)}</div>
                <div class="paciente-pos">${ntResumenFicha(f.ficha)}</div>
                ${f.equipos?.length ? `<div>${eqChips(f.equipos)}</div>` : ''}
                ${f.rendimiento?.estadoMedico && f.rendimiento.estadoMedico.estado !== 'apto' ? `<div style="margin-top:4px">${lsBadgeEstado(f.rendimiento.estadoMedico)}</div>` : ''}
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
        const [data, medico, lesiones]=await Promise.all([
            apiFetch(`${API}/nutricionista/futbolistas/${userId}`).then(r=>r.json()).catch(()=>null),
            apiFetch(`${API}/perfil-medico/${userId}`).then(r=>r.json()).catch(()=>null),
            lsCargar(userId)
        ]);
        if(!data?.ok) return showToast('No se pudo cargar el atleta. Intenta de nuevo.','error');
        const d=data.detalle;
        const objetivos=medico?.perfil?.planAlimenticio?.objetivos;
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

        // Lesionado: el nutricionista lo ve para ajustar las comidas (las notas clínicas no le llegan)
        const lesionHTML=lesiones?.activas.length?`
            <div class="ls-aviso ${LS_ESTADO[lesiones.estado.estado]?.clase||''}">
                <strong>${LS_ESTADO[lesiones.estado.estado]?.icono||''} ${escapeHtml(lesiones.estado.etiqueta)}: ${lesiones.activas.map(lsTitulo).join(' · ')}</strong>
                <div>${lesiones.estado.estado==='no_apto'?'No está entrenando: ajusta la energía a días de descanso y mantén la proteína alta para la recuperación.':'Entrena adaptado, con menos carga de lo habitual.'}</div>
            </div>`:'';
        const saludHTML=`
            ${lesionHTML}
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
                <div class="paciente-avatar" style="background:linear-gradient(135deg,${c1},${c2})">${avatarContenido(d.id,d.nombre)}</div>
                <div class="paciente-hero-info">
                    <h3>${escapeHtml(d.nombre)}</h3>
                    ${fichaDeportivaHTML(d.ficha)}
                    ${objetivos?`<div class="nut-hero-objetivos">🎯 Entreno <strong>${nutFormato(objetivos.entreno.kcal)} kcal</strong> · Descanso <strong>${nutFormato(objetivos.descanso.kcal)} kcal</strong> · Proteína <strong>${objetivos.entreno.proteina} g</strong> · Carbohidratos <strong>${objetivos.descanso.carbs}–${objetivos.entreno.carbs} g</strong></div>`:''}
                </div>
            </div>
            <div class="detalle-tabs">
                <button class="detalle-tab active" onclick="switchTab(this,'tab-salud')">💪 Salud</button>
                <button class="detalle-tab" onclick="switchTab(this,'tab-notas')">📝 Notas</button>
                <button class="detalle-tab" onclick="switchTab(this,'tab-comidas')">🍽 Comidas</button>
                <button class="detalle-tab" onclick="switchTab(this,'tab-rutinas')">🏃 Rutinas</button>
                <button class="detalle-tab" onclick="switchTab(this,'tab-fuerza')">🏅 Fuerza</button>
            </div>
            <div id="tab-salud" class="detalle-tab-content" style="padding:16px">${saludHTML}</div>
            <div id="tab-notas" class="detalle-tab-content hidden" style="padding:16px">${notasHTML}</div>
            <div id="tab-comidas" class="detalle-tab-content hidden" style="padding:16px">${comidasHTML}</div>
            <div id="tab-rutinas" class="detalle-tab-content hidden" style="padding:16px">${rutinasHTML}</div>
            <div id="tab-fuerza" class="detalle-tab-content hidden" style="padding:16px"><div id="nt-rangos">${showLoading()}</div></div>`;
        enSegundoPlano(rgRenderResumen('nt-rangos', userId));

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
    if(res.ok){showToast('Nota guardada');enSegundoPlano(ntVerDetalle(userId));}
    else showToast('Error al guardar la nota','error');
}

async function ntRegistrarComida(userId) {
    const nombre=document.getElementById('nt-c-nombre').value.trim();
    if(!nombre) return showToast('El nombre es obligatorio','error');
    const body={nombre,tipo:document.getElementById('nt-c-tipo').value,calorias:document.getElementById('nt-c-cals').value,fecha:document.getElementById('nt-c-fecha').value};
    const res=await apiFetch(`${API}/nutricionista/futbolistas/${userId}/comidas`,{method:'POST',body:JSON.stringify(body)});
    if(res.ok){showToast('Comida registrada');enSegundoPlano(ntVerDetalle(userId));}
    else showToast('Error al registrar','error');
}

async function ntRegistrarRutina(userId) {
    const nombre=document.getElementById('nt-r-nombre').value.trim();
    if(!nombre) return showToast('El nombre es obligatorio','error');
    const body={nombre,tipo:document.getElementById('nt-r-tipo').value,duracionMinutos:document.getElementById('nt-r-dur').value,intensidad:document.getElementById('nt-r-int').value,descripcion:document.getElementById('nt-r-desc').value.trim()};
    const res=await apiFetch(`${API}/nutricionista/futbolistas/${userId}/rutinas`,{method:'POST',body:JSON.stringify(body)});
    if(res.ok){showToast('Rutina registrada');enSegundoPlano(ntVerDetalle(userId));}
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
    if (res.ok) { showToast('Estado actualizado'); closeModal(); enSegundoPlano(ntRenderSoporte()); }
    else showToast('Error al actualizar estado','error');
}

async function ntEnviarRespuesta(id) {
    const texto = document.getElementById('nt-comment-input').value.trim();
    if (!texto) return showToast('Escribe un mensaje primero','error');
    const res = await apiFetch(`${API}/incidencias/${id}/comentarios`, {method:'POST', body:JSON.stringify({texto})});
    if (res.ok) { showToast('Respuesta enviada'); enSegundoPlano(ntVerIncidencia(id)); enSegundoPlano(ntActualizarBadgeSoporte()); }
    else showToast('Error al enviar respuesta','error');
}
