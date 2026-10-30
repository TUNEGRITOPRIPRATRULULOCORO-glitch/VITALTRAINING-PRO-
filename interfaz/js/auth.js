/* =============================================
   VitalTraining — auth.js
   Portada pública, inicio de sesión, registro (también con Google),
   recuperar contraseña y animaciones de la pantalla de entrada.
============================================= */
/* global currentUser:writable, chartInstances:writable -- declaradas en comun.js; aquí se les asigna valor */

// ── Portada pública ────────────────────────────────────────────
function mostrarInicio() {
    setTitle('');
    hideAllPanels();
    document.getElementById('inicio-publico').classList.remove('hidden');
    window.scrollTo(0, 0);
    animarPortadaPublica();
}

// Desde la portada: abre el inicio de sesión o el registro
function abrirAuth(pantalla) {
    hideAllPanels();
    document.getElementById('auth-screen').classList.remove('hidden');
    showAuthScreen(pantalla);
    window.scrollTo(0, 0);
}

// Las secciones aparecen suavemente al bajar (salvo si el sistema pide menos movimiento)
let _portadaObservador = null;
function animarPortadaPublica() {
    const elementos = document.querySelectorAll('#inicio-publico .ip-aparece');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
        elementos.forEach(el => el.classList.add('ip-visible'));
        return;
    }
    _portadaObservador ??= new IntersectionObserver(entradas => entradas.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('ip-visible'); _portadaObservador.unobserve(e.target); }
    }), { threshold: 0.15 });
    elementos.forEach(el => { if (!el.classList.contains('ip-visible')) _portadaObservador.observe(el); });
}

function showAuthScreen(id) {
    document.querySelectorAll('#auth-screen .auth-container').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.style.animation='none'; void el.offsetWidth; el.style.animation=''; }
}


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

// ── Entrar con Google ──────────────────────────────────────────
// Solo aparece si el servidor tiene GOOGLE_CLIENT_ID. Google devuelve una credencial firmada
// que el servidor comprueba; si el correo no tiene cuenta, se completa el registro sin contraseña.
let _googleCredencial = null;

async function iniciarGoogle() {
    const cfg = await fetch(`${API}/auth/config`).then(r => r.json()).catch(() => ({}));
    if (!cfg.googleClientId) return;
    await new Promise((ok, falla) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true; s.onload = ok; s.onerror = falla;
        document.head.appendChild(s);
    }).catch(() => null);
    if (!window.google?.accounts?.id) return;
    google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: respuestaGoogle, ux_mode: 'popup' });
    document.querySelectorAll('.google-btn').forEach(el => {
        google.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', width: 320, text: el.dataset.texto || 'continue_with', locale: 'es' });
        el.closest('.google-bloque')?.classList.remove('hidden');
    });
}

async function respuestaGoogle({ credential }) {
    const errorEl = document.getElementById('login-error');
    try {
        const res = await fetch(`${API}/auth/google`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ credencial: credential }) });
        const data = await res.json();
        if (!res.ok) { mostrarErrorGoogle(data.error || 'No se pudo entrar con Google.'); return; }
        if (!data.nuevo) { routeUser(data.user, data.token); return; }
        // Correo sin cuenta: completa el registro con su nombre y correo de Google
        _googleCredencial = credential;
        document.getElementById('reg-nombre').value = data.nombre || '';
        const email = document.getElementById('reg-email');
        email.value = data.email; email.readOnly = true;
        document.getElementById('reg-password-grupo').classList.add('hidden');
        document.getElementById('reg-google-aviso').classList.remove('hidden');
        errorEl?.classList.add('hidden');
        showAuthScreen('screen-register-0');
    } catch { mostrarErrorGoogle('No se pudo conectar al servidor.'); }
}

function mostrarErrorGoogle(msg) {
    const visible = document.querySelector('#auth-screen .auth-container:not(.hidden) .auth-error');
    const el = visible || document.getElementById('login-error');
    el.textContent = msg; el.classList.remove('hidden');
}

// Volver al registro normal (con contraseña)
function cancelarRegistroGoogle() {
    _googleCredencial = null;
    const email = document.getElementById('reg-email');
    email.readOnly = false; email.value = '';
    document.getElementById('reg-password-grupo').classList.remove('hidden');
    document.getElementById('reg-google-aviso').classList.add('hidden');
}

