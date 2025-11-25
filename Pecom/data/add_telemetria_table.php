<?php
// add_telemetria_table.php

$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "
    CREATE TABLE IF NOT EXISTS telemetria (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      patin_codigo  TEXT NOT NULL,      -- coincide con patines.codigo (001, 002, etc.)
      fecha_hora    TEXT NOT NULL,      -- ISO 8601
      litros        REAL,               -- litros medidos
      bateria_v     REAL,               -- tensión batería
      temperatura   REAL,               -- opcional
      origen        TEXT                -- 'sensor', 'manual', etc.
    );

    CREATE INDEX IF NOT EXISTS idx_tel_patin_fecha
      ON telemetria (patin_codigo, fecha_hora);
    ";

    $pdo->exec($sql);

    echo "Tabla telemetria creada/actualizada OK";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
