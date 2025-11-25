// ==============================================================================
// 🎯 app.js: VERSIÓN CONECTADA A PHP (api.php + SQLite + telemetría real)
// ==============================================================================

// 1. CONFIGURACIÓN DEL SERVIDOR
const API_BASE = 'api.php'; // backend PHP
const ZONAS = ["Mendoza Norte", "Mendoza Sur", "Neuquén Este", "Vaca Muerta"];
const PRODUCTOS_MAESTRO = [
  "Antiincrustante A",
  "Antiincrustante B",
  "Bactericida",
  "Demulsificante",
  "Inhibidor de Corrosión"
];

let DB = [];
let mapFleet, mapDetail;
let fleetMarkers;
let detailMarker = null;
let chartLevelInst = null, chartPumpInst = null;
let filterState = 'all';
let selectedId = null;
let pumpOn = true;

// ==============================================================================
// 2. CARGA DE DATOS DESDE EL SERVIDOR PHP
// ==============================================================================

async function loadFleetData() {
  console.log("📡 Conectando a PHP (api.php?action=patines_listar)...");

  try {
    const response = await fetch(`${API_BASE}?action=patines_listar`);

    if (!response.ok) {
      throw new Error('El servidor PHP (api.php) no responde.');
    }

    const data = await response.json();

    // data es un array de filas de la tabla patines
    if (Array.isArray(data)) {
      DB = data.map(row => {
        const capacidad = Number(row.capacidad_litros ?? 0);
        const litros = Number(row.litros_actuales ?? 0);

        return {
          // usamos el código como ID visible
          id: row.codigo || String(row.id),

          sensor: row.sensor || '',
          zona: row.zona || 'Sin zona',

          // producto desde la DB
          prod: row.tipo_producto || 'Producto',

          // coordenadas y capacidad
          lat: Number(row.latitud ?? -34.6),
          lng: Number(row.longitud ?? -68.3),
          cap: capacidad,

          // litros actuales reales desde la DB
          litros: litros,

          // batería desde la DB
          bateria_v: Number(row.bateria_v ?? 12.5)
        };
      });
    } else {
      console.error("Formato desconocido desde PHP:", data);
      DB = [];
    }

    renderFleet();
    updateKPIs();
    console.log("✅ Datos cargados correctamente desde PHP:", DB.length, "unidades.");

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
    const el = document.getElementById('listCount');
    if (el) el.innerText = "SIN CONEXIÓN";
    alert("No se puede conectar a api.php. Verificá que XAMPP/Apache esté levantado.");
  }
}

// Carga telemetría real desde la API
async function loadTelemetry(patinId) {
  try {
    const res = await fetch(
      `${API_BASE}?action=telemetria_listar&codigo=${encodeURIComponent(patinId)}&limit=20`
    );
    if (!res.ok) throw new Error('Error al cargar telemetría');
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.error('Error telemetría:', e);
    return [];
  }
}

// ==============================================================================
// 3. UTILIDADES VISUALES (COLORES, ICONOS, TABLA, GRÁFICOS, ETC.)
// ==============================================================================

function getStatusColor(pct) {
  if (pct < 30) return 'var(--danger)';
  if (pct < 50) return 'var(--warning)';
  return 'var(--success)';
}

function createCustomIcon(color) {
  const html = `<div class="marker-dot" style="background:${color};"></div>`;
  return (typeof L !== 'undefined')
    ? L.divIcon({ className: '', html: html, iconSize: [18, 18], iconAnchor: [9, 9] })
    : null;
}

// Telemetría basada en lecturas reales
function renderTelemetry(readings, maxL) {
  const tbody = document.getElementById('tableTelemetry');
  if (tbody) tbody.innerHTML = '';

  if (!Array.isArray(readings) || readings.length === 0) {
    // Si no hay lecturas devolvemos algo neutro para que el gráfico no muera
    return [20, 35, 45, 60, 55, 70];
  }

  // Ordenamos de más reciente a más vieja
  readings.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

  const limit = Math.min(readings.length, 20);
  for (let i = 0; i < limit; i++) {
    const r = readings[i];
    const ts = new Date(r.fecha_hora);
    const hh = ts.getHours().toString().padStart(2, '0');
    const mm = ts.getMinutes().toString().padStart(2, '0');
    const litros = Math.round(r.litros ?? 0);
    const batt = (r.bateria_v ?? 0).toFixed(1);
    const pct = maxL ? (litros / maxL) : 0;

    let badge = '<span class="badge bg-blue">OK</span>';
    if (pct < 0.3) badge = '<span class="badge bg-red">BAJO</span>';
    else if (pct < 0.5) badge = '<span class="badge bg-yellow">WARN</span>';

    const row = `<tr>
        <td>${hh}:${mm}</td>
        <td style="font-family:monospace; font-weight:600;">${litros} L</td>
        <td>${batt} V</td>
        <td>${badge}</td>
      </tr>`;
    if (tbody) tbody.insertAdjacentHTML('beforeend', row);
  }

  // Por ahora el gráfico mensual sigue siendo sintético
  const consumoMensual = [20, 35, 45, 60, 55, 70]
    .map(c => c + Math.floor(Math.random() * 20));
  return consumoMensual;
}

