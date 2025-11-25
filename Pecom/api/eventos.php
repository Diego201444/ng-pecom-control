<?php
require_once __DIR__ . '/db.php';

/**
 * Listar eventos de auditoría
 * Parámetros opcionales por GET:
 *   limit         → máximo de registros (default 100)
 *   tipo          → filtrar por tipo (login, patin_guardar, telemetria_guardar, error, etc.)
 *   usuario       → filtrar por usuario
 *   patin_codigo  → filtrar por patín
 */
function api_eventos_listar(): void {
    $db = get_db();

    $limit        = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 100;
    $tipo         = $_GET['tipo']         ?? null;
    $usuario      = $_GET['usuario']      ?? null;
    $patinCodigo  = $_GET['patin_codigo'] ?? null;

    $where  = [];
    $params = [];

    if ($tipo !== null && $tipo !== '') {
        $where[]           = "tipo = :tipo";
        $params[':tipo']   = $tipo;
    }
    if ($usuario !== null && $usuario !== '') {
        $where[]             = "usuario = :usuario";
        $params[':usuario']  = $usuario;
    }
    if ($patinCodigo !== null && $patinCodigo !== '') {
        $where[]                  = "patin_codigo = :patin_codigo";
        $params[':patin_codigo']  = $patinCodigo;
    }

    $sql = "SELECT * FROM eventos";
    if ($where) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY fecha_hora DESC LIMIT :limit";

    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);

    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response($rows);
}
