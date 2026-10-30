/**
 * Escáner de código de barras para registrar comidas.
 * - Lee con la cámara: con el lector del propio navegador (BarcodeDetector, Chrome en Android)
 *   o, si no existe (iPhone, Firefox), con ZXing, que se descarga solo la primera vez.
 * - También se puede escribir el número a mano.
 * - Busca el producto en el servidor (nuestra base y Open Food Facts) y rellena el formulario
 *   de la comida con las calorías y la proteína de la cantidad que se comió.
 */

const ESCANER_ZXING = {
    src: 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js',
    integrity: 'sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB',
};
const ESCANER_FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
const escaner = { activo: false, flujo: null, lector: null, vigia: null, producto: null };

function escanerAbrir() {
    openModal('📷 Escanear producto', `
        <div class="escaner-video" id="esc-caja">
            <video id="esc-video" playsinline muted autoplay></video>
            <div class="escaner-marco"></div>
        </div>
        <p class="reloj-nota" id="esc-estado">Apunta la cámara al código de barras del empaque.</p>
        <div class="escaner-manual">
            <input type="text" id="esc-codigo" inputmode="numeric" maxlength="14" placeholder="O escribe el número del código"
                   onkeydown="if(event.key==='Enter')escanerBuscar(this.value)">
            <button class="btn btn-ghost" onclick="escanerBuscar(document.getElementById('esc-codigo').value)">Buscar</button>
        </div>
        <div id="esc-resultado"></div>`);
    enSegundoPlano(escanerIniciarCamara());
}

function escanerEstado(texto) {
    const el = document.getElementById('esc-estado');
    if (el) el.textContent = texto;
}

function escanerCargarZXing() {
    if (window.ZXing) return Promise.resolve();
    return new Promise((ok, falla) => {
        const s = document.createElement('script');
        Object.assign(s, { src: ESCANER_ZXING.src, integrity: ESCANER_ZXING.integrity, crossOrigin: 'anonymous', onload: ok, onerror: falla });
        document.head.appendChild(s);
    });
}

async function escanerIniciarCamara() {
    const video = document.getElementById('esc-video');
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
        document.getElementById('esc-caja')?.remove();
        return escanerEstado('Este navegador no permite usar la cámara: escribe el número del código.');
    }
    escaner.activo = true;
    // Si se cierra la ventana, se apaga la cámara
    escaner.vigia = setInterval(() => { if (!document.getElementById('esc-video')) escanerDetener(); }, 800);
    try {
        const nativo = 'BarcodeDetector' in window
            && (await BarcodeDetector.getSupportedFormats()).some(f => ESCANER_FORMATOS.includes(f));
        if (nativo) {
            escaner.flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
            video.srcObject = escaner.flujo;
            await video.play();
            const detector = new BarcodeDetector({ formats: ESCANER_FORMATOS });
            const buscar = async () => {
                if (!escaner.flujo) return;
                try {
                    const [codigo] = await detector.detect(video);
                    if (codigo?.rawValue) return escanerLeido(codigo.rawValue);
                } catch { /* fotograma sin imagen todavía */ }
                setTimeout(buscar, 250);
            };
            void buscar();
        } else {
            escanerEstado('Preparando el lector…');
            await escanerCargarZXing();
            const pistas = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS,
                [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]]]);
            escaner.lector = new ZXing.BrowserMultiFormatReader(pistas, 250);
            if (!escaner.activo) return escanerDetener();
            await escaner.lector.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video, resultado => {
                if (resultado) escanerLeido(resultado.getText());
            });
        }
        escanerEstado('Apunta la cámara al código de barras del empaque.');
    } catch (err) {
        escanerDetener();
        document.getElementById('esc-caja')?.remove();
        escanerEstado(err?.name === 'NotAllowedError'
            ? 'No diste permiso a la cámara: escribe el número del código (o actívala en los ajustes del navegador).'
            : 'No se pudo abrir la cámara: escribe el número del código.');
    }
}

