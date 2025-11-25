<?php
// seed_telemetria.php

$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Borramos telemetría vieja
    $pdo->exec("DELETE FROM telemetria");

    // Tomamos los patines actuales
    $patines = $pdo->query("SELECT codigo, capacidad_litros, litros_actuales FROM patines")->fetchAll(PDO::FETCH_ASSOC);

    $insert = $pdo->prepare("
        INSERT INTO telemetria (
          patin_codigo, fecha_hora, litros, bateria_v, temperatura, origen
        ) VALUES (
          :patin_codigo, :fecha_hora, :litros, :bateria_v, :temperatura, :origen
        )
    ");

    foreach ($patines as $p) {
        $codigo = $p['codigo'];
        $cap    = (float)$p['capacidad_litros'];
        $baseL  = (float)$p['litros_actuales'];

        // 24 lecturas, cada 1 hora hacia atrás
        for ($i = 0; $i < 24; $i++) {
            $ts = new DateTime();
            $ts->modify("-{$i} hour");

            // simulamos pequeñas variaciones alrededor de litros_actuales
            $litros = max(0, min($cap, $baseL + rand(-200, 200)));
            $batt   = 12.2 + (rand(0, 40) / 100); // 12.2 - 12.6 V
            $temp   = 15 + rand(0, 150) / 10;     // 15–30 °C

            $insert->execute([
                ':patin_codigo' => $codigo,
                ':fecha_hora'   => $ts->format(DateTime::ATOM),
                ':litros'       => $litros,
                ':bateria_v'    => $batt,
                ':temperatura'  => $temp,
                ':origen'       => 'seed'
            ]);
        }
    }

    echo "Telemetría de prueba generada OK";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
