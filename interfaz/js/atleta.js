/* =============================================
   VitalTraining — atleta.js
   Panel del atleta: inicio, perfil, salud, historial y soporte.
============================================= */
/* global currentUser:writable, chartInstances:writable -- declaradas en comun.js; aquí se les asigna valor */

// ────────────────────────────────────────────────
// PANEL ATLETA
// ────────────────────────────────────────────────
async function showPanelAtleta(user) {
    setTitle('Dashboard');
    currentUser=user;
    hideAllPanels();
    document.getElementById('panel-futbolista').classList.remove('hidden');
    pintarAvatarPropio();
    document.getElementById('pf-nombre').textContent=user.nombre.split(' ').slice(0,2).join(' ');
    setupCounterObservers();
    startBadgePolling();
    // Server-side check — cannot be bypassed client-side
    const check=await apiFetch(`${API}/perfil-medico/${user.id}`).then(r=>r.json()).catch(()=>null);
    if (!check?.perfil) {
        enSegundoPlano(pfRenderOnboarding());
    } else {
        pfRenderView('dashboard');
    }
}

const showPanelFutbolista = showPanelAtleta;

function pfRenderView(view) {
    closeSidebar();
    const titles = { dashboard:'Dashboard', perfil:'Mi Perfil', salud:'Mi Salud', historial:'Historial', plan:'Mi Plan', tests:'Tests físicos', ia:'Asistente IA', soporte:'Mensajes y soporte' };
    setTitle(titles[view] || view);
    stopPolling();
    document.querySelectorAll('#panel-futbolista .nav-btn').forEach(b=>{ b.disabled=false; b.classList.toggle('active',b.dataset.pfView===view); });
    document.getElementById('pf-content').innerHTML=showLoading();
    Object.values(chartInstances).forEach(c=>c.destroy()); chartInstances={};
    if(view==='dashboard')  enSegundoPlano(pfRenderDashboard());
    else if(view==='perfil')    enSegundoPlano(pfRenderPerfil());
    else if(view==='salud')     enSegundoPlano(pfRenderSalud());
    else if(view==='historial') enSegundoPlano(pfRenderHistorial());
    else if(view==='ia')        enSegundoPlano(pfRenderIA());
    else if(view==='plan')      enSegundoPlano(pfRenderPlan());
    else if(view==='tests')     enSegundoPlano(pfRenderTests());
    else if(view==='soporte')   enSegundoPlano(pfRenderSoporte());
}

