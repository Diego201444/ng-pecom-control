<?php
$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("
        INSERT INTO patines (
            codigo, descripcion, latitud, longitud,
            capacidad_litros, tipo_producto, fecha_alta, activo
        )
        VALUES (
            :codigo, :descripcion, :latitud, :longitud,
            :capacidad_litros, :tipo_producto, :fecha_alta, 1
        )
    ");

    $stmt->execute([
        ':codigo' => '001',
        ':descripcion' => 'Patín demo 001',
        ':latitud' => -34.60,
        ':longitud' => -58.38,
        ':capacidad_litros' => 5000,
        ':tipo_producto' => 'Gasoil',
        ':fecha_alta' => date('c'),
    ]);

    echo "Patín 001 creado correctamente";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
