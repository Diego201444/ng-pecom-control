<?php
// Carga el encabezado común
require __DIR__ . '/partials/header.php';
?>

<!-- VISTA GENERAL -->
<div id="view-fleet" class="view">
    
    <header class="header">
      <div class="brand">
        <span style="font-size:18px;">🌐</span>
        <span>Centro de Control</span>
        <span style="font-weight:400; color:var(--text-sec); font-size:12px;">| Vista General</span>
      </div>
      <div style="font-size:11px; color:var(--text-sec);">
        Supervisor: <strong>Admin</strong>
      </div>
    </header>

    <div class="controls">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" id="searchInput" placeholder="Buscar por ID, zona..." onkeyup="filtrarFlota()">
      </div>

      <select class="btn btn-white" style="padding: 0 14px; min-width:140px;" id="zoneFilter" onchange="filtrarFlota()">
          <option value="all">Todas las Zonas</option>
          <option value="Mendoza Norte">Mendoza Norte</option>
          <option value="Mendoza Sur">Mendoza Sur</option>
          <option value="Neuquén Este">Neuquén Este</option>
          <option value="Vaca Muerta">Vaca Muerta</option>
      </select>

      <button class="btn btn-white" onclick="abrirPanelAdmin()">
        <span>⚙️</span>
        <span>Gestión</span>
      </button>
    </div>

    <div class="kpi-grid">
      <div class="kpi-box active" onclick="filtrarEstado('all')" id="kpi-all">
        <div>
          <div class="info-label">Total</div>
          <div style="font-size:20px; font-weight:800;" id="count-all">0</div>
        </div>
        <div style="font-size:18px; opacity:.8;">🛢️</div>
      </div>
      <div class="kpi-box" onclick="filtrarEstado('danger')" id="kpi-danger" style="border-bottom:3px solid var(--danger)">
        <div>
          <div class="info-label">Críticos (&lt;30%)</div>
          <div style="font-size:20px; font-weight:800; color:var(--danger)" id="count-danger">0</div>
        </div>
        <div style="font-size:18px;">🚨</div>
      </div>
      <div class="kpi-box" onclick="filtrarEstado('warn')" id="kpi-warn" style="border-bottom:3px solid var(--warning)">
        <div>
          <div class="info-label">Alerta (30–50%)</div>
          <div style="font-size:20px; font-weight:800; color:var(--warning)" id="count-warn">0</div>
        </div>
        <div style="font-size:18px;">⚠️</div>
      </div>
      <div class="kpi-box" onclick="filtrarEstado('ok')" id="kpi-ok" style="border-bottom:3px solid var(--success)">
        <div>
          <div class="info-label">Normal (&gt;50%)</div>
          <div style="font-size:20px; font-weight:800; color:var(--success)" id="count-ok">0</div>
        </div>
        <div style="font-size:18px;">✅</div>
      </div>
    </div>
    <div style="font-size:11px; color:var(--text-sec); margin-top:-4px;">
      Rangos: Crítico &lt; 30% · Alerta 30–50% · Normal &gt; 50%
    </div>

    <div class="fleet-content">
      <div class="map-wrapper">
        <div id="mapFleet" class="map-fix"></div>
      </div>
      
      <div class="list-wrapper">
        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:var(--text-sec); padding:0 4px 2px;">
          <span id="listCount">0 Unidades</span>
          <span>Estado</span>
        </div>
        <div class="card-list" id="fleetList"></div>
      </div>
    </div>
</div>

