<?php
// add_eventos.php
$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "
    CREATE TABLE IF NOT EXISTS eventos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo         TEXT NOT NULL,        -- login, logout, patin_guardar, telemetria_guardar, error, etc.
      usuario      TEXT,                 -- usuario de sesión si lo hay
      patin_codigo TEXT,                 -- opcional (para eventos de patines/telemetría)
      accion       TEXT,                 -- extra (ej. 'alta', 'edicion')
      detalle      TEXT,                 -- texto libre
      fecha_hora   TEXT NOT NULL         -- ISO8601
    );

    CREATE INDEX IF NOT EXISTS idx_eventos_fecha
      ON eventos(fecha_hora);

    CREATE INDEX IF NOT EXISTS idx_eventos_tipo
      ON eventos(tipo);
    ";

    $pdo->exec($sql);

    echo "Tabla eventos creada/actualizada OK";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