// — DASHBOARD —
async function pfRenderDashboard() {
    const userId=currentUser.id;
    const [data, saludData, rdData, lesiones] = await Promise.all([
        apiFetch(`${API}/panel/${userId}/dashboard`).then(r=>r.json()).catch(()=>null),
        apiFetch(`${API}/salud/${userId}`).then(r=>r.json()).catch(()=>[]),
        apiFetch(`${API}/rendimiento/${userId}`).then(r=>r.json()).catch(()=>null),
        lsCargar(userId)
    ]);
    const main=document.getElementById('pf-content');
    if(!data?.ok){main.innerHTML=showError('No se pudo cargar el dashboard.','pfRenderView(\'dashboard\')');return;}
    const{perfil,ultimasComidas,ultimasRutinas,alertasRecientes}=data.resumen;
    const ultimaSalud=saludData[0]||null;
    const saludHoy=ultimaSalud&&String(ultimaSalud.fecha).slice(0,10)===new Date().toISOString().slice(0,10)?ultimaSalud:null;
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
        ${lsTarjetaAtleta(lesiones)}
        ${rendimiento?rdSeccionDashboard(rendimiento):''}
        ${pfTarjetasResumen(data.resumen.hoy, saludHoy)}
        ${ultimaSalud?`
        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>📊 Mi estado físico hoy</h2><div style="display:flex;align-items:center;gap:10px"><span class="inc-fecha">${formatFecha(ultimaSalud.fecha)}</span><button class="btn btn-ghost btn-sm" onclick="pfRenderView('salud')">Ver mi salud →</button></div></div>
            <p class="salud-regla">Fatiga: cuanto más baja, mejor. Sueño y recuperación: cuanto más altos, mejor.</p>
            <div class="salud-big-grid">
                ${saludMeterBig('Fatiga',ultimaSalud.fatiga,'danger','fatiga')}
                ${saludMeterBig('Sueño',ultimaSalud.sueno,'blue','sueno')}
                ${saludMeterBig('Recuperación',ultimaSalud.recuperacion,'green','recuperacion')}
            </div>
            ${ultimaSalud.notas?`<div style="padding:0 20px 20px;font-size:13px;color:var(--text-muted)">📝 ${escapeHtml(ultimaSalud.notas)}</div>`:''}
        </div>`:''}
        <div class="charts-grid">
            <div class="card"><div class="card-header"><h2>🍽 Últimas comidas</h2></div><div style="padding:16px">
                ${ultimasComidas.length?ultimasComidas.map(c=>`<div class="mini-item"><strong>${escapeHtml(c.nombre)}</strong><span>${escapeHtml(c.tipo)} · ${c.calorias} kcal</span></div>`).join(''):`<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin comidas registradas.</p>`}
                <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="pfGoToHistorial('comidas', true)">＋ Registrar comida</button>
            </div></div>
            <div class="card"><div class="card-header"><h2>🏃 Últimas rutinas</h2></div><div style="padding:16px">
                ${ultimasRutinas.length?ultimasRutinas.map(r=>`<div class="mini-item"><strong>${escapeHtml(r.nombre)}</strong><span>${escapeHtml(r.tipo)} · ${r.duracionMinutos}min · ${escapeHtml(r.intensidad)}</span></div>`).join(''):`<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin rutinas registradas.</p>`}
                <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="pfGoToHistorial('rutinas', true)">＋ Registrar entrenamiento</button>
            </div></div>
        </div>
        ${alertasRecientes.length?`
        <div class="card" id="pf-alertas"><div class="card-header"><h2>🔔 Alertas recientes</h2>
            ${alertasRecientes.some(a=>!a.leida)?`<button class="btn btn-ghost btn-sm" onclick="pfLeerTodas()">Marcar todas leídas</button>`:''}
        </div><div style="padding:16px">
            ${alertasRecientes.map(a=>`
            <div class="mini-item ${!a.leida?'mini-item-unread':''}" style="gap:10px">
                <div class="mini-item-body"><div class="mini-item-title">${escapeHtml(a.mensaje)}</div><div class="mini-item-sub">${escapeHtml(a.tipo)} · ${formatFecha(a.fecha)}</div></div>
                ${!a.leida?`<button class="btn btn-ghost btn-sm" onclick="pfLeerAlerta(${a.id},this)">✓ Leída</button>`:'<span style="font-size:11px;color:var(--text-muted)">Leída</span>'}
            </div>`).join('')}
        </div></div>`:''}
    </div>`;
}

// Tarjetas del dashboard del atleta: cada una muestra un dato útil y lleva a donde se actúa
function pfTarjetasResumen(hoy = {}, saludHoy) {
    const tarjeta = ({ icono, color, valor, etiqueta, detalle, accion, onclick }) => `
        <button class="stat-card stat-card-accion" onclick="${onclick}">
            <div class="stat-icon ${color}">${icono}</div>
            <div class="stat-info">
                <div class="stat-value">${valor}</div>
                <div class="stat-label">${etiqueta}</div>
                ${detalle ? `<div class="stat-detalle">${detalle}</div>` : ''}
                <div class="stat-accion">${accion}</div>
            </div>
        </button>`;
    const entrenos = hoy.diasEntrenadosSemana ?? 0;
    const alertas = hoy.alertasSinLeer ?? 0;
    return `<div class="stats-grid">
        ${tarjeta({
            icono:'🍽', color:'blue', valor: hoy.comidas ?? 0,
            etiqueta: (hoy.comidas === 1 ? 'Comida' : 'Comidas') + ' hoy',
            detalle: hoy.calorias ? `${hoy.calorias} kcal` : 'Aún no registras comidas',
            accion: '+ Registrar comida', onclick: "pfGoToHistorial('comidas')"
        })}
        ${tarjeta({
            icono:'🏃', color:'green', valor: `${entrenos}<small>/7</small>`,
            etiqueta: 'Días entrenados',
            detalle: 'Últimos 7 días',
            accion: '+ Registrar entreno', onclick: "pfGoToHistorial('rutinas')"
        })}
        ${tarjeta({
            icono:'🔔', color: alertas ? 'yellow' : 'green', valor: alertas,
            etiqueta: alertas === 1 ? 'Alerta sin leer' : 'Alertas sin leer',
            detalle: alertas ? 'Revisa lo que te avisamos' : 'Todo al día ✓',
            accion: alertas ? 'Ver alertas ↓' : 'Ver historial →',
            onclick: alertas ? "document.getElementById('pf-alertas')?.scrollIntoView({behavior:'smooth'})" : "pfGoToHistorial()"
        })}
        ${saludHoy ? tarjeta({
            icono:'💪', color: saludHoy.fatiga >= 7 ? 'red' : saludHoy.fatiga >= 4 ? 'yellow' : 'green',
            valor: `${saludHoy.fatiga}<small>/10</small>`, etiqueta: 'Fatiga hoy',
            detalle: `Sueño ${saludHoy.sueno} · Recuperación ${saludHoy.recuperacion}`,
            accion: 'Ver mi salud →', onclick: "pfRenderView('salud')"
        }) : tarjeta({
            icono:'💪', color:'purple', valor: '—', etiqueta: 'Fatiga hoy',
            detalle: 'No has registrado tu salud hoy',
            accion: '+ Registrar ahora', onclick: "pfRenderView('salud')"
        })}
    </div>`;
}

function saludMeterBig(label, val, color, campo) {
    const pct=Math.round(val/10*100);
    const colors={danger:'#ef4444',blue:'#0ea5e9',green:'#16a34a'};
    return `<div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:${colors[color]};font-family:var(--mono)">${val}<span style="font-size:1rem;color:var(--text-muted)">/10</span></div><div class="meter-bar" style="margin:8px auto;max-width:100px"><div class="meter-fill" style="width:${pct}%;background:${colors[color]}"></div></div><div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.6px">${label}</div>${campo?saludLecturaHTML(campo,val):''}</div>`;
}

/**
 * Qué significa cada valor del 1 al 10. En fatiga, cuanto más bajo mejor; en sueño y
 * recuperación, cuanto más alto mejor. Los tramos "mal" coinciden con las alertas que
 * genera el servidor (salud.service.js: fatiga ≥ 8, sueño ≤ 4, recuperación ≤ 3).
 */
const SALUD_ESCALA = {
    fatiga: { nombre:'Fatiga', regla:'cuanto más baja, mejor', tramos:[
        [3,'bien','Descansado'], [5,'bien','Normal, puedes entrenar'], [7,'ojo','Cansado: baja la intensidad'], [10,'mal','Agotado: mejor descansar hoy'] ] },
    sueno: { nombre:'Sueño', regla:'cuanto más alto, mejor', tramos:[
        [4,'mal','Dormiste muy mal: más riesgo de lesión'], [6,'ojo','Sueño justo: acuéstate antes hoy'], [10,'bien','Dormiste bien'] ] },
    recuperacion: { nombre:'Recuperación', regla:'cuanto más alta, mejor', tramos:[
        [3,'mal','Sin recuperar: descanso o sesión muy suave'], [6,'ojo','A medias: entrena sin forzar'], [10,'bien','Recuperado: listo para entrenar'] ] }
};
const SALUD_ICONO = { bien:'✅', ojo:'⚠️', mal:'🔴' };

function saludLectura(campo, valor) {
    const t = SALUD_ESCALA[campo].tramos.find(([max]) => Number(valor) <= max) || SALUD_ESCALA[campo].tramos.at(-1);
    return { nivel: t[1], texto: t[2] };
}
function saludLecturaHTML(campo, valor) {
    const l = saludLectura(campo, valor);
    return `<div class="salud-lectura salud-${l.nivel}">${SALUD_ICONO[l.nivel]} ${l.texto}</div>`;
}
// Bienestar de 0 a 100 a partir de los tres valores (fatiga invertida)
function bienestarDe(r) {
    return Math.round(((10-Number(r.fatiga)) + (Number(r.sueno)-1) + (Number(r.recuperacion)-1)) / 27 * 100);
}
// Mientras mueve el control, explica qué significa el valor elegido
function saludActualizarControl(campo, valor) {
    document.getElementById(`val-${campo}`).textContent = valor;
    document.getElementById(`lect-${campo}`).innerHTML = saludLecturaHTML(campo, valor);
}

/**
 * Resumen en palabras: media de los últimos 7 días frente a los 7 anteriores.
 * Solo se habla de cambio si la media se mueve al menos medio punto.
 */
function saludResumenTendencia(registros) {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const diasAtras = r => Math.round((hoy - new Date(`${String(r.fecha).slice(0,10)}T00:00:00`)) / 86400000);
    const recientes = registros.filter(r => diasAtras(r) <= 6);
    const anteriores = registros.filter(r => diasAtras(r) >= 7 && diasAtras(r) <= 13);
    if (!recientes.length) return '<p class="tendencia-nada">Sin registros en los últimos 7 días. Registra hoy para ver cómo vas.</p>';
    const media = (lista, campo) => lista.reduce((s, r) => s + Number(r[campo]), 0) / lista.length;
    const fmt = n => n.toFixed(1).replace('.', ',');

    const filas = Object.entries(SALUD_ESCALA).map(([campo, cfg]) => {
        const ahora = media(recientes, campo);
        const lectura = saludLectura(campo, Math.round(ahora));
        let cambio = '';
        if (anteriores.length) {
            const antes = media(anteriores, campo);
            const dif = campo === 'fatiga' ? antes - ahora : ahora - antes; // positivo = mejor
            cambio = Math.abs(dif) < 0.5 ? '<span class="tend-igual">→ igual que la semana anterior</span>'
                : dif > 0 ? `<span class="tend-mejor">↑ mejor que la semana anterior (${fmt(antes)})</span>`
                : `<span class="tend-peor">↓ peor que la semana anterior (${fmt(antes)})</span>`;
        }
        return `<div class="tendencia-fila">
            <div class="tendencia-nombre">${cfg.nombre} <small>${cfg.regla}</small></div>
            <div class="tendencia-valor salud-${lectura.nivel}">${fmt(ahora)}<small>/10</small></div>
            <div class="tendencia-texto">${SALUD_ICONO[lectura.nivel]} ${lectura.texto}<br>${cambio}</div>
        </div>`;
    }).join('');

    const bAhora = Math.round(recientes.reduce((s, r) => s + bienestarDe(r), 0) / recientes.length);
    let titular = `Tu bienestar medio esta semana es ${bAhora}/100.`;
    if (anteriores.length) {
        const bAntes = Math.round(anteriores.reduce((s, r) => s + bienestarDe(r), 0) / anteriores.length);
        titular += bAhora - bAntes >= 5 ? ' 👍 Vas mejor que la semana pasada.' : bAntes - bAhora >= 5 ? ' 👀 Vas peor que la semana pasada: revisa sueño y descanso.' : ' Estás igual que la semana pasada.';
    }
    return `<p class="tendencia-titular">${titular}</p>${filas}`;
}

// — PERFIL —
async function pfRenderPerfil() {
    const userId=currentUser.id;
    const data=await apiFetch(`${API}/panel/${userId}/perfil`).then(r=>r.json()).catch(()=>null);
    const main=document.getElementById('pf-content');
    const p=data?.perfil||{};
    const sportOptions=DEPORTES_APP;
    const deporteActual = p.deportePrincipal || currentUser.deporte_principal || 'Fútbol';
    const sportConfig = getSportFieldConfig(deporteActual);
    const posicionActual = p.posicion || sportConfig.posicionOptions[0];

    main.innerHTML=`
    <div class="view-enter">
        <div class="view-header"><div class="view-title"><h1>Mi Perfil</h1><p>Tu información deportiva y de rendimiento</p></div></div>
        <div class="card" style="max-width:560px">
            <div class="card-header"><h2>Datos del perfil</h2></div>
            <div style="padding:24px;display:flex;flex-direction:column;gap:16px">
                <div class="perfil-foto-fila">
                    <div class="perfil-foto" id="perfil-foto">${avatarContenido(currentUser.id,currentUser.nombre)}</div>
                    <div><strong>Foto de perfil</strong><p class="msg-ayuda">JPG, PNG o WebP · máx. ${FOTO_REGLAS.maxArchivoMB} MB · mín. ${FOTO_REGLAS.minLado}×${FOTO_REGLAS.minLado} px</p><button type="button" class="btn btn-ghost btn-sm" onclick="modalFotoPerfil()">📷 Cambiar foto</button></div>
                </div>
                <div class="form-group"><label>Nombre completo</label><input type="text" id="pf-f-nombre" value="${escapeHtml(p.nombre||currentUser.nombre||'')}"></div>
                <div class="form-row">
                    <div class="form-group"><label>Deporte principal</label><select id="pf-f-deporte" onchange="pfCambiarDeporte()">${sportOptions.map(s=>`<option value="${s}" ${deporteActual===s?'selected':''}>${getSportIcon(s)} ${s}</option>`).join('')}</select></div>
                    <div class="form-group"><label id="pf-f-posicion-label">${sportConfig.posicionLabel.replace('*','')}</label><select id="pf-f-posicion">${sportConfig.posicionOptions.map(pos=>`<option value="${pos}" ${posicionActual===pos?'selected':''}>${pos}</option>`).join('')}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Edad</label><input type="number" id="pf-f-edad" value="${p.edad||''}" placeholder="22"></div>
                    <div class="form-group"><label>Altura (cm)</label><input type="number" id="pf-f-altura" value="${p.altura||''}" placeholder="178"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Peso (kg)</label><input type="number" id="pf-f-peso" value="${p.peso||''}" placeholder="72"></div>
                    <div class="form-group"><label>Sexo <span class="campo-ayuda">(para calcular tus calorías)</span></label><select id="pf-f-sexo">${['','Hombre','Mujer','Prefiero no decirlo'].map(s=>`<option value="${s}" ${(p.sexo||'')===s?'selected':''}>${s||'Selecciona…'}</option>`).join('')}</select></div>
                </div>
                <div class="form-group ${SIN_COMPETICION.includes(deporteActual)?'hidden':''}" id="pf-f-partido-grupo">
                    <label>📅 ¿Qué día tienes partido o competición?</label>
                    <select id="pf-f-partido">${diasPartidoOpciones(p.diaPartido)}</select>
                    <span class="campo-ayuda">Tu rutina, tus comidas y los consejos de sueño se organizan alrededor de ese día: la víspera es suave y con más carbohidratos, y el día siguiente es de recuperación.</span>
                </div>
                <div class="form-row">
                    <div class="form-group" style="grid-column:1/-1"><span style="color:var(--text-muted);font-size:12px;display:block;width:100%">Tu peso, altura, edad y sexo se usan para calcular tu plan de comidas. Tu selección de deporte se sincroniza con el registro inicial.</span></div>
                </div>
                <div class="form-actions"><button class="btn btn-primary" onclick="pfGuardarPerfil()">Guardar cambios</button></div>
            </div>
        </div>
    </div>`;
}

function diasPartidoOpciones(actual) {
    const opciones = [['', 'Selecciona…'], ...DIAS_SEMANA.map(d => [d, d]), ['Ninguno', 'No tengo partidos / día variable']];
    return opciones.map(([v, t]) => `<option value="${v}" ${(actual||'')===v?'selected':''}>${t}</option>`).join('');
}

// Cambiar de deporte cambia las posiciones disponibles sin perder lo que ya escribió
function pfCambiarDeporte() {
    const deporte = document.getElementById('pf-f-deporte').value;
    const cfg = getSportFieldConfig(deporte);
    document.getElementById('pf-f-posicion-label').textContent = cfg.posicionLabel.replace('*','');
    document.getElementById('pf-f-posicion').innerHTML = cfg.posicionOptions.map(p => `<option value="${p}">${p}</option>`).join('');
    document.getElementById('pf-f-partido-grupo').classList.toggle('hidden', SIN_COMPETICION.includes(deporte));
}

async function pfGuardarPerfil() {
    const userId=currentUser.id;
    const body={
        diaPartido: document.getElementById('pf-f-partido').value || undefined,
        nombre: document.getElementById('pf-f-nombre').value.trim(),
        edad: Number(document.getElementById('pf-f-edad').value),
        posicion: document.getElementById('pf-f-posicion').value,
        peso: Number(document.getElementById('pf-f-peso').value),
        altura: Number(document.getElementById('pf-f-altura').value),
        deportePrincipal: document.getElementById('pf-f-deporte').value,
        sexo: document.getElementById('pf-f-sexo').value
    };
    const res=await apiFetch(`${API}/panel/${userId}/perfil`,{method:'PUT',body:JSON.stringify(body)});
    if(res.ok){
        showToast(body.diaPartido && body.diaPartido!=='Ninguno' ? `Perfil actualizado · tu semana se organiza para el ${body.diaPartido.toLowerCase()}` : 'Perfil actualizado');
        currentUser.deporte_principal = body.deportePrincipal;
        setSession(currentUser, getToken());
        if (body.nombre) actualizarNombrePropio(body.nombre);
    }
    else showToast('Error al guardar','error');
}

// — SALUD —
async function pfRenderSalud() {
    const userId=currentUser.id;
    const registros=await apiFetch(`${API}/salud/${userId}`).then(r=>r.json()).catch(()=>[]);
    const main=document.getElementById('pf-content');
    const latest=registros[0], prev=registros[1];

    const wellness=latest?bienestarDe(latest):null;
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
                    <div class="sk-label">Fatiga hoy <small>(más baja = mejor)</small></div>
                    ${saludLecturaHTML('fatiga', latest.fatiga)}
                    ${trendArrow('fatiga')}
                    <div class="sk-avg">Prom. 7d: ${avgOf('fatiga')}</div>
                </div>
            </div>
            <div class="salud-kpi kpi-sueno">
                <div class="sk-icon">😴</div>
                <div class="sk-body">
                    <div class="sk-val">${latest.sueno}<span>/10</span></div>
                    <div class="sk-label">Sueño hoy <small>(más alto = mejor)</small></div>
                    ${saludLecturaHTML('sueno', latest.sueno)}
                    ${trendArrow('sueno')}
                    <div class="sk-avg">Prom. 7d: ${avgOf('sueno')}</div>
                </div>
            </div>
            <div class="salud-kpi kpi-rec">
                <div class="sk-icon">⚡</div>
                <div class="sk-body">
                    <div class="sk-val">${latest.recuperacion}<span>/10</span></div>
                    <div class="sk-label">Recuperación hoy <small>(más alta = mejor)</small></div>
                    ${saludLecturaHTML('recuperacion', latest.recuperacion)}
                    ${trendArrow('recuperacion')}
                    <div class="sk-avg">Prom. 7d: ${avgOf('recuperacion')}</div>
                </div>
            </div>
        </div>`:''}

        ${registros.length>=2?`
        <div class="card" style="margin-bottom:24px">
            <div class="card-header">
                <h2>📊 ¿Cómo vas?</h2>
                <span style="font-size:12px;color:var(--text-muted)">Esta semana frente a la anterior</span>
            </div>
            <div class="tendencia-cuerpo">
                ${saludResumenTendencia(registros)}
                <div class="tendencia-grafica-titulo">Bienestar de cada día <small>(0-100: junta fatiga, sueño y recuperación)</small></div>
                <div class="salud-chart-legend">
                    <span class="scl-item" style="color:#16a34a">● 70 o más: bien</span>
                    <span class="scl-item" style="color:#d97706">● 40-69: regular</span>
                    <span class="scl-item" style="color:#ef4444">● menos de 40: necesitas descansar</span>
                </div>
                <div class="chart-wrap" style="height:200px"><canvas id="chart-salud-trend"></canvas></div>
            </div>
        </div>`:''}

        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>📝 Registrar hoy</h2></div>
            <div style="padding:24px;display:flex;flex-direction:column;gap:20px">
                <div>
                    <label class="range-label">¿Qué tan cansado estás? <span id="val-fatiga">5</span>/10</label>
                    <input type="range" id="s-fatiga" min="1" max="10" value="5" oninput="saludActualizarControl('fatiga',this.value)" class="range-input range-danger">
                    <div class="range-hints"><span>1 = nada cansado</span><span>10 = agotado</span></div>
                    <div id="lect-fatiga">${saludLecturaHTML('fatiga',5)}</div>
                </div>
                <div>
                    <label class="range-label">¿Qué tan bien dormiste? <span id="val-sueno">7</span>/10</label>
                    <input type="range" id="s-sueno" min="1" max="10" value="7" oninput="saludActualizarControl('sueno',this.value)" class="range-input range-blue">
                    <div class="range-hints"><span>1 = casi nada / muy mal</span><span>10 = profundo, 8 h o más</span></div>
                    <div id="lect-sueno">${saludLecturaHTML('sueno',7)}</div>
                </div>
                <div>
                    <label class="range-label">¿Cómo de recuperado te sientes? <span id="val-recuperacion">5</span>/10</label>
                    <input type="range" id="s-rec" min="1" max="10" value="5" oninput="saludActualizarControl('recuperacion',this.value)" class="range-input range-green">
                    <div class="range-hints"><span>1 = con dolor, sin recuperar</span><span>10 = como nuevo</span></div>
                    <div id="lect-recuperacion">${saludLecturaHTML('recuperacion',5)}</div>
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
        // Una barra de bienestar por día, con el color de su zona
        const recientes=registros.slice(0,14).reverse();
        const valores=recientes.map(bienestarDe);
        const colorDe=v=>v>=70?'#16a34a':v>=40?'#d97706':'#ef4444';
        new Chart(document.getElementById('chart-salud-trend').getContext('2d'),{
            type:'bar',
            data:{labels:recientes.map(s=>formatFecha(s.fecha)),datasets:[{label:'Bienestar',data:valores,backgroundColor:valores.map(colorDe),borderRadius:6,maxBarThickness:28}]},
            options:{
                responsive:true,
                maintainAspectRatio:false,
                plugins:{
                    legend:{display:false},
                    tooltip:{
                        backgroundColor:'#0f172a',
                        bodyColor:'#f1f5f9',
                        padding:12,
                        cornerRadius:10,
                        bodyFont:{family:'Outfit',size:13},
                        callbacks:{
                            label:i=>`Bienestar: ${i.raw}/100`,
                            afterLabel:i=>{
                                const r=recientes[i.dataIndex];
                                return Object.keys(SALUD_ESCALA).map(c=>`${SALUD_ESCALA[c].nombre}: ${r[c]}/10 · ${saludLectura(c,r[c]).texto}`);
                            }
                        }
                    }
                },
                scales:{
                    x:{grid:{display:false},ticks:{font:{family:'Outfit',size:11},color:'#94a3b8'}},
                    y:{min:0,max:100,ticks:{stepSize:20,font:{family:'Outfit',size:11},color:'#94a3b8'},grid:{color:'rgba(148,163,184,0.15)'},border:{display:false}}
                }
            }
        });
    }
}