<!-- VISTA DETALLE -->
<div id="view-detail" class="view hidden">
    
    <header class="header">
      <div class="brand" style="gap:6px;">
        <button class="btn btn-white" onclick="irAFlota()">⬅ Volver</button>
        <div style="width:1px; height:18px; background:#e5e7eb; margin:0 8px;"></div>
        <span style="font-size:14px;">Detalle:</span>
        <span id="det-id" style="color:var(--primary); font-weight:600;">...</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn-edit-mini btn-white" onclick="editarPatinDetalle()">✏️ Editar</button>
        <button type="button" class="btn-del-mini" onclick="eliminarPatinDetalle()">🗑️ Eliminar</button>
        <div id="statusOnline" style="font-size:11px; color:var(--success); white-space:nowrap;">
          ● En Línea
        </div>
      </div>
    </header>

    <div class="info-grid">
      <div class="info-card"><div class="info-label">Producto</div><div class="info-value" style="color:var(--primary)" id="det-prod">-</div></div>
      <div class="info-card"><div class="info-label">Hardware ID</div><div class="info-value" id="det-sensor">-</div></div>
      <div class="info-card"><div class="info-label">Zona</div><div class="info-value" id="det-zona">-</div></div>
      <div class="info-card"><div class="info-label">Capacidad</div><div class="info-value" id="det-cap">-</div></div>
      <div class="info-card"><div class="info-label">Batería</div><div class="info-value" id="det-batt">12.4 V</div></div>
      <div class="info-card"><div class="info-label">Señal</div><div class="info-value">-72 dBm</div></div>
    </div>

    <div class="detail-layout">
      
      <div class="col-left">
        <div class="panel" style="flex:1.5;">
          <div class="panel-title">
            <div class="tab-switch">
              <button id="tabEstado" class="tab-btn tab-active" type="button" onclick="mostrarTabEstado()">Estado</button>
              <button id="tabCarga" class="tab-btn" type="button" onclick="mostrarTabCarga()">Carga</button>
            </div>
            <div id="pumpStatus" style="font-size:11px; font-weight:600; color:var(--success);">● Bomba Activa</div>
          </div>

          <!-- TAB ESTADO -->
          <div id="panelEstado" class="tank-visual">
            <div style="text-align:center;">
              <div style="font-size:30px; font-weight:800;" id="det-litros">0 L</div>
              <div style="font-size:13px; color:var(--text-sec);" id="det-pct">0%</div>
            </div>
            <div class="tank-container">
              <div class="liquid" id="tankLiquid" style="height:50%;"></div>
            </div>
            <button class="btn btn-danger-soft" id="btnPumpToggle" style="justify-content:center; margin-top:10px;" type="button" onclick="togglePump()">⏻ APAGAR BOMBA</button>
          </div>

          <!-- TAB CARGA -->
          <div id="panelCarga" class="tank-visual hidden">
            <div style="text-align:center; max-width:260px;">
              <div style="font-size:12px; color:var(--text-sec); margin-bottom:6px;">
                Registrar carga de producto en este patín
              </div>
              <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; justify-content:center;">
                <button type="button" class="btn btn-white btn-charge" onclick="registrarCarga(20)">+ 20 L</button>
                <button type="button" class="btn btn-white btn-charge" onclick="registrarCarga(50)">+ 50 L</button>
                <button type="button" class="btn btn-white btn-charge" onclick="registrarCarga(100)">+ 100 L</button>
              </div>
              <div style="display:flex; gap:6px; justify-content:center; align-items:center; margin-bottom:10px;">
                <input type="number" id="inputCargaManual" class="form-input" style="width:110px; padding:6px 8px; font-size:12px;" placeholder="Litros">
                <span style="font-size:12px; color:var(--text-sec);">L</span>
              </div>
              <button class="btn btn-primary" type="button" onclick="registrarCarga()">Registrar carga</button>
              <div id="msgCarga" style="margin-top:8px; font-size:11px; color:var(--text-sec); min-height:14px;"></div>
            </div>
          </div>
        </div>

        <div class="panel" style="flex:1; padding:0; overflow:hidden;">
          <div id="mapDetail" class="map-fix"></div>
        </div>
      </div>

      <div class="col-right">
        <div class="panel" style="flex:1;">
          <div class="panel-title">
            <span>Histórico de Nivel</span>
            <select style="border:none; font-size:11px; background:transparent;">
              <option>6 meses</option>
            </select>
          </div>
          <div class="chart-wrap"><canvas id="chartLevel"></canvas></div>
        </div>

        <div class="row-bottom">
          <div class="panel half">
            <div class="panel-title">Uso de Bomba</div>
            <div class="chart-wrap"><canvas id="chartPump"></canvas></div>
          </div>
          <div class="panel half">
            <div class="panel-title">Telemetría (Últimos 20)</div>
            <div class="telemetry-scroll">
              <table>
                <thead><tr><th>Hora</th><th>Nivel</th><th>Bat</th><th>Evento</th></tr></thead>
                <tbody id="tableTelemetry"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
