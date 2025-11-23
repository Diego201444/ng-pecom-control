// --- 1. DATOS SIMULADOS ---
const ZONAS = ["Mendoza Norte", "Mendoza Sur", "Neuquén Este", "Vaca Muerta"];
let DB = [];

function seedDemoData() {
  for (let i=1; i<=40; i++) {
      const cap = 400;
      const rand = Math.random();
      let litros = (rand < 0.1) ? Math.floor(cap*0.2)
                 : (rand < 0.25 ? Math.floor(cap*0.45)
                 : Math.floor(cap*0.85));
      DB.push({
          id: `E-${1000+i}`,
          sensor: `SN-${8000+i}`,
          zona: ZONAS[Math.floor(Math.random()*ZONAS.length)],
          prod: "Antiincrustante A",
          lat: -34.6 + (Math.random()-0.5)*1.5,
          lng: -68.3 + (Math.random()-0.5)*1.5,
          litros: litros,
          cap: cap
      });
  }
}
seedDemoData();

// --- 2. VARIABLES GLOBALES ---
let mapFleet, mapDetail;
let fleetMarkers = L.layerGroup();
let detailMarker = null;
let chartLevelInst = null, chartPumpInst = null;
let filterState = 'all';
let selectedId = null;
let pumpOn = true;

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    mapFleet = L.map('mapFleet', {zoomControl: false}).setView([-34.6, -68.3], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapFleet);
    L.control.zoom({position:'topright'}).addTo(mapFleet);
    fleetMarkers.addTo(mapFleet);

    mapDetail = L.map('mapDetail', {zoomControl: false, attributionControl: false}).setView([0,0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapDetail);

    renderFleet();
    updateKPIs();
});

// --- 4. UTILIDADES VISUALES ---
function getStatusColor(pct) {
    if (pct < 30) return 'var(--danger)'; 
    if (pct < 50) return 'var(--warning)'; 
    return 'var(--success)'; 
}

function createCustomIcon(color) {
    const html = `<div class="marker-dot" style="background:${color};"></div>`;
    return L.divIcon({className:'', html:html, iconSize:[18,18], iconAnchor:[9,9]});
}

// --- 5. NAVEGACIÓN ---
function irADetalle(id) {
    const p = DB.find(x => x.id === id);
    if (!p) return;
    selectedId = id;

    document.getElementById('det-id').innerText = p.id;
    document.getElementById('det-prod').innerText = p.prod;
    document.getElementById('det-sensor').innerText = p.sensor;
    document.getElementById('det-zona').innerText = p.zona;

    const inputCarga = document.getElementById('inputCargaManual');
    const msgCarga = document.getElementById('msgCarga');
    if (inputCarga) inputCarga.value = '';
    if (msgCarga) msgCarga.innerText = '';

    if (detailMarker) mapDetail.removeLayer(detailMarker);
    const pct = Math.round((p.litros/p.cap)*100);
    const iconColor = getStatusColor(pct);
    const customIcon = createCustomIcon(iconColor); 
    detailMarker = L.marker([p.lat, p.lng], {icon: customIcon}).addTo(mapDetail);
    mapDetail.setView([p.lat, p.lng], 11);
    mapDetail.invalidateSize();

    pumpOn = true;
    updatePumpUI();

    actualizarDetalleDesdeDB();

    document.getElementById('view-fleet').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');

    mostrarTabEstado();

    setTimeout(() => { mapDetail.invalidateSize(); }, 120);
}

function irAFlota() {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-fleet').classList.remove('hidden');
    setTimeout(() => { mapFleet.invalidateSize(); }, 120);
}

