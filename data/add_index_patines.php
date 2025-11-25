<?php
// add_index_patines.php

$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Creamos el índice si no existe
    $sql = "CREATE INDEX IF NOT EXISTS idx_patines_codigo ON patines(codigo);";
    $pdo->exec($sql);

    echo "Índice idx_patines_codigo creado/ya existente OK en patines(codigo).";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