// ── Ver u ocultar contraseña ───────────────────────────────────
const OJO_ABIERTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const OJO_CERRADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';

function ponerOjosPassword() {
    document.querySelectorAll('.auth-input-wrap input[type="password"]').forEach(input => {
        if (input.dataset.ojo) return;
        input.dataset.ojo = '1';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'auth-ojo';
        btn.setAttribute('aria-label', 'Mostrar contraseña');
        btn.innerHTML = OJO_ABIERTO;
        btn.addEventListener('click', () => {
            const ver = input.type === 'password';
            input.type = ver ? 'text' : 'password';
            btn.innerHTML = ver ? OJO_CERRADO : OJO_ABIERTO;
            btn.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
            input.focus();
        });
        input.after(btn);
    });
}

document.addEventListener('DOMContentLoaded', ()=>{
    ponerOjosPassword();
    enSegundoPlano(iniciarGoogle());
    ['login-email','login-password'].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('keydown', e=>{ if(e.key==='Enter') enSegundoPlano(doLogin()); }); });
});

// ── Registro ───────────────────────────────────────────────────
// Paso 0: atleta por su cuenta ('solo'), se une a su equipo con un código ('unirse') o es
// entrenador y crea su equipo ('crear'). El entrenador no necesita ficha deportiva.
const _registro = { modo: 'solo', codigo: null, equipo: null, equipoNombre: '', equipoDeporte: '' };

function regError(id, texto) {
    const el = document.getElementById(id);
    el.textContent = texto || '';
    el.classList.toggle('hidden', !texto);
}

function elegirModoRegistro(modo) {
    _registro.modo = modo;
    document.querySelectorAll('.reg-modo').forEach(b => b.classList.toggle('activo', b.dataset.modo === modo));
    document.getElementById('reg-unirse').classList.toggle('hidden', modo !== 'unirse');
    document.getElementById('reg-crear').classList.toggle('hidden', modo !== 'crear');
    regError('reg0-error', '');
    if (modo === 'solo') { _registro.codigo = null; _registro.equipo = null; irAlPaso1(); }
    else document.getElementById(modo === 'unirse' ? 'reg-codigo' : 'reg-equipo-nombre').focus();
}

async function comprobarCodigoEquipo() {
    const codigo = document.getElementById('reg-codigo').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (codigo.length !== 6) return regError('reg0-error', 'El código tiene 6 letras o números.');
    const res = await fetch(`${API}/auth/equipo/${encodeURIComponent(codigo)}`)
        .then(async r => ({ ok: r.ok, datos: await r.json().catch(() => ({})) })).catch(() => null);
    if (!res) return regError('reg0-error', 'No se pudo conectar al servidor.');
    if (!res.ok) return regError('reg0-error', res.datos.error || 'No encontramos ese equipo.');
    Object.assign(_registro, { codigo, equipo: res.datos.equipo });
    // El deporte del equipo queda elegido (se puede cambiar)
    if (res.datos.equipo.deporte) {
        document.getElementById('reg-deporte').value = res.datos.equipo.deporte;
        updateSportSpecificFields();
    }
    irAlPaso1();
}

function confirmarCrearEquipo() {
    const nombre = document.getElementById('reg-equipo-nombre').value.trim();
    if (nombre.length < 2) return regError('reg0-error', 'Escribe el nombre de tu equipo.');
    Object.assign(_registro, { equipoNombre: nombre, equipoDeporte: document.getElementById('reg-equipo-deporte').value });
    irAlPaso1();
}

/** Paso 1 según el modo: el entrenador solo pone nombre, correo y contraseña. */
function irAlPaso1() {
    const crear = _registro.modo === 'crear';
    const aviso = document.getElementById('reg-modo-aviso');
    const texto = _registro.modo === 'unirse' && _registro.equipo ? `🤝 Te unirás a <strong>${escapeHtml(_registro.equipo.nombre)}</strong>.`
        : crear ? `📋 Crearás el equipo <strong>${escapeHtml(_registro.equipoNombre)}</strong> como entrenador.` : '';
    aviso.innerHTML = texto;
    aviso.classList.toggle('hidden', !texto);
    document.getElementById('reg-cuerpo').classList.toggle('hidden', crear);
    document.getElementById('reg-fecha-grupo').classList.toggle('hidden', crear);
    document.getElementById('reg1-boton').textContent = crear ? 'Crear mi equipo' : 'Continuar';
    regError('reg1-error', '');
    showAuthScreen('screen-register-1');
}

