// app.js - VERSIÓN FINAL RESTAURADA (v201) + escala 0–400 L
const API_URL = 'https://ngsoluciones.com/pecom/1/api.php/tanques';

// 🔹 Capacidad fija de referencia
const CAP_MAX_LITROS = 400;

let DB = [];
let mapFleet, mapDetail;
let fleetMarkers;
let detailMarker = null;
let chartLevelInst = null, chartPumpInst = null;
let filterState = 'all';
let selectedId = null;
let pumpOn = true;

// 1. CARGA DE DATOS
async function loadFleetData() {
    console.log("📡 Conectando...");
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Error API");
        const data = await res.json();
        
        if (Array.isArray(data)) DB = data;
        else if (data.tanques) DB = data.tanques;
        else DB = [];

        renderFleet();
        updateKPIs();
        console.log("✅ Datos cargados:", DB.length);
    } catch (e) {
        console.error("❌ ERROR CRÍTICO DE CONEXIÓN:", e);
        const el = document.getElementById('listCount');
        if (el) el.innerText = "OFFLINE";
    }
}

// 2. RENDERIZADO VISUAL
function getStatusColor(pct) {
    if (pct < 30) return '#ef4444'; 
    if (pct < 50) return '#f59e0b'; 
    return '#10b981'; 
}

function createIcon(color) {
    if (typeof L === 'undefined') return null;
    const html = `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`;
    return L.divIcon({className:'', html:html, iconSize:[18,18], iconAnchor:[9,9]});
}

function renderFleet() {
    const list = document.getElementById('fleetList');
    if (!list) return;
    list.innerHTML = '';
    if (fleetMarkers) fleetMarkers.clearLayers();

    const searchEl = document.getElementById('searchInput');
    const zoneEl = document.getElementById('zoneFilter');
    const search = searchEl ? searchEl.value.toLowerCase() : '';
    const zoneF = zoneEl ? zoneEl.value : 'all';
    let count = 0;

    DB.forEach(p => {
        const litros = p.litros ?? 0;
        // 🔹 Pct respecto a 0–400 L
        let pct = CAP_MAX_LITROS > 0 ? (litros / CAP_MAX_LITROS) * 100 : 0;
        pct = Math.max(0, Math.min(100, Math.round(pct)));

        const inEstado =
            (filterState === 'all') ||
            (filterState === 'danger' && pct < 30) ||
            (filterState === 'warn' && pct >= 30 && pct < 50) ||
            (filterState === 'ok' && pct >= 50);
        
        const idStr = (p.id ?? '').toString().toLowerCase();
        const zona = p.zona ?? '';
        const matches = idStr.includes(search) && (zoneF === 'all' || zona === zoneF);

        if (inEstado && matches) {
            count++;
            const color = getStatusColor(pct);
            
            if (mapFleet && typeof L !== 'undefined') {
                const m = L.marker([p.lat, p.lng], {icon: createIcon(color)});
                m.on('click', () => irADetalle(p.id));
                fleetMarkers.addLayer(m);
            }

            const d = document.createElement('div');
            d.className = `tank-item`;
            d.style.borderLeft = `4px solid ${color}`;
            d.onclick = () => irADetalle(p.id);
            d.innerHTML = `
                <div class="tank-main">
                    <div class="tank-id">${p.id}</div>
                    <div class="tank-zone">${zona}</div>
                </div>
                <div class="tank-right">
                    <span class="pct-chip" style="background:${color}20; color:${color}">${pct}%</span>
                    <span class="tank-litros">${litros} L</span>
                </div>
            `;
            list.appendChild(d);
        }
    });

    const countEl = document.getElementById('listCount');
    if (countEl) countEl.innerText = `${count} Unidades`;
}

function updateKPIs() {
    let ok = 0, warn = 0, danger = 0;

    DB.forEach(p => {
        const litros = p.litros ?? 0;
        const pct = CAP_MAX_LITROS > 0 ? (litros / CAP_MAX_LITROS) : 0; // 0–1

        if (pct < 0.3) danger++;
        else if (pct < 0.5) warn++;
        else ok++;
    });

    const allEl   = document.getElementById('count-all');
    const okEl    = document.getElementById('count-ok');
    const warnEl  = document.getElementById('count-warn');
    const dangEl  = document.getElementById('count-danger');

    if (allEl)  allEl.innerText  = DB.length;
    if (okEl)   okEl.innerText   = ok;
    if (warnEl) warnEl.innerText = warn;
    if (dangEl) dangEl.innerText = danger;
}

