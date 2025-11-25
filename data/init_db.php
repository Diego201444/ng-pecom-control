<?php
// init_db.php (dentro de C:\xampp\htdocs\Pecom\data)

$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Creamos tabla patines con todos los campos que usa la UI
    $sql = "
    CREATE TABLE IF NOT EXISTS patines (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo           TEXT NOT NULL UNIQUE,   -- ID visible en la UI (001, 002, etc.)
      sensor           TEXT,                   -- nombre/ID del sensor
      zona             TEXT,                   -- Mendoza Norte, Vaca Muerta, etc.
      latitud          REAL,
      longitud         REAL,
      capacidad_litros REAL,                   -- capacidad total del tanque
      litros_actuales  REAL,                   -- nivel actual del tanque
      tipo_producto    TEXT,                   -- Gasoil, Antiincrustante A, etc.
      bateria_v        REAL,                   -- tensión batería
      fecha_alta       TEXT,
      activo           INTEGER DEFAULT 1
    );
    ";

    $pdo->exec($sql);

    echo 'OK: Base creada en ' . $dbPath;
} catch (PDOException $e) {
    echo 'Error: ' . $e->getMessage();
}
