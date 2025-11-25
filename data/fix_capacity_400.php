<?php
$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec("UPDATE patines SET capacidad_litros = 400 WHERE capacidad_litros != 400;");

    echo "Capacidades normalizadas a 400L OK.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
