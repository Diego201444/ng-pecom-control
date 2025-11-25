<?php
header('Content-Type: application/json; charset=utf-8');
session_start();

/**
 * CONFIG
 */
const DB_PATH        = __DIR__ . '/data/pecom.db';
const CAP_MAX_LITROS = 400;

/**
 * Helpers
 */
function send_json($data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function get_db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        if (!file_exists(DB_PATH)) {
            send_json(['error' => 'Base de datos no encontrada'], 500);
        }
        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }
    return $pdo;
}

/**
 * Router REST: /api.php/tanques[/ID]
 */
$uri  = $_SERVER['REQUEST_URI'];          // /pecom/1/api.php/tanques/001?x=y
$pos  = strpos($uri, 'api.php');
$path = '';

if ($pos !== false) {
    $path = substr($uri, $pos + strlen('api.php')); // /tanques/001?x=y
}
$path = explode('?', $path, 2)[0];        // /tanques/001
$path = trim($path, '/');                 // tanques/001 o ''
$segments = $path === '' ? [] : explode('/', $path);
$method   = $_SERVER['REQUEST_METHOD'];

// Si no hay segmentos, indicamos uso
if (count($segments) === 0) {
    send_json(['error' => 'Ruta inválida. Use /api.php/tanques'], 400);
}

// Solo manejamos /tanques
if ($segments[0] !== 'tanques') {
    send_json(['error' => 'Recurso no encontrado'], 404);
}

$id = $segments[1] ?? null;

// Requerir login para escrituras (POST/PATCH/DELETE)
if (in_array($method, ['POST','PATCH','DELETE'], true)) {
    if (!isset($_SESSION['user'])) {
        send_json(['error' => 'No autorizado'], 401);
    }
}

/**
 * Funciones de acceso a datos
 * Tabla: patines
 * Columnas: id, codigo, sensor, zona, latitud, longitud,
 *           capacidad_litros, litros_actuales, tipo_producto,
 *           bateria_v, fecha_alta, activo
 */

function row_to_json(array $row): array {
    return [
        'id'     => $row['codigo'],
        'zona'   => $row['zona'],
        'prod'   => $row['tipo_producto'],
        'sensor' => $row['sensor'],
        'cap'    => (float)$row['capacidad_litros'],
        'litros' => (float)$row['litros_actuales'],
        'lat'    => $row['latitud'] !== null ? (float)$row['latitud'] : null,
        'lng'    => $row['longitud'] !== null ? (float)$row['longitud'] : null,
        'bateria_v' => $row['bateria_v'],
        'activo'    => (int)$row['activo'],
    ];
}