function escanerDetener() {
    clearInterval(escaner.vigia);
    escaner.flujo?.getTracks().forEach(t => t.stop());
    try { escaner.lector?.reset(); } catch { /* ya estaba detenido */ }
    Object.assign(escaner, { activo: false, flujo: null, lector: null, vigia: null });
}

function escanerLeido(codigo) {
    if (!escaner.activo) return; // el lector puede avisar dos veces del mismo código
    escanerDetener();
    navigator.vibrate?.(80);
    document.getElementById('esc-caja')?.remove();
    const campo = document.getElementById('esc-codigo');
    if (campo) campo.value = codigo;
    void escanerBuscar(codigo);
}

async function escanerBuscar(valor) {
    const codigo = String(valor || '').replace(/\D/g, '');
    const caja = document.getElementById('esc-resultado');
    if (!caja) return;
    if (codigo.length < 8) { caja.innerHTML = '<div class="auth-error">Escribe el número completo (8 a 14 dígitos).</div>'; return; }
    escanerDetener();
    document.getElementById('esc-caja')?.remove();
    caja.innerHTML = '<p class="reloj-nota">Buscando el producto…</p>';
    const res = await apiFetch(`${API}/alimentos/codigo/${codigo}`).then(r => r.json()).catch(() => null);
    if (!res?.ok) {
        caja.innerHTML = `<div class="auth-error">${escapeHtml(res?.error || 'No se pudo buscar el producto.')}</div>`;
        if (res?.error && !/válido/.test(res.error)) caja.innerHTML += escanerFormularioManual(codigo);
        return;
    }
    if (!res.encontrado) {
        caja.innerHTML = `<p>No encontramos este producto. Escribe los datos de la etiqueta <strong>una sola vez</strong> y quedará guardado para todo el club.</p>${escanerFormularioManual(codigo)}`;
        return;
    }
    escanerMostrarProducto(res.producto);
}

function escanerFormularioManual(codigo) {
    const campo = (id, lbl, extra = '') => `<div class="form-group" style="margin:0"><label for="${id}">${lbl}</label><input type="number" id="${id}" min="0" step="0.1" ${extra}></div>`;
    return `
        <div class="escaner-form">
            <div class="form-row">
                <div class="form-group" style="margin:0"><label for="esc-m-nombre">Producto *</label><input type="text" id="esc-m-nombre" maxlength="160" placeholder="Ej: Avena en hojuelas"></div>
                <div class="form-group" style="margin:0"><label for="esc-m-marca">Marca</label><input type="text" id="esc-m-marca" maxlength="120"></div>
            </div>
            <p class="reloj-nota">Valores <strong>por 100 g</strong> (o 100 ml), como en la tabla nutricional:</p>
            <div class="form-row">
                ${campo('esc-m-kcal', 'Calorías *')}${campo('esc-m-prot', 'Proteína (g)')}
                ${campo('esc-m-carb', 'Carbohidratos (g)')}${campo('esc-m-grasa', 'Grasa (g)')}
            </div>
            <div class="form-row">${campo('esc-m-porcion', 'Porción del empaque (g)')}</div>
            <div id="esc-m-error" class="auth-error hidden"></div>
            <button class="btn btn-primary" onclick="escanerGuardarManual('${codigo}')">Guardar producto</button>
        </div>`;
}

async function escanerGuardarManual(codigo) {
    const v = id => document.getElementById(id)?.value ?? '';
    const datos = {
        nombre: v('esc-m-nombre'), marca: v('esc-m-marca'), kcal100: v('esc-m-kcal'),
        proteina100: v('esc-m-prot'), carbohidratos100: v('esc-m-carb'), grasa100: v('esc-m-grasa'), porcionG: v('esc-m-porcion'),
    };
    const res = await apiFetch(`${API}/alimentos/codigo/${codigo}`, { method: 'POST', body: JSON.stringify(datos) })
        .then(r => r.json()).catch(() => null);
    if (!res?.ok) {
        const err = document.getElementById('esc-m-error');
        if (err) { err.textContent = res?.error || 'No se pudo guardar.'; err.classList.remove('hidden'); }
        return;
    }
    showToast('Producto guardado para todo el club ✓');
    escanerMostrarProducto(res.producto);
}