</div>

<!-- MODAL ADMIN -->
<div class="modal-overlay" id="modalAdmin">
      <div class="admin-panel-content">
          <div class="admin-header">
              <div class="admin-title">⚙️ Administración de Flota</div>
              <div style="display:flex; gap:8px;">
                  <button class="btn-cancel" onclick="cerrarPanelAdmin()">Cerrar</button>
                  <button class="btn-create" onclick="abrirFormularioAlta()">+ Crear nuevo</button>
              </div>
          </div>
          <div class="admin-table-wrapper">
              <table class="admin-table">
                  <thead><tr><th>ID Operativo</th><th>ID Sensor</th><th>Zona</th><th>Producto</th><th style="text-align:center">Acciones</th></tr></thead>
                  <tbody id="adminTableBody"></tbody>
              </table>
          </div>
          <div style="margin-top:10px; font-size:11px; color:var(--text-sec);">
            * Cambios efectivos inmediatamente (demo).
          </div>
      </div>
</div>

<!-- MODAL FORM -->
<div class="modal-overlay" id="modalForm" style="z-index: 2001;">
      <div class="form-content">
          <div class="modal-header" id="formTitle" style="font-weight:600; margin-bottom:4px;">Alta de Activo</div>
          <input type="hidden" id="editIndex" value="-1">
          
          <div class="section-title" style="margin-top:4px;">Identificación</div>
          <div class="row-2">
            <div class="form-group">
              <label class="form-label">ID Operativo</label>
              <input type="text" id="formId" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">ID Sensor</label>
              <input type="text" id="formSensor" class="form-input">
            </div>
          </div>
          
          <div class="section-title">Ubicación &amp; Producto</div>
          <div class="form-group">
              <label class="form-label">Zona</label>
              <select id="formZone" class="form-select">
                  <option value="Mendoza Norte">Mendoza Norte</option>
                  <option value="Mendoza Sur">Mendoza Sur</option>
                  <option value="Neuquén Este">Neuquén Este</option>
                  <option value="Vaca Muerta">Vaca Muerta</option>
              </select>
          </div>
          <div class="form-group">
            <label class="form-label">Producto</label>
            <input type="text" id="formProduct" class="form-input">
          </div>
          
          <div class="row-2">
            <div class="form-group">
              <label class="form-label">Lat</label>
              <input type="text" id="formLat" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Lng</label>
              <input type="text" id="formLng" class="form-input">
            </div>
          </div>
          
          <div class="section-title">Inicialización</div>
          <div class="row-2">
            <div class="form-group">
              <label class="form-label">Cap (L)</label>
              <input type="number" id="formCap" class="form-input" value="400">
            </div>
            <div class="form-group">
              <label class="form-label">Nivel (L)</label>
              <input type="number" id="formLitros" class="form-input" value="0">
            </div>
          </div>
          
          <div class="modal-actions">
              <button class="btn-cancel" onclick="cerrarFormulario()">Volver</button>
              <button class="btn-save" onclick="guardarDatos()">Guardar</button>
          </div>
      </div>
</div>

<?php
// Carga el pie de página común
require __DIR__ . '/partials/footer.php';
?>