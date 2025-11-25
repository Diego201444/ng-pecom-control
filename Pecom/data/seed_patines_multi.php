<?php
// seed_patines_multi.php (en C:\xampp\htdocs\Pecom\data)

$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Limpiamos tabla por si ya había algo
    $pdo->exec("DELETE FROM patines");

    $patines = [
        [
            'codigo'           => '001',
            'sensor'           => 'SEN-001',
            'zona'             => 'Mendoza Norte',
            'latitud'          => -32.90,
            'longitud'         => -68.85,
            'capacidad_litros' => 5000,
            'litros_actuales'  => 3200,
            'tipo_producto'    => 'Gasoil',
            'bateria_v'        => 12.6,
        ],
        [
            'codigo'           => '002',
            'sensor'           => 'SEN-002',
            'zona'             => 'Mendoza Sur',
            'latitud'          => -34.90,
            'longitud'         => -68.80,
            'capacidad_litros' => 2000,
            'litros_actuales'  => 450,   // bajo
            'tipo_producto'    => 'Antiincrustante A',
            'bateria_v'        => 12.4,
        ],
        [
            'codigo'           => '003',
            'sensor'           => 'SEN-003',
            'zona'             => 'Vaca Muerta',
            'latitud'          => -38.65,
            'longitud'         => -69.98,
            'capacidad_litros' => 3000,
            'litros_actuales'  => 2600,  // alto
            'tipo_producto'    => 'Bactericida',
            'bateria_v'        => 12.7,
        ],
        [
            'codigo'           => '004',
            'sensor'           => 'SEN-004',
            'zona'             => 'Neuquén Este',
            'latitud'          => -38.95,
            'longitud'         => -68.05,
            'capacidad_litros' => 4000,
            'litros_actuales'  => 1800,
            'tipo_producto'    => 'Inhibidor de Corrosión',
            'bateria_v'        => 12.3,
        ],
    ];

    $stmt = $pdo->prepare("
        INSERT INTO patines (
          codigo, sensor, zona, latitud, longitud,
          capacidad_litros, litros_actuales, tipo_producto,
          bateria_v, fecha_alta, activo
        )
        VALUES (
          :codigo, :sensor, :zona, :latitud, :longitud,
          :capacidad_litros, :litros_actuales, :tipo_producto,
          :bateria_v, :fecha_alta, 1
        )
    ");

    foreach ($patines as $p) {
        $stmt->execute([
            ':codigo'           => $p['codigo'],
            ':sensor'           => $p['sensor'],
            ':zona'             => $p['zona'],
            ':latitud'          => $p['latitud'],
            ':longitud'         => $p['longitud'],
            ':capacidad_litros' => $p['capacidad_litros'],
            ':litros_actuales'  => $p['litros_actuales'],
            ':tipo_producto'    => $p['tipo_producto'],
            ':bateria_v'        => $p['bateria_v'],
            ':fecha_alta'       => date('c'),
        ]);
    }

    echo "Patines de prueba creados correctamente";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
