<?php
require_once __DIR__ . '/db.php';

// Listar telemetría de un patín
function api_telemetria_listar(): void {
    $db     = get_db();
    $codigo = $_GET['codigo'] ?? '';
    if ($codigo === '') {
        json_response(['error' => 'Falta codigo de patín'], 400);
    }

    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

    $stmt = $db->prepare("
        SELECT *
        FROM telemetria
        WHERE patin_codigo = :codigo
        ORDER BY fecha_hora DESC
        LIMIT :limit
    ");
    $stmt->bindValue(':codigo', $codigo, PDO::PARAM_STR);
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_response($rows);
}

// Guardar una lectura de telemetría
function api_telemetria_guardar(): void {
    $db   = get_db();
    $body = get_json_body();

    $codigo = trim($body['codigo'] ?? '');
    $fecha  = $body['fecha_hora'] ?? date('c');

    if ($codigo === '') {
        json_response(['error' => 'Falta codigo de patín'], 400);
    }

    $litros = $body['litros']      ?? null;
    $batt   = $body['bateria_v']   ?? null;
    $temp   = $body['temperatura'] ?? null;
    $origen = $body['origen']      ?? 'sensor';

    // Validaciones mínimas
    if ($litros !== null && $litros < 0) {
        json_response(['error' => 'Litros negativos no válidos'], 400);
    }

    // Insertar en tabla de telemetría
    $stmt = $db->prepare("
        INSERT INTO telemetria (
          patin_codigo, fecha_hora, litros, bateria_v, temperatura, origen
        ) VALUES (
          :patin_codigo, :fecha_hora, :litros, :bateria_v, :temperatura, :origen
        )
    ");

    $stmt->execute([
        ':patin_codigo' => $codigo,
        ':fecha_hora'   => $fecha,
        ':litros'       => $litros,
        ':bateria_v'    => $batt,
        ':temperatura'  => $temp,
        ':origen'       => $origen,
    ]);

    // Actualizar estado actual del patín (litros / batería)
    if ($litros !== null || $batt !== null) {
        $update = $db->prepare("
            UPDATE patines
            SET
              litros_actuales = COALESCE(:litros, litros_actuales),
              bateria_v       = COALESCE(:bateria_v, bateria_v)
            WHERE codigo = :codigo
        ");
        $update->execute([
            ':litros'     => $litros,
            ':bateria_v'  => $batt,
            ':codigo'     => $codigo,
        ]);
    }

    // Log del evento
    $det = "Telemetría recibida para {$codigo}: ";
    if ($litros !== null) $det .= "{$litros} L ";
    if ($batt   !== null) $det .= "({$batt} V)";

    log_event('telemetria_guardar', trim($det), [
        'patin_codigo' => $codigo,
        'accion'       => 'telemetria'
    ]);

    json_response(['success' => true]);
}