// --- 6. RENDERIZADO FLOTA ---
function renderFleet() {
    const list = document.getElementById('fleetList');
    list.innerHTML = '';
    fleetMarkers.clearLayers();

    const search = document.getElementById('searchInput').value.toLowerCase();
    const zoneFilter = document.getElementById('zoneFilter').value; 
    
    let count = 0;

    DB.forEach(p => {
        const pct = Math.round((p.litros/p.cap)*100);
        
        let statusMatch = true;
        if (filterState === 'danger' && pct >= 30) statusMatch = false;
        if (filterState === 'warn' && (pct < 30 || pct >= 50)) statusMatch = false;
        if (filterState === 'ok' && pct < 50) statusMatch = false;

        const textMatch = p.id.toLowerCase().includes(search) || p.zona.toLowerCase().includes(search);
        const zoneMatch = (zoneFilter === 'all' || p.zona === zoneFilter); 

        if (statusMatch && textMatch && zoneMatch) { 
            count++;
            
            const color = getStatusColor(pct);
            let borderClass = 'border-ok';
            let chipClass = 'pct-ok';
            if (pct < 50) { borderClass = 'border-warn'; chipClass = 'pct-warn'; }
            if (pct < 30) { borderClass = 'border-danger'; chipClass = 'pct-danger'; }

            const customIcon = createCustomIcon(color);
            const markerContent = `<b>${p.id}</b><br>${pct}%`;
            const m = L.marker([p.lat, p.lng], {icon: customIcon})
                .bindTooltip(markerContent, {
                    direction: 'top', 
                    offset: L.point(0, -10),
                    sticky: true 
                });
            m.on('click', () => irADetalle(p.id));
            fleetMarkers.addLayer(m);

            const item = document.createElement('div');
            item.className = `tank-item ${borderClass}`;
            item.onclick = () => irADetalle(p.id);
            item.innerHTML = `
                    <div class="tank-main">
                        <div class="tank-id">${p.id}</div>
                        <div class="tank-zone">${p.zona}</div>
                    </div>
                    <div class="tank-right">
                        <span class="pct-chip ${chipClass}">${pct}%</span>
                        <span class="tank-litros">${p.litros} L</span>
                    </div>
                `;
            list.appendChild(item);
        }
    });
    document.getElementById('listCount').innerText = `${count} Unidades`;
}

// --- 7. DETALLE: TELEMETRÍA Y GRÁFICOS ---
function renderTelemetry(currentL, maxL) {
    const tbody = document.getElementById('tableTelemetry');
    tbody.innerHTML = '';
    let lvl = currentL;
    
    for (let i=0; i<20; i++) {
        let time = new Date();
        time.setMinutes(time.getMinutes() - (i*60));
        
        let change = Math.floor(Math.random() * 5); 
        if (Math.random() > 0.8) lvl += change; 
        else lvl += Math.floor(Math.random() * 2); 
        if (lvl > maxL) lvl = maxL;

        const pct = (lvl/maxL);
        let badge = '<span class="badge bg-blue">OK</span>';
        if (pct < 0.3) badge = '<span class="badge bg-red">BAJO</span>';
        else if (pct < 0.5) badge = '<span class="badge bg-yellow">WARN</span>';

        const row = `<tr>
                <td>${time.getHours().toString().padStart(2,'0')}:${time.getMinutes().toString().padStart(2,'0')}</td>
                <td style="font-family:monospace; font-weight:600;">${lvl} L</td>
                <td>12.${Math.floor(Math.random()*5)}V</td>
                <td>${badge}</td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    }
}

function renderCharts(lvl) {
    if (chartLevelInst) chartLevelInst.destroy();
    if (chartPumpInst) chartPumpInst.destroy();

    chartLevelInst = new Chart(document.getElementById('chartLevel'), {
        type: 'line',
        data: {
            labels: ['Jun','Jul','Ago','Sep','Oct','Nov'],
            datasets: [{
                data: [lvl+50, lvl+30, lvl-20, lvl+10, lvl-5, lvl],
                borderColor: '#2563eb',
                backgroundColor: '#eff6ff',
                fill:true,
                tension:0.4
            }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins:{legend:{display:false}},
          scales:{
            x:{grid:{display:false}},
            y:{beginAtZero:false, grid:{color:'#e5e7eb'}}
          }
        }
    });

    chartPumpInst = new Chart(document.getElementById('chartPump'), {
        type: 'bar',
        data: {
            labels: ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'],
            datasets: [{
                data: [65, 59, 80, 81, 56, 55],
                backgroundColor: '#9ca3af',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins:{
                legend:{ display:false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#e5e7eb',
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(ctx) {
                            return 'Horas de uso: ' + ctx.raw + ' h';
                        }
                    }
                }
            },
            scales:{
                x:{ grid:{ display:false } },
                y:{ display:false }
            }
        }
    });
}

function actualizarDetalleDesdeDB() {
    const p = DB.find(x => x.id === selectedId);
    if (!p) return;

    document.getElementById('det-litros').innerText = p.litros + " L";
    document.getElementById('det-cap').innerText = p.cap + " L";
    const pct = Math.round((p.litros/p.cap)*100);
    document.getElementById('det-pct').innerText = pct + "%";

    const liquid = document.getElementById('tankLiquid');
    liquid.style.height = pct + "%";
    liquid.innerText = `~${Math.floor(Math.random()*15)+5}d`;
    liquid.style.background = getStatusColor(pct);

    renderTelemetry(p.litros, p.cap);
    renderCharts(p.litros);

    if (detailMarker) {
      const iconColor = getStatusColor(pct);
      const customIcon = createCustomIcon(iconColor);
      detailMarker.setIcon(customIcon);
    }
}

// --- 8. ADMINISTRACIÓN (CRUD) ---
function abrirPanelAdmin() {
    renderizarTablaAdmin();
    document.getElementById('modalAdmin').classList.add('open');
}
function cerrarPanelAdmin() { document.getElementById('modalAdmin').classList.remove('open'); }

function renderizarTablaAdmin() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    DB.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
              <td><strong>${item.id}</strong></td>
              <td>${item.sensor}</td>
              <td>${item.zona}</td>
              <td>${item.prod}</td>
              <td style="text-align:center">
                <button class="btn-edit-mini btn-white" onclick="abrirFormularioEdicion(${index})">✏️</button>
                <button class="btn-del-mini" onclick="eliminarPatin(${index})">🗑️</button>
              </td>`;
        tbody.appendChild(tr);
    });
}

