/* =============================================
   VitalTraining — musica.js
   Música de fondo con un reproductor flotante: activar/silenciar, volumen y minimizar.
   Los navegadores no dejan sonar audio hasta que la persona toca la página: si el
   intento al entrar se bloquea, la música empieza con el primer toque o clic.
============================================= */

const MUSICA_NIVELES = 5;
const MUSICA_VOLUMEN_MAX = 0.6; // nivel 5 = 60 % del volumen del dispositivo: de fondo, no a todo volumen

// Preferencias de esta persona en este navegador (si no se pueden guardar, se usan las de siempre)
function musicaLeer(clave, porDefecto) {
    try { const v = localStorage.getItem(`vt_musica_${clave}`); return v === null ? porDefecto : JSON.parse(v); }
    catch { return porDefecto; }
}
function musicaGuardar(clave, valor) {
    try { localStorage.setItem(`vt_musica_${clave}`, JSON.stringify(valor)); } catch { /* sin almacenamiento: no pasa nada */ }
}

const _musica = {
    quiere: musicaLeer('activa', true),        // la persona quiere música (no la silenció)
    nivel: musicaLeer('nivel', 3),
    plegado: musicaLeer('plegado', window.matchMedia('(max-width: 640px)').matches),
};

function musicaAudio() { return document.getElementById('musica-audio'); }

function musicaPintar() {
    const audio = musicaAudio();
    const suena = audio && !audio.paused && _musica.nivel > 0;
    const boton = document.getElementById('musica-boton');
    boton.classList.toggle('musica-sonando', suena);
    boton.setAttribute('aria-pressed', String(suena));
    boton.setAttribute('aria-label', suena ? 'Silenciar música' : 'Activar música');
    boton.innerHTML = suena
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
    document.querySelectorAll('#musica-barras span').forEach((b, i) => b.classList.toggle('activa', i < _musica.nivel));
    const caja = document.getElementById('musica');
    caja.classList.toggle('musica-plegada', _musica.plegado);
    const plegar = document.getElementById('musica-plegar');
    plegar.setAttribute('aria-expanded', String(!_musica.plegado));
    plegar.setAttribute('aria-label', _musica.plegado ? 'Mostrar controles de la música' : 'Minimizar reproductor');
}

async function musicaTocar() {
    const audio = musicaAudio();
    audio.volume = (_musica.nivel / MUSICA_NIVELES) * MUSICA_VOLUMEN_MAX;
    try { await audio.play(); } catch { /* bloqueado hasta que la persona toque la página */ }
    musicaPintar();
}

function musicaAlternar() {
    const audio = musicaAudio();
    if (!audio.paused && _musica.nivel > 0) {
        audio.pause();
        _musica.quiere = false;
    } else {
        _musica.quiere = true;
        if (_musica.nivel === 0) _musica.nivel = 3;
        musicaGuardar('nivel', _musica.nivel);
        enSegundoPlano(musicaTocar());
    }
    musicaGuardar('activa', _musica.quiere);
    musicaPintar();
}

function musicaVolumen(paso) {
    _musica.nivel = Math.max(0, Math.min(MUSICA_NIVELES, _musica.nivel + paso));
    musicaGuardar('nivel', _musica.nivel);
    const audio = musicaAudio();
    audio.volume = (_musica.nivel / MUSICA_NIVELES) * MUSICA_VOLUMEN_MAX;
    if (_musica.nivel === 0) audio.pause();
    else if (paso > 0 && audio.paused) { _musica.quiere = true; musicaGuardar('activa', true); enSegundoPlano(musicaTocar()); }
    musicaPintar();
}

function musicaPlegar() {
    _musica.plegado = !_musica.plegado;
    musicaGuardar('plegado', _musica.plegado);
    musicaPintar();
}

// Al entrar: intenta sonar; si el navegador lo bloquea, empieza con el primer toque en la página
document.addEventListener('DOMContentLoaded', () => {
    musicaPintar();
    if (!_musica.quiere || _musica.nivel === 0) return;
    enSegundoPlano(musicaTocar());
    const alPrimerToque = e => {
        if (e.target.closest?.('#musica')) return; // los botones del reproductor ya hacen lo suyo
        if (_musica.quiere && musicaAudio().paused) enSegundoPlano(musicaTocar());
    };
    document.addEventListener('pointerdown', alPrimerToque, { once: true, capture: true });
    document.addEventListener('keydown', alPrimerToque, { once: true, capture: true });
});