async function pfGuardarSalud() {
    const userId=currentUser.id;
    const body={fatiga:document.getElementById('s-fatiga').value,sueno:document.getElementById('s-sueno').value,recuperacion:document.getElementById('s-rec').value,notas:document.getElementById('s-notas').value.trim(),fecha:new Date().toISOString().slice(0,10)};
    const res=await apiFetch(`${API}/salud/${userId}`,{method:'POST',body:JSON.stringify(body)});
    if(res.ok){showToast('Registro de salud guardado');enSegundoPlano(pfRenderSalud());}
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
    if(res.ok) enSegundoPlano(pfRenderDashboard());
}

// — HISTORIAL —
// registrar = true: deja el cursor en el formulario para anotar directamente
async function pfGoToHistorial(sub, registrar = false) {
    document.querySelectorAll('[data-pf-view]').forEach(b=>b.classList.remove('active'));
    document.querySelector('[data-pf-view="historial"]')?.classList.add('active');
    if(sub==='comidas') await pfRenderHistorialComidas();
    else if(sub==='rutinas') await pfRenderHistorialRutinas();
    else return pfRenderHistorial();
    if(registrar) document.getElementById(sub==='comidas'?'hst-nombre':'rut-nombre')?.focus();
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
    enSegundoPlano(pfRenderHistorialComidas());
}

async function pfEliminarComida(userId, comidaId) {
    if(!confirm('¿Eliminar esta comida del registro?'))return;
    const res=await apiFetch(`${API}/panel/${userId}/comidas/${comidaId}`,{method:'DELETE'}).then(r=>r.json()).catch(()=>null);
    if(res?.ok){showToast('Comida eliminada');enSegundoPlano(pfRenderHistorialComidas());}
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
    enSegundoPlano(pfRenderHistorialRutinas());
}

async function pfEliminarRutina(userId, rutinaId) {
    if(!confirm('¿Eliminar esta sesión del registro?'))return;
    const res=await apiFetch(`${API}/panel/${userId}/rutinas/${rutinaId}`,{method:'DELETE'}).then(r=>r.json()).catch(()=>null);
    if(res?.ok){showToast('Sesión eliminada');enSegundoPlano(pfRenderHistorialRutinas());}
    else showToast('Error al eliminar','error');
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
    if(res.ok){closeModal();showToast('Ticket enviado correctamente');enSegundoPlano(pfRenderSoporte());}
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