function calcularTotalEntregado(consumoMensual) {
  const totalEntregado = consumoMensual.reduce((sum, current) => sum + current, 0);
  const element = document.getElementById('totalEntregado');
  if (element) element.innerText = `${totalEntregado.toFixed(0)} L (6 meses)`;
}

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
function togglePump() { pumpOn = !pumpOn; updatePumpUI(); }

function renderCharts(lvl, consumoMensual, cap) {
    if (typeof Chart === 'undefined') return;
    if (chartLevelInst) chartLevelInst.destroy();
    if (chartPumpInst) chartPumpInst.destroy();

    const capacidad = cap || 400; // por defecto 400L

    const ctxLevel = document.getElementById('chartLevel');
    if (ctxLevel) {
        chartLevelInst = new Chart(ctxLevel, {
            type: 'line',
            data: {
                labels: ['Jun','Jul','Ago','Sep','Oct','Nov'],
                datasets: [{
                    data: [lvl+50, lvl+30, lvl-20, lvl+10, lvl-5, lvl],
                    borderColor: '#2563eb',
                    backgroundColor: '#eff6ff',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins:{legend:{display:false}},
                scales:{
                    x:{grid:{display:false}},
                    y:{
                        min: 0,
                        max: capacidad,
                        beginAtZero: true,
                        grid:{color:'#e5e7eb'}
                    }
                }
            }
        });
    }

    const ctxPump = document.getElementById('chartPump');
    if (ctxPump) {
        chartPumpInst = new Chart(ctxPump, {
            type: 'bar',
            data: {
                labels: ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'],
                datasets: [{
                    data: consumoMensual,
                    backgroundColor: '#9ca3af',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins:{ legend:{ display:false } },
                scales:{
                    x:{grid:{display:false}},
                    y:{display:false}
                }
            }
        });
    }
    calcularTotalEntregado(consumoMensual);
}

// Actualiza datos estáticos del panel de detalle (no telemetría)
function actualizarDetalleDesdeDB() {
  const p = DB.find(x => x.id === selectedId);
  if (!p) return;

  document.getElementById('det-batt').innerText = `${(p.bateria_v || 12.0)} V`;
  document.getElementById('det-litros').innerText = p.litros + " L";
  document.getElementById('det-cap').innerText = p.cap + " L";

  const pct = p.cap ? Math.round((p.litros / p.cap) * 100) : 0;
  document.getElementById('det-pct').innerText = pct + "%";

  const liquid = document.getElementById('tankLiquid');
  if (liquid) {
    liquid.style.height = pct + "%";
    liquid.style.background = getStatusColor(pct);
  }

  if (detailMarker && typeof L !== 'undefined') {
    const iconColor = getStatusColor(pct);
    const customIcon = createCustomIcon(iconColor);
    if (customIcon) detailMarker.setIcon(customIcon);
  }
}

// Pide telemetría real a la API y actualiza tabla + gráficos
async function actualizarTelemetryDesdeAPI() {
  const p = DB.find(x => x.id === selectedId);
  if (!p) return;
  const readings = await loadTelemetry(p.id);
  const consumoMensual = renderTelemetry(readings, p.cap);
  renderCharts(p.litros, consumoMensual, p.cap);

}

// ==============================================================================
// 4. LISTA DE FLOTA + KPIs
// ==============================================================================

function renderFleet() {
  const list = document.getElementById('fleetList');
  list.innerHTML = '';
  if (typeof L !== 'undefined') fleetMarkers.clearLayers();

  const searchInput = document.getElementById('searchInput');
  const search = searchInput ? searchInput.value.toLowerCase() : '';
  const zoneFilterInput = document.getElementById('zoneFilter');
  const zoneFilter = zoneFilterInput ? zoneFilterInput.value : 'all';
  let count = 0;

  DB.forEach(p => {
    if (!p.cap) return;
    const pct = Math.round((p.litros / p.cap) * 100);

    let statusMatch =
      (filterState === 'all') ||
      (filterState === 'danger' && pct < 30) ||
      (filterState === 'warn' && pct >= 30 && pct < 50) ||
      (filterState === 'ok' && pct >= 50);

    const textMatch =
      p.id.toLowerCase().includes(search) ||
      p.zona.toLowerCase().includes(search) ||
      (p.prod && p.prod.toLowerCase().includes(search));

    const zoneMatch = (zoneFilter === 'all' || p.zona === zoneFilter);

    if (statusMatch && textMatch && zoneMatch) {
      count++;
      const color = getStatusColor(pct);
      let borderClass = 'border-ok';
      let chipClass = 'pct-ok';
      if (pct < 50) { borderClass = 'border-warn'; chipClass = 'pct-warn'; }
      if (pct < 30) { borderClass = 'border-danger'; chipClass = 'pct-danger'; }

      if (typeof L !== 'undefined') {
        const customIcon = createCustomIcon(color);
        const markerContent = `<b>${p.id}</b><br>${pct}%`;
        const m = L.marker([p.lat, p.lng], { icon: customIcon })
          .bindTooltip(markerContent, { direction: 'top', offset: L.point(0, -10) });
        m.on('click', () => irADetalle(p.id));
        fleetMarkers.addLayer(m);
      }

      const item = document.createElement('div');
      item.className = `tank-item ${borderClass}`;
      item.onclick = () => irADetalle(p.id);
      item.innerHTML = `
          <div class="tank-main">
              <div class="tank-id">${p.id}</div>
              <div class="tank-product">${p.prod}</div> 
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

function updateKPIs() {
  let ok = 0, warn = 0, danger = 0;
  DB.forEach(p => {
    if (!p.cap) return;
    const pct = (p.litros / p.cap);
    if (pct < 0.3) danger++;
    else if (pct < 0.5) warn++;
    else ok++;
  });
  document.getElementById('count-all').innerText = DB.length;
  document.getElementById('count-ok').innerText = ok;
  document.getElementById('count-warn').innerText = warn;
  document.getElementById('count-danger').innerText = danger;
}

// ==============================================================================
// 5. INICIALIZACIÓN
// ==============================================================================

function initializeApp() {
  if (typeof L === 'undefined' || typeof Chart === 'undefined') {
    setTimeout(initializeApp, 100);
    return;
  }
  
    fleetMarkers = L.layerGroup();
    mapFleet = L.map('mapFleet', {zoomControl: false}).setView([-34.6, -68.3], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapFleet);
    L.control.zoom({position:'topright'}).addTo(mapFleet);
    fleetMarkers.addTo(mapFleet);

    // ⚠️ NO creamos mapDetail acá, solo en irADetalle()

    loadFleetData(); 
}
document.addEventListener('DOMContentLoaded', initializeApp);


// 6. NAVEGACIÓN Y ACCIONES
function irADetalle(id) {
    const p = DB.find(x => x.id === id);
    if (!p) return;
    selectedId = id;
    document.getElementById('det-id').innerText = p.id;
    document.getElementById('det-prod').innerText = p.prod;
    document.getElementById('det-sensor').innerText = p.sensor;
    document.getElementById('det-zona').innerText = p.zona;
    
    // --- MAPA DETALLE: se crea sólo cuando entro al detalle ---
    if (typeof L !== 'undefined') {
        if (!mapDetail) {
            mapDetail = L.map('mapDetail', {zoomControl: false, attributionControl: false});
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
              .addTo(mapDetail);
        }

        if (detailMarker) mapDetail.removeLayer(detailMarker);

        const pct = p.cap ? Math.round((p.litros/p.cap)*100) : 0;
        const iconColor = getStatusColor(pct);
        const customIcon = createCustomIcon(iconColor);

        if (customIcon) {
            detailMarker = L.marker([p.lat, p.lng], {icon: customIcon}).addTo(mapDetail);
        }
        mapDetail.setView([p.lat, p.lng], 11);
        setTimeout(() => { mapDetail.invalidateSize(); }, 200);
    }

    actualizarDetalleDesdeDB();
    actualizarTelemetryDesdeAPI(); // telemetría real

    document.getElementById('view-fleet').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');
    mostrarTabEstado();
}

function irAFlota() {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-fleet').classList.remove('hidden');
    selectedId = null;
    if (typeof L !== 'undefined') setTimeout(() => { mapFleet.invalidateSize(); }, 120);
}

function filtrarFlota() { renderFleet(); updateKPIs(); }

function filtrarEstado(st) {
    filterState = st;
    document.querySelectorAll('.kpi-box').forEach(b => b.classList.remove('active'));
    document.getElementById(`kpi-${st}`).classList.add('active');
    renderFleet();
    updateKPIs();
}

function mostrarTabEstado() {
  document.getElementById('panelEstado').classList.remove('hidden');
  document.getElementById('panelCarga').classList.add('hidden');
  document.getElementById('tabEstado').classList.add('tab-active');
  document.getElementById('tabCarga').classList.remove('tab-active');
}
function mostrarTabCarga() {
  document.getElementById('panelEstado').classList.add('hidden');
  document.getElementById('panelCarga').classList.remove('hidden');
  document.getElementById('tabEstado').classList.remove('tab-active');
  document.getElementById('tabCarga').classList.add('tab-active');
}

// 6. GESTIÓN (ABM)

function abrirPanelAdmin() {
    renderizarTablaAdmin();
    document.getElementById('modalAdmin').classList.add('open');
}
function cerrarPanelAdmin() { document.getElementById('modalAdmin').classList.remove('open'); }

function renderizarTablaAdmin() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    DB.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td>${item.sensor}</td>
            <td>${item.zona}</td>
            <td>${item.prod}</td>
            <td style="text-align:center">
              <button class="btn-edit-mini btn-white" onclick="abrirFormularioEdicion('${item.id}')">✏️</button>
              <button class="btn-del-mini" onclick="eliminarPatin('${item.id}')">🗑️</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

function fillProductSelect() {
    const select = document.getElementById('formProduct');
    if (!select) return;
    select.innerHTML = ''; 
    PRODUCTOS_MAESTRO.forEach(prod => {
        const option = document.createElement('option');
        option.value = prod;
        option.textContent = prod;
        select.appendChild(option);
    });
}

function abrirFormularioEdicion(patinId) {
    const item = DB.find(p => p.id === patinId);
    if (!item) return;
    fillProductSelect(); 
    document.getElementById('formTitle').innerText = `Editar ${item.id}`;
    document.getElementById('editIndex').value = patinId; 
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

function abrirFormularioAlta() {
    fillProductSelect(); 
    document.getElementById('formTitle').innerText = "Alta de Activo";
    document.getElementById('editIndex').value = "-1"; 
    document.getElementById('formId').value = `E-${1000 + DB.length + 1}`;
    document.getElementById('formId').disabled = false;
    document.getElementById('formSensor').value = "";
    document.getElementById('formZone').value = "Mendoza Norte";
    document.getElementById('formProduct').value = PRODUCTOS_MAESTRO[0]; 
    document.getElementById('formLat').value = "-34.60";
    document.getElementById('formLng').value = "-68.30";
    document.getElementById('formCap').value = 400;
    document.getElementById('formLitros').value = 0;
    document.getElementById('modalForm').classList.add('open');
}

function cerrarFormulario() { document.getElementById('modalForm').classList.remove('open'); }

// --- FUNCIONES QUE HABLAN CON EL SERVIDOR ---

async function guardarDatos() {
    const refId = document.getElementById('editIndex').value;
    const isEditing = refId !== "-1";
    
    const newData = {
        id: document.getElementById('formId').value.trim(),
        sensor: document.getElementById('formSensor').value,
        zona: document.getElementById('formZone').value,
        prod: document.getElementById('formProduct').value,
        lat: parseFloat(document.getElementById('formLat').value),
        lng: parseFloat(document.getElementById('formLng').value),
        cap: parseFloat(document.getElementById('formCap').value),
        litros: parseFloat(document.getElementById('formLitros').value),
        bateria_v: 12.5 
    };

    if (!newData.id) return alert("Falta el ID del patín");

    try {
        const response = await fetch(`${API_BASE}?action=patin_guardar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });

        const result = await response.json();
        if(!response.ok || result.error) {
          console.error(result);
          throw new Error(result.error || "Error en API");
        }

        cerrarFormulario();
        await loadFleetData(); 
        alert(isEditing ? "Patín actualizado correctamente" : "Patín creado correctamente");

    } catch (error) {
        console.error(error);
        alert("Error al guardar. Revisá la consola.");
    }
}

async function eliminarPatin(patinId) {
    if (!patinId) return;
    if (!confirm(`¿Eliminar ${patinId}?`)) return;

    try {
        const response = await fetch(`${API_BASE}?action=patin_eliminar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: patinId })
        });

        const result = await response.json();
        if(!response.ok || result.error) {
          console.error(result);
          throw new Error(result.error || "Error en API");
        }

        if (patinId === selectedId) irAFlota();
        await loadFleetData(); 
        alert("Patín eliminado correctamente");

    } catch (error) {
        console.error(error);
        alert("Error al eliminar. Revisá la consola.");
    }
}
function editarPatinDetalle() { if (selectedId) abrirFormularioEdicion(selectedId); }
function eliminarPatinDetalle() { if (selectedId) eliminarPatin(selectedId); }
function registrarCarga() { alert("Función de carga manual en desarrollo para API."); }