/** Lo que aporta comer `gramos` (igual que el servidor: los valores van por 100 g). */
function escanerPorcion(p, gramos) {
    const g = Number(gramos) || 0;
    const por = v => (v == null ? null : Math.round((v * g) / 10) / 10);
    return { calorias: Math.round((p.kcal100 * g) / 100), proteina: por(p.proteina100), carbohidratos: por(p.carbohidratos100), grasa: por(p.grasa100) };
}

function escanerMostrarProducto(p) {
    escaner.producto = p;
    const caja = document.getElementById('esc-resultado');
    if (!caja) return;
    const g = p.porcionG || 100;
    caja.innerHTML = `
        <div class="escaner-producto">
            <div class="escaner-producto-nombre">${escapeHtml(p.nombre)}${p.marca ? ` <span>${escapeHtml(p.marca)}</span>` : ''}</div>
            <div class="reloj-nota">Por 100 g: ${p.kcal100} kcal${p.proteina100 != null ? ` · ${p.proteina100} g proteína` : ''}${p.carbohidratos100 != null ? ` · ${p.carbohidratos100} g carbohidratos` : ''}${p.grasa100 != null ? ` · ${p.grasa100} g grasa` : ''}</div>
            <div class="escaner-cantidad form-group">
                <label for="esc-gramos">¿Cuánto comiste? (g o ml)</label>
                <input type="number" id="esc-gramos" min="1" max="5000" value="${g}" oninput="escanerActualizar()">
                ${p.porcionG ? `<button class="btn btn-ghost btn-sm" onclick="document.getElementById('esc-gramos').value=${p.porcionG};escanerActualizar()">1 porción (${p.porcionG} g)</button>` : ''}
            </div>
            <div class="escaner-total" id="esc-total"></div>
            <button class="btn btn-primary" onclick="escanerUsar()">Usar en mi comida</button>
            <p class="escaner-fuente">${p.fuente === 'club' ? 'Datos escritos por tu club.' : 'Datos de <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (licencia ODbL).'}</p>
        </div>`;
    escanerActualizar();
}

function escanerActualizar() {
    const p = escaner.producto, el = document.getElementById('esc-total');
    if (!p || !el) return;
    const r = escanerPorcion(p, document.getElementById('esc-gramos').value);
    el.innerHTML = `<strong>${r.calorias} kcal</strong>${r.proteina != null ? ` · ${r.proteina} g proteína` : ''}${r.carbohidratos != null ? ` · ${r.carbohidratos} g carbohidratos` : ''}${r.grasa != null ? ` · ${r.grasa} g grasa` : ''}`;
}

function escanerUsar() {
    const p = escaner.producto;
    const gramos = Number(document.getElementById('esc-gramos')?.value) || 0;
    if (!p || gramos <= 0) return showToast('Escribe cuánto comiste.', 'error');
    const r = escanerPorcion(p, gramos);
    const poner = (id, valor) => { const el = document.getElementById(id); if (el) el.value = valor ?? ''; };
    poner('hst-nombre', `${p.nombre}${p.marca ? ` (${p.marca})` : ''}`.slice(0, 250));
    poner('hst-kcal', r.calorias);
    poner('hst-proteina', r.proteina);
    poner('hst-notas', `${gramos} g · código ${p.codigo}`);
    closeModal();
    showToast('Datos listos: elige el tipo de comida y pulsa Registrar ✓');
    document.getElementById('hst-tipo')?.focus();
}