// 3. DETALLE Y SIMULACIÓN DE DATOS HISTÓRICOS
function renderTelemetry(maxL) {
    const tbody = document.getElementById('tableTelemetry');
    const CAP = CAP_MAX_LITROS; // 🔹 usaremos siempre 0–400 L como referencia

    // Datos para el gráfico de barras (Consumo mensual)
    const consumoMensual = Array.from(
        { length: 6 },
        () => Math.floor(Math.random() * (CAP * 0.3)) + 20
    );

    if (tbody) {
        tbody.innerHTML = '';
        let simLevel = 0.8 * CAP; // Nivel inicial simulado
        let now = new Date();

        for (let i = 0; i < 15; i++) {
            let time = new Date(now.getTime() - (i * 30 * 60000));
            let hora = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0');
            
            simLevel += (Math.random() * 6 - 3);
            simLevel = Math.max(0, Math.min(CAP, simLevel)); // 🔹 clamp 0–400
            
            const row = `<tr>
                <td>${hora}</td>
                <td style="font-weight:bold">${Math.round(simLevel)} L</td>
                <td>12.${Math.floor(Math.random()*5)} V</td>
                <td><span class="badge bg-blue">OK</span></td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        }
    }
    return consumoMensual;
}

function renderCharts(currentLevel, consumoMensual) {
    if (typeof Chart === 'undefined') return; 

    if (chartLevelInst) { chartLevelInst.destroy(); chartLevelInst = null; }
    if (chartPumpInst)  { chartPumpInst.destroy();  chartPumpInst  = null; }

    // 🔹 Clamp del nivel actual a 0–400 L
    let nivelActual = Math.max(0, Math.min(CAP_MAX_LITROS, currentLevel ?? 0));

    // Generar curva histórica para el gráfico de línea
    const historyData = [];
    let tempLevel = nivelActual;
    for (let i = 0; i < 6; i++) {
        historyData.unshift(Math.round(tempLevel));
        tempLevel += (Math.random() * 60 - 30);
        tempLevel = Math.max(0, Math.min(CAP_MAX_LITROS, tempLevel)); // clamp 0–400
    }

    // 1. Gráfico de Nivel (Línea)
    const ctxLevel = document.getElementById('chartLevel');
    if (ctxLevel) {
        chartLevelInst = new Chart(ctxLevel, {
            type: 'line',
            data: {
                labels: ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'],
                datasets: [{
                    data: historyData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: true, grid: { display: false } }, 
                    y: { 
                        display: true,
                        min: 0,              // 🔹 desde 0
                        max: CAP_MAX_LITROS, // 🔹 hasta 400 L
                        title: { display: true, text: 'Nivel (L)', font: { size: 10 } },
                        grid: { color: '#f3f4f6' }
                    }
                }
            }
        });
    }

    // 2. Gráfico de Bomba (Barras)
    const ctxPump = document.getElementById('chartPump');
    if (ctxPump) {
        chartPumpInst = new Chart(ctxPump, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    data: consumoMensual,
                    backgroundColor: '#9ca3af',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: true, grid: { display: false } }, 
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' }
                    }
                }
            }
        });
        
        const total = consumoMensual.reduce((a,b)=>a+b,0);
        const totalEl = document.getElementById('totalEntregado');
        if (totalEl) totalEl.innerText = `${total} L (6 meses)`;
    }
}

function irADetalle(id) {
    const p = DB.find(x => x.id === id);
    if (!p) return;
    selectedId = id;

    const litros = p.litros ?? 0;

    // Llenar info
    const detId   = document.getElementById('det-id');
    const detZona = document.getElementById('det-zona');
    const detProd = document.getElementById('det-prod');
    const detSens = document.getElementById('det-sensor');
    const detCap  = document.getElementById('det-cap');

    if (detId)   detId.innerText   = p.id;
    if (detZona) detZona.innerText = p.zona ?? '-';
    if (detProd) detProd.innerText = p.prod ?? '-';
    if (detSens) detSens.innerText = p.sensor ?? '-';
    if (detCap)  detCap.innerText  = `${CAP_MAX_LITROS} L`;

    // Nivel
    let pct = CAP_MAX_LITROS > 0 ? (litros / CAP_MAX_LITROS) * 100 : 0;
    pct = Math.max(0, Math.min(100, Math.round(pct)));

    const detLit = document.getElementById('det-litros');
    const detPct = document.getElementById('det-pct');
    const tankLq = document.getElementById('tankLiquid');

    if (detLit) detLit.innerText = `${litros} L`;
    if (detPct) detPct.innerText = `${pct}%`;
    if (tankLq) {
        tankLq.style.height = pct + "%";
        tankLq.style.background = getStatusColor(pct);
    }

    const consumo = renderTelemetry(CAP_MAX_LITROS);
    setTimeout(() => renderCharts(litros, consumo), 100);

    // Mapa
    if (mapDetail && typeof L !== 'undefined') {
        if (detailMarker) mapDetail.removeLayer(detailMarker);
        detailMarker = L.marker([p.lat, p.lng], {icon: createIcon(getStatusColor(pct))}).addTo(mapDetail);
        mapDetail.setView([p.lat, p.lng], 13);
        setTimeout(() => mapDetail.invalidateSize(), 200);
    }

    // Cambiar vista
    const viewFleet  = document.getElementById('view-fleet');
    const viewDetail = document.getElementById('view-detail');
    if (viewFleet && viewDetail) {
        viewFleet.classList.add('hidden');
        viewDetail.classList.remove('hidden');
    }
}

function irAFlota() {
    const viewFleet  = document.getElementById('view-fleet');
    const viewDetail = document.getElementById('view-detail');
    if (viewFleet && viewDetail) {
        viewDetail.classList.add('hidden');
        viewFleet.classList.remove('hidden');
    }
    selectedId = null;
    if (mapFleet) setTimeout(() => mapFleet.invalidateSize(), 200);
}

// 4. FUNCIONES OPERATIVAS
function updatePumpUI() {
    const btn = document.getElementById('btnPumpToggle');
    const txt = document.getElementById('pumpStatus');
    if (!btn || !txt) return;
    if (pumpOn) {
        btn.innerText = "⏻ APAGAR BOMBA";
        btn.className = "btn btn-danger-soft";
        txt.innerHTML = '● BOMBA ACTIVA';
        txt.style.color = '#10b981';
    } else {
        btn.innerText = "⏻ ENCENDER BOMBA";
        btn.className = "btn btn-primary";
        txt.innerHTML = '○ BOMBA DETENIDA';
        txt.style.color = '#ccc';
    }
}
function togglePump() { pumpOn = !pumpOn; updatePumpUI(); }

async function registrarCarga(qty) {
    if (!selectedId) return;
    const p = DB.find(x => x.id === selectedId);
    if (!p) return;

    if (!qty) qty = parseInt(document.getElementById('inputCargaManual').value) || 0;
    if (qty <= 0) return alert("Cantidad inválida");
    
    const nuevo = Math.min(CAP_MAX_LITROS, (p.litros ?? 0) + qty);
    
    try {
        await fetch(`${API_URL}/${selectedId}`, {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({litros:nuevo})
        });
        await loadFleetData();
        irADetalle(selectedId); 
        alert(`✅ Carga registrada: +${qty} L`);
    } catch(e) { alert("Error al guardar"); }
}

// 5. INICIO Y EXPOSICIÓN DE FUNCIONES
function init() {
    if (typeof L === 'undefined') { setTimeout(init, 100); return; }
    
    fleetMarkers = L.layerGroup();
    mapFleet = L.map('mapFleet', {zoomControl:false}).setView([-36, -69], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapFleet);
    fleetMarkers.addTo(mapFleet);

    mapDetail = L.map('mapDetail', {zoomControl:false, attributionControl:false}).setView([0,0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapDetail);

    loadFleetData(); 
    updatePumpUI();
}

// Funciones globales para onclick
window.filtrarFlota = renderFleet;
window.filtrarEstado = (st) => { filterState = st; renderFleet(); };
window.mostrarTabEstado = () => {
    document.getElementById('panelEstado').classList.remove('hidden');
    document.getElementById('panelCarga').classList.add('hidden');
    document.getElementById('tabEstado').classList.add('tab-active');
    document.getElementById('tabCarga').classList.remove('tab-active');
};
window.mostrarTabCarga = () => {
    document.getElementById('panelEstado').classList.add('hidden');
    document.getElementById('panelCarga').classList.remove('hidden');
    document.getElementById('tabEstado').classList.remove('tab-active');
    document.getElementById('tabCarga').classList.add('tab-active');
};
window.abrirPanelAdmin = () => document.getElementById('modalAdmin').classList.add('open');
window.cerrarPanelAdmin = () => document.getElementById('modalAdmin').classList.remove('open');
window.abrirFormularioAlta = () => document.getElementById('modalForm').classList.add('open');
window.cerrarFormulario = () => document.getElementById('modalForm').classList.remove('open');
window.irAFlota = irAFlota;
window.togglePump = togglePump;
window.registrarCarga = registrarCarga;

document.addEventListener('DOMContentLoaded', init);
let modoEdicion = false; // false = crear, true = editar

function abrirFormularioAlta() {
    modoEdicion = false;

    document.getElementById('form-title').innerText = "Nuevo Patín";

    document.getElementById('form-id').value = "";
    document.getElementById('form-zona').value = "";
    document.getElementById('form-prod').value = "";
    document.getElementById('form-sensor').value = "";
    document.getElementById('form-cap').value = 400;
    document.getElementById('form-litros').value = 0;
    document.getElementById('form-lat').value = "";
    document.getElementById('form-lng').value = "";

    document.getElementById('modalForm').classList.add('open');
}

function abrirFormularioEdicion(id) {
    const p = DB.find(x => x.id === id);
    if (!p) return alert("Patín no encontrado");

    modoEdicion = true;
    document.getElementById('form-title').innerText = "Editar Patín";

    document.getElementById('form-id').value = p.id;
    document.getElementById('form-zona').value = p.zona;
    document.getElementById('form-prod').value = p.prod;
    document.getElementById('form-sensor').value = p.sensor;
    document.getElementById('form-cap').value = p.cap;
    document.getElementById('form-litros').value = p.litros;
    document.getElementById('form-lat').value = p.lat ?? "";
    document.getElementById('form-lng').value = p.lng ?? "";

    document.getElementById('modalForm').classList.add('open');
}

async function guardarPatin() {

    const body = {
        id: document.getElementById('form-id').value.trim(),
        zona: document.getElementById('form-zona').value.trim(),
        prod: document.getElementById('form-prod').value.trim(),
        sensor: document.getElementById('form-sensor').value.trim(),
        cap: Number(document.getElementById('form-cap').value),
        litros: Number(document.getElementById('form-litros').value),
        lat: Number(document.getElementById('form-lat').value),
        lng: Number(document.getElementById('form-lng').value)
    };

    if (!body.id) return alert("Debe ingresar un ID");

    try {
        if (modoEdicion) {
            // PATCH /tanques/{id}
            await fetch(`${API_URL}/${body.id}`, {
                method: 'PATCH',
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify(body)
            });
            alert("Patín actualizado");
        } else {
            // POST /tanques
            await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify(body)
            });
            alert("Patín creado");
        }

        cerrarFormulario();
        await loadFleetData();

    } catch (e) {
        alert("Error en la API");
        console.error(e);
    }
}

async function eliminarPatin() {
    if (!modoEdicion) return alert("Solo puede eliminar patines existentes");

    const id = document.getElementById('form-id').value;

    if (!confirm(`¿Eliminar patín ${id}?`)) return;

    try {
        await fetch(`${API_URL}/${id}`, { method:'DELETE' });
        alert("Patín eliminado");
        cerrarFormulario();
        await loadFleetData();
    } catch (e) {
        alert("Error eliminando patín");
    }
}