function abrirFormularioAlta() {
    document.getElementById('formTitle').innerText = "Alta de Activo";
    document.getElementById('editIndex').value = "-1"; 
    document.getElementById('formId').value = `E-${1000 + DB.length + 1}`;
    document.getElementById('formId').disabled = false;
    document.getElementById('formSensor').value = "";
    document.getElementById('formZone').value = "Mendoza Norte";
    document.getElementById('formProduct').value = "";
    document.getElementById('formLat').value = "-34.60";
    document.getElementById('formLng').value = "-68.30";
    document.getElementById('formCap').value = 400;
    document.getElementById('formLitros').value = 0;
    document.getElementById('modalForm').classList.add('open');
}

function abrirFormularioEdicion(index) {
    const item = DB[index];
    document.getElementById('formTitle').innerText = `Editar ${item.id}`;
    document.getElementById('editIndex').value = index;
    document.getElementById('formId').value = item.id;
    document.getElementById('formId').disabled = true; 
    document.getElementById('formSensor').value = item.sensor;
    document.getElementById('formZone').value = item.zona;
    document.getElementById('formProduct').value = item.prod;
    document.getElementById('formLat').value = item.lat;
    document.getElementById('formLng').value = item.lng;
    document.getElementById('formCap').value = item.cap;
    document.getElementById('formLitros').value = item.litros;
    document.getElementById('modalForm').classList.add('open');
}

function cerrarFormulario() { document.getElementById('modalForm').classList.remove('open'); }

function guardarDatos() {
    const idx = parseInt(document.getElementById('editIndex').value);
    const newData = {
        id: document.getElementById('formId').value,
        sensor: document.getElementById('formSensor').value,
        zona: document.getElementById('formZone').value,
        prod: document.getElementById('formProduct').value,
        lat: parseFloat(document.getElementById('formLat').value),
        lng: parseFloat(document.getElementById('formLng').value),
        cap: parseInt(document.getElementById('formCap').value),
        litros: parseInt(document.getElementById('formLitros').value)
    };
    if (!newData.id) return alert("Faltan datos");
    if (idx === -1) DB.unshift(newData);
    else DB[idx] = newData; 

    cerrarFormulario();
    renderizarTablaAdmin(); 
    filtrarFlota();   
    updateKPIs();

    if (selectedId === newData.id) {
      actualizarDetalleDesdeDB();
    }
}

function eliminarPatin(index) {
    if (confirm("¿Confirma eliminar este patín?")) {
        const deleted = DB[index]?.id;
        DB.splice(index, 1);
        renderizarTablaAdmin();
        filtrarFlota();
        updateKPIs();
        if (deleted && deleted === selectedId) {
          irAFlota();
        }
    }
}

