<?php
require_once __DIR__ . '/db.php';

// Listar patines activos
function api_patines_listar(): void {
    $db = get_db();
    $stmt = $db->query("SELECT * FROM patines WHERE activo = 1 ORDER BY codigo");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_response($rows);
}

/**
 * Alta / edición de patín.
 * Si existe codigo → UPDATE
 * Si no existe → INSERT
 */
function api_patin_guardar(): void {
    $db   = get_db();
    $body = get_json_body();

    $codigo = trim($body['id'] ?? '');
    if ($codigo === '') {
        json_response(['error' => 'Falta id/codigo de patín'], 400);
    }

    $sensor           = $body['sensor']      ?? null;
    $zona             = $body['zona']        ?? null;
    $latitud          = $body['lat']         ?? null;
    $longitud         = $body['lng']         ?? null;
    $capacidad_litros = $body['cap']         ?? null;
    $litros_actuales  = $body['litros']      ?? null;
    $tipo_producto    = $body['prod']        ?? null;
    $bateria_v        = $body['bateria_v']   ?? null;

    // ¿Existe ya ese código?
    $stmt = $db->prepare("SELECT id FROM patines WHERE codigo = :codigo");
    $stmt->execute([':codigo' => $codigo]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        // UPDATE
        $stmt = $db->prepare("
            UPDATE patines SET
              sensor = :sensor,
              zona = :zona,
              latitud = :latitud,
              longitud = :longitud,
              capacidad_litros = :capacidad_litros,
              litros_actuales = :litros_actuales,
              tipo_producto = :tipo_producto,
              bateria_v = :bateria_v
            WHERE codigo = :codigo
        ");
    } else {
        // INSERT
        $stmt = $db->prepare("
            INSERT INTO patines (
              codigo, sensor, zona, latitud, longitud,
              capacidad_litros, litros_actuales, tipo_producto,
              bateria_v, fecha_alta, activo
            ) VALUES (
              :codigo, :sensor, :zona, :latitud, :longitud,
              :capacidad_litros, :litros_actuales, :tipo_producto,
              :bateria_v, :fecha_alta, 1
            )
        ");
    }

    $params = [
        ':codigo'           => $codigo,
        ':sensor'           => $sensor,
        ':zona'             => $zona,
        ':latitud'          => $latitud,
        ':longitud'         => $longitud,
        ':capacidad_litros' => $capacidad_litros,
        ':litros_actuales'  => $litros_actuales,
        ':tipo_producto'    => $tipo_producto,
        ':bateria_v'        => $bateria_v,
    ];

    if (!$row) {
        $params[':fecha_alta'] = date('c');
    }

    $stmt->execute($params);

    // Log de evento
    $accion = $row ? 'edicion' : 'alta';
    log_event('patin_guardar', "Patín {$codigo} {$accion}", [
        'patin_codigo' => $codigo,
        'accion'       => $accion
    ]);

    json_response(['success' => true]);
}

// Eliminar patín
function api_patin_eliminar(): void {
    $db   = get_db();
    $body = get_json_body();

    $codigo = trim($body['id'] ?? '');
    if ($codigo === '') {
        json_response(['error' => 'Falta id/codigo de patín'], 400);
    }

    $stmt = $db->prepare("DELETE FROM patines WHERE codigo = :codigo");
    $stmt->execute([':codigo' => $codigo]);

    log_event('patin_eliminar', "Patín {$codigo} eliminado", [
        'patin_codigo' => $codigo,
        'accion'       => 'eliminacion'
    ]);

    json_response(['success' => true]);
}