function list_tanques() {
    $db = get_db();
    $stmt = $db->query(
        "SELECT id, codigo, sensor, zona, latitud, longitud,
                capacidad_litros, litros_actuales, tipo_producto,
                bateria_v, fecha_alta, activo
         FROM patines
         WHERE activo = 1
         ORDER BY codigo"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = array_map('row_to_json', $rows);
    send_json($out);
}

function get_tanque(string $codigo) {
    $db = get_db();
    $stmt = $db->prepare(
        "SELECT id, codigo, sensor, zona, latitud, longitud,
                capacidad_litros, litros_actuales, tipo_producto,
                bateria_v, fecha_alta, activo
         FROM patines
         WHERE codigo = :codigo"
    );
    $stmt->execute([':codigo' => $codigo]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        send_json(['error' => 'Tanque no encontrado'], 404);
    }
    send_json(row_to_json($row));
}

function create_tanque(array $input) {
    $db = get_db();

    $codigo = trim($input['id'] ?? $input['codigo'] ?? '');
    $zona   = trim($input['zona'] ?? '');
    $prod   = trim($input['prod'] ?? $input['tipo_producto'] ?? '');
    $sensor = trim($input['sensor'] ?? '');
    $cap    = (float)($input['cap'] ?? $input['capacidad_litros'] ?? CAP_MAX_LITROS);
    $litros = (float)($input['litros'] ?? $input['litros_actuales'] ?? 0);
    $lat    = isset($input['lat']) ? (float)$input['lat'] : null;
    $lng    = isset($input['lng']) ? (float)$input['lng'] : null;
    $batt   = isset($input['bateria_v']) ? (float)$input['bateria_v'] : null;

    if ($codigo === '') {
        send_json(['error' => 'Falta id/codigo'], 400);
    }

    // ¿Ya existe?
    $stmt = $db->prepare("SELECT 1 FROM patines WHERE codigo = :c");
    $stmt->execute([':c' => $codigo]);
    if ($stmt->fetch()) {
        send_json(['error' => 'Ya existe un tanque con ese código'], 409);
    }

    $stmt = $db->prepare(
        "INSERT INTO patines
            (codigo, sensor, zona, latitud, longitud,
             capacidad_litros, litros_actuales, tipo_producto,
             bateria_v, fecha_alta, activo)
         VALUES
            (:codigo, :sensor, :zona, :lat, :lng,
             :cap, :litros, :prod,
             :batt, :fecha, 1)"
    );
    $stmt->execute([
        ':codigo' => $codigo,
        ':sensor' => $sensor,
        ':zona'   => $zona,
        ':lat'    => $lat,
        ':lng'    => $lng,
        ':cap'    => $cap,
        ':litros' => $litros,
        ':prod'   => $prod,
        ':batt'   => $batt,
        ':fecha'  => date('c'),
    ]);

    send_json(['ok' => true, 'id' => $codigo], 201);
}

function update_tanque(string $codigo, array $input) {
    $db = get_db();

    // ¿Existe?
    $stmt = $db->prepare("SELECT 1 FROM patines WHERE codigo = :c");
    $stmt->execute([':c' => $codigo]);
    if (!$stmt->fetch()) {
        send_json(['error' => 'Tanque no encontrado'], 404);
    }

    // Mapear campos JSON → columnas reales
    $map = [
        'zona'   => 'zona',
        'prod'   => 'tipo_producto',
        'sensor' => 'sensor',
        'cap'    => 'capacidad_litros',
        'litros' => 'litros_actuales',
        'lat'    => 'latitud',
        'lng'    => 'longitud',
        'bateria_v' => 'bateria_v',
        'activo' => 'activo',
    ];

    $setParts = [];
    $params   = [':codigo' => $codigo];

    foreach ($map as $jsonKey => $col) {
        if (array_key_exists($jsonKey, $input)) {
            $setParts[] = "$col = :$jsonKey";
            $params[":$jsonKey"] = $input[$jsonKey];
        }
    }

    if (empty($setParts)) {
        send_json(['error' => 'Nada para actualizar'], 400);
    }

    $sql = "UPDATE patines SET " . implode(', ', $setParts) . " WHERE codigo = :codigo";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    send_json(['ok' => true]);
}

function delete_tanque(string $codigo) {
    $db = get_db();
    // Baja lógica: activo = 0 (por si querés mantener histórico)
    $stmt = $db->prepare("UPDATE patines SET activo = 0 WHERE codigo = :c");
    $stmt->execute([':c' => $codigo]);
    if ($stmt->rowCount() === 0) {
        send_json(['error' => 'Tanque no encontrado'], 404);
    }
    send_json(['ok' => true]);
}

/**
 * Dispatcher por método
 */
try {
    switch ($method) {
        case 'GET':
            if ($id === null) list_tanques();
            else get_tanque($id);
            break;

        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            if (!is_array($body)) $body = [];
            create_tanque($body);
            break;

        case 'PATCH':
        case 'PUT':
            if ($id === null) {
                send_json(['error' => 'Falta ID en la ruta /tanques/{id}'], 400);
            }
            $body = json_decode(file_get_contents('php://input'), true);
            if (!is_array($body)) $body = [];
            update_tanque($id, $body);
            break;

        case 'DELETE':
            if ($id === null) {
                send_json(['error' => 'Falta ID en la ruta /tanques/{id}'], 400);
            }
            delete_tanque($id);
            break;

        default:
            send_json(['error' => 'Método no permitido'], 405);
    }
} catch (Throwable $e) {
    send_json([
        'error'  => 'Error interno',
        'detail' => $e->getMessage()
    ], 500);
}