// --- 9. FILTROS Y KPIs ---
function filtrarFlota() { renderFleet(); updateKPIs(); }
    
function filtrarEstado(st) {
    filterState = st;
    document.querySelectorAll('.kpi-box').forEach(b => b.classList.remove('active'));
    document.getElementById(`kpi-${st}`).classList.add('active');
    renderFleet();
    updateKPIs();
}

function updateKPIs() {
    let ok=0, warn=0, danger=0;
    DB.forEach(p => {
        const pct = (p.litros/p.cap);
        if (pct < 0.3) danger++;
        else if (pct < 0.5) warn++;
        else ok++;
    });
    document.getElementById('count-all').innerText = DB.length;
    document.getElementById('count-ok').innerText = ok;
    document.getElementById('count-warn').innerText = warn;
    document.getElementById('count-danger').innerText = danger;
}

// --- 10. Tabs Estado / Carga ---
function mostrarTabEstado() {
  const panelEstado = document.getElementById('panelEstado');
  const panelCarga = document.getElementById('panelCarga');
  const tabEstado = document.getElementById('tabEstado');
  const tabCarga = document.getElementById('tabCarga');
  panelEstado.classList.remove('hidden');
  panelCarga.classList.add('hidden');
  tabEstado.classList.add('tab-active');
  tabCarga.classList.remove('tab-active');
}

function mostrarTabCarga() {
  const panelEstado = document.getElementById('panelEstado');
  const panelCarga = document.getElementById('panelCarga');
  const tabEstado = document.getElementById('tabEstado');
  const tabCarga = document.getElementById('tabCarga');
  panelEstado.classList.add('hidden');
  panelCarga.classList.remove('hidden');
  tabEstado.classList.remove('tab-active');
  tabCarga.classList.add('tab-active');
}

// --- 11. Bomba ON / OFF ---
function updatePumpUI() {
  const pumpStatus = document.getElementById('pumpStatus');
  const pumpBtn = document.getElementById('btnPumpToggle');
  if (!pumpStatus || !pumpBtn) return;
  if (pumpOn) {
    pumpStatus.style.color = 'var(--success)';
    pumpStatus.innerText = '● Bomba Activa';
    pumpBtn.textContent = '⏻ APAGAR BOMBA';
    pumpBtn.classList.remove('btn-primary');
    pumpBtn.classList.add('btn-danger-soft');
  } else {
    pumpStatus.style.color = 'var(--text-sec)';
    pumpStatus.innerText = '○ Bomba Detenida';
    pumpBtn.textContent = '⏻ ENCENDER BOMBA';
    pumpBtn.classList.remove('btn-danger-soft');
    pumpBtn.classList.add('btn-primary');
  }
}

function togglePump() {
  pumpOn = !pumpOn;
  updatePumpUI();
}

// --- 12. Registro de Carga ---
function registrarCarga(extraLitros) {
  const p = DB.find(x => x.id === selectedId);
  if (!p) return;
  let litrosAgregar = 0;

  if (typeof extraLitros === 'number') {
    litrosAgregar = extraLitros;
  } else {
    const input = document.getElementById('inputCargaManual');
    litrosAgregar = parseInt(input.value, 10) || 0;
  }

  const msg = document.getElementById('msgCarga');
  if (litrosAgregar <= 0) {
    if (msg) msg.innerText = 'Ingresá un valor mayor a 0.';
    return;
  }

  const nivelAnterior = p.litros;
  p.litros = Math.min(p.litros + litrosAgregar, p.cap);

  if (msg) {
    msg.innerText = `Carga registrada: +${litrosAgregar} L (de ${nivelAnterior} L a ${p.litros} L).`;
  }

  actualizarDetalleDesdeDB();
  renderFleet();
  updateKPIs();
}

// --- 13. Editar / Eliminar desde encabezado detalle ---
function editarPatinDetalle() {
  if (!selectedId) return;
  const idx = DB.findIndex(p => p.id === selectedId);
  if (idx === -1) return;
  abrirFormularioEdicion(idx);
}

function eliminarPatinDetalle() {
  if (!selectedId) return;
  const idx = DB.findIndex(p => p.id === selectedId);
  if (idx === -1) return;
  eliminarPatin(idx);
}