// Fecha de nacimiento: entre 5 y 100 años (lo mismo que comprueba el servidor)
const EDAD_MINIMA = 5;
function fechaConAnios(anios) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - anios);
    return d.toISOString().slice(0, 10);
}
function problemaFecha(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return 'Escribe tu fecha de nacimiento.';
    const d = new Date(`${fecha}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fecha) return 'Esa fecha de nacimiento no existe.';
    if (fecha > new Date().toISOString().slice(0, 10)) return 'La fecha de nacimiento no puede ser futura.';
    if (fecha > fechaConAnios(EDAD_MINIMA)) return `Debes tener al menos ${EDAD_MINIMA} años.`;
    if (fecha < fechaConAnios(100)) return 'Revisa el año de tu fecha de nacimiento.';
    return null;
}

function goToStep2() {
    const nombre=document.getElementById('reg-nombre').value.trim(), email=document.getElementById('reg-email').value.trim(),
          password=document.getElementById('reg-password').value, peso=document.getElementById('reg-peso').value,
          altura=document.getElementById('reg-altura').value, fecha=document.getElementById('reg-fecha').value;
    const crear = _registro.modo === 'crear';
    if(!nombre||!email||(!_googleCredencial&&!password)||(!crear&&(!peso||!altura||!fecha))) return regError('reg1-error','Completa todos los campos obligatorios.');
    if(!_googleCredencial&&password.length<8) return regError('reg1-error','La contraseña debe tener al menos 8 caracteres.');
    if(!crear){
        const problema = problemaFecha(fecha);
        if(problema) return regError('reg1-error', problema);
    }
    regError('reg1-error', '');
    if (crear) return enSegundoPlano(enviarRegistro('reg1-error'));
    showAuthScreen('screen-register-2');
}

function doRegistro() {
    const v = id => document.getElementById(id).value;
    const deporte = v('reg-deporte');
    const faltaEstilo = deporte === 'Boxeo' && !v('reg-estilo');
    if(!deporte||!v('reg-posicion')||!v('reg-frecuencia')||!v('reg-pie')||!v('reg-objetivo')||!v('reg-sexo')||faltaEstilo)
        return regError('reg2-error','Completa todos los campos del perfil deportivo.');
    regError('reg2-error', '');
    enSegundoPlano(enviarRegistro('reg2-error'));
}

async function enviarRegistro(errorId) {
    const v = id => document.getElementById(id)?.value ?? '';
    const deporte = v('reg-deporte');
    const datos = {
        nombre: v('reg-nombre').trim(), email: v('reg-email').trim(), modo: _registro.modo,
        ...(_registro.modo === 'crear'
            ? { equipoNombre: _registro.equipoNombre, equipoDeporte: _registro.equipoDeporte }
            : { peso: v('reg-peso'), altura: v('reg-altura'), fechaNacimiento: v('reg-fecha'), deporte, posicion: v('reg-posicion'),
                frecuencia: v('reg-frecuencia'), pie: v('reg-pie'), objetivo: v('reg-objetivo'), sexo: v('reg-sexo'),
                diaPartido: SIN_COMPETICION.includes(deporte) ? undefined : v('reg-partido') || undefined,
                estilo: deporte === 'Boxeo' ? v('reg-estilo') : undefined,
                codigoEquipo: _registro.modo === 'unirse' ? _registro.codigo : undefined }),
        ...(_googleCredencial ? { googleCredencial: _googleCredencial } : { password: v('reg-password') }),
    };
    document.getElementById('reg-loading').classList.remove('hidden');
    try {
        const res=await fetch(`${API}/auth/registro`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(datos)});
        const data=await res.json();
        document.getElementById('reg-loading').classList.add('hidden');
        if(!res.ok) return regError(errorId, data.error||'Error al crear la cuenta');
        if(data.token){_googleCredencial=null;routeUser(data.user,data.token);return;} // con Google entra directamente
        const exito = document.getElementById('reg-exito-equipo');
        exito.innerHTML = data.equipo?.codigo
            ? `📋 Tu equipo <strong>${escapeHtml(data.equipo.nombre)}</strong> está listo.<br>Código para tus atletas: <strong class="reg-codigo-grande">${escapeHtml(data.equipo.codigo)}</strong><br><small>Compártelo: al registrarse eligen "Me uno a mi equipo" y lo escriben. También lo verás en tu panel.</small>`
            : data.equipo ? `🤝 Ya eres parte de <strong>${escapeHtml(data.equipo.nombre)}</strong>.` : '';
        exito.classList.toggle('hidden', !data.equipo);
        showAuthScreen('screen-success');
    } catch{document.getElementById('reg-loading').classList.add('hidden');regError(errorId,'No se pudo conectar al servidor.');}
}

// Límites de la fecha de nacimiento en el calendario
document.addEventListener('DOMContentLoaded', () => {
    const fecha = document.getElementById('reg-fecha');
    if (fecha) { fecha.max = fechaConAnios(EDAD_MINIMA); fecha.min = fechaConAnios(100); }
    updateSportSpecificFields(); // estilo de boxeo y día de competición con su nombre
});

function doLogout() {
    if(!confirm('¿Cerrar sesión?')) return;
    stopPolling();
    stopBadgePolling();
    _fotoCache.clear();
    clearSession(); currentUser=null;
    Object.values(chartInstances).forEach(c=>c.destroy()); chartInstances={};
    showAuthPanel();
}

// ────────────────────────────────────────────────
// RECUPERAR CONTRASEÑA
// ────────────────────────────────────────────────
let _tokenRestablecer = null;

function mostrarErrorAuth(id, texto) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.classList.toggle('hidden', !texto);
}

function abrirOlvide() {
    document.getElementById('olvide-email').value = document.getElementById('login-email').value.trim();
    mostrarErrorAuth('olvide-error', '');
    document.getElementById('olvide-ok').classList.add('hidden');
    document.getElementById('olvide-form').classList.remove('hidden');
    showAuthScreen('screen-olvide');
    document.getElementById('olvide-email').focus();
}

async function pedirEnlace() {
    const email = document.getElementById('olvide-email').value.trim();
    if (!/^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) return mostrarErrorAuth('olvide-error', 'Escribe un correo válido.');
    mostrarErrorAuth('olvide-error', '');
    const btn = document.getElementById('olvide-btn');
    btn.disabled = true;
    const res = await fetch(`${API}/auth/olvide`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email }) })
        .then(async r => ({ status: r.status, datos: await r.json().catch(() => ({})) })).catch(() => null);
    btn.disabled = false;
    if (!res || res.status >= 400) return mostrarErrorAuth('olvide-error', res?.datos?.error || 'No se pudo enviar. Revisa tu conexión.');
    const ok = document.getElementById('olvide-ok');
    ok.innerHTML = `✉️ ${escapeHtml(res.datos.mensaje)}<br><small>Revisa también la carpeta de spam. El enlace caduca en 60 minutos.</small>`;
    ok.classList.remove('hidden');
    document.getElementById('olvide-form').classList.add('hidden');
}

/** Si la página se abre desde el enlace del correo (?restablecer=...), muestra el formulario. */
function revisarEnlaceRestablecer() {
    const token = new URLSearchParams(location.search).get('restablecer');
    if (!token) return false;
    _tokenRestablecer = token;
    clearSession();
    hideAllPanels();
    document.getElementById('auth-screen').classList.remove('hidden');
    showAuthScreen('screen-restablecer');
    return true;
}

function salirDeRestablecer() {
    _tokenRestablecer = null;
    history.replaceState(null, '', location.pathname); // quita el enlace de la barra de direcciones
    showAuthScreen('screen-login');
}

async function guardarNuevaPassword() {
    const pass = document.getElementById('restablecer-pass').value;
    const pass2 = document.getElementById('restablecer-pass2').value;
    if (pass.length < 8) return mostrarErrorAuth('restablecer-error', 'La contraseña debe tener al menos 8 caracteres.');
    if (pass !== pass2) return mostrarErrorAuth('restablecer-error', 'Las contraseñas no coinciden.');
    mostrarErrorAuth('restablecer-error', '');
    const btn = document.getElementById('restablecer-btn');
    btn.disabled = true;
    const res = await fetch(`${API}/auth/restablecer`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ token: _tokenRestablecer, password: pass }) })
        .then(async r => ({ status: r.status, datos: await r.json().catch(() => ({})) })).catch(() => null);
    btn.disabled = false;
    if (!res || res.status >= 400) return mostrarErrorAuth('restablecer-error', res?.datos?.error || 'No se pudo guardar. Revisa tu conexión.');
    salirDeRestablecer();
    showToast('Contraseña cambiada. Ya puedes iniciar sesión.', 'success', 5000);
}

// ────────────────────────────────────────────────
// PORTADA ANIMADA (login y registro)
// ────────────────────────────────────────────────
const MENOS_MOVIMIENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function portadaVisible() {
    const el = document.getElementById('auth-screen');
    return el && !el.classList.contains('hidden') && !document.hidden;
}

// Palabra que va cambiando en el subtítulo
(function rotarDeporte() {
    const deportes = ['fútbol', 'baloncesto', 'tenis', 'béisbol', 'atletismo', 'running', 'natación', 'boxeo', 'el gimnasio', 'estar en forma'];
    let i = 0;
    setInterval(() => {
        const el = document.getElementById('auth-deporte');
        if (!el || !portadaVisible() || MENOS_MOVIMIENTO) return;
        i = (i + 1) % deportes.length;
        const nuevo = el.cloneNode(); // se reemplaza el nodo para que la animación de entrada se repita
        nuevo.textContent = deportes[i];
        el.replaceWith(nuevo);
    }, 2200);
})();

// La tarjeta se inclina levemente siguiendo el ratón
document.addEventListener('pointermove', e => {
    if (MENOS_MOVIMIENTO || !portadaVisible() || e.pointerType !== 'mouse') return;
    const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
    document.querySelectorAll('#auth-screen .auth-container').forEach(c => {
        c.style.setProperty('--inclina-y', `${(x * 6).toFixed(2)}deg`);
        c.style.setProperty('--inclina-x', `${(-y * 6).toFixed(2)}deg`);
    });
});

// Chispas de luz que suben desde la cuadrícula
(function chispas() {
    const canvas = document.getElementById('auth-chispas');
    if (!canvas || MENOS_MOVIMIENTO) return;
    const ctx = canvas.getContext('2d');
    let ancho = 0, alto = 0, particulas = [];
    const nueva = () => ({
        // NOSONAR: posiciones de una animación decorativa, no se usa para nada de seguridad
        x: Math.random() * ancho, y: alto + Math.random() * alto * 0.3, // NOSONAR
        r: Math.random() * 1.8 + 0.4, v: Math.random() * 0.6 + 0.25, // NOSONAR
        deriva: (Math.random() - 0.5) * 0.3, tono: Math.random() < 0.7 ? '74,222,128' : '34,211,238' // NOSONAR
    });
    function medir() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ancho = canvas.clientWidth; alto = canvas.clientHeight;
        canvas.width = ancho * dpr; canvas.height = alto * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cantidad = Math.round(Math.min(90, ancho / 16));
        particulas = Array.from({ length: cantidad }, () => ({ ...nueva(), y: Math.random() * alto })); // NOSONAR (animación)
    }
    function cuadro() {
        requestAnimationFrame(cuadro);
        if (!portadaVisible()) return; // no gasta batería con la app abierta
        if (canvas.clientWidth !== ancho || canvas.clientHeight !== alto) medir();
        ctx.clearRect(0, 0, ancho, alto);
        for (const p of particulas) {
            p.y -= p.v; p.x += p.deriva;
            if (p.y < -10) Object.assign(p, nueva());
            const brillo = Math.min(1, p.y / alto + 0.15);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.tono},${(0.85 * brillo).toFixed(2)})`;
            ctx.shadowColor = `rgba(${p.tono},0.9)`;
            ctx.shadowBlur = 8;
            ctx.fill();
        }
    }
    medir();
    cuadro();
})();
