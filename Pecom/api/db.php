<?php

// Conexión única a SQLite
function get_db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dbPath = __DIR__ . '/../data/pecom.db';
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }
    return $pdo;
}

// Respuesta JSON estándar
function json_response($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Leer cuerpo JSON de la request
function get_json_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Registrar evento en la tabla eventos
 *
 * $tipo      → login, logout, patin_guardar, telemetria_guardar, error, etc.
 * $detalle   → texto libre
 * $extra     → ['usuario' => ..., 'patin_codigo' => ..., 'accion' => ..., 'fecha_hora' => ...]
 */
function log_event(string $tipo, string $detalle = '', array $extra = []): void {
    try {
        $db = get_db();

        $usuario = $extra['usuario']      ?? ($_SESSION['user'] ?? null);
        $patin   = $extra['patin_codigo'] ?? null;
        $accion  = $extra['accion']       ?? null;
        $fecha   = $extra['fecha_hora']   ?? date('c');

        $stmt = $db->prepare("
            INSERT INTO eventos (tipo, usuario, patin_codigo, accion, detalle, fecha_hora)
            VALUES (:tipo, :usuario, :patin, :accion, :detalle, :fecha_hora)
        ");

        $stmt->execute([
            ':tipo'       => $tipo,
            ':usuario'    => $usuario,
            ':patin'      => $patin,
            ':accion'     => $accion,
            ':detalle'    => $detalle,
            ':fecha_hora' => $fecha,
        ]);

    } catch (Throwable $e) {
        // No romper por fallo de logging
        error_log("Error en log_event: " . $e->getMessage());
    }
}
