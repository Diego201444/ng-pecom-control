<?php
header('Content-Type: application/json; charset=utf-8');
session_start();

// ======================================
// CARGA DE MÓDULOS
// ======================================
require_once __DIR__ . '/api/db.php';
require_once __DIR__ . '/api/patines.php';
require_once __DIR__ . '/api/telemetria.php';
require_once __DIR__ . '/api/eventos.php';


// ======================================
// ACCIONES QUE NO REQUIEREN LOGIN
// (para IoT o pruebas)
// ======================================
$public_actions = [
    'telemetria_guardar'
];

$action = $_GET['action'] ?? '';


// ======================================
// CONTROL DE SESIÓN
// ======================================
if (!in_array($action, $public_actions)) {
    if (!isset($_SESSION['user'])) {
        json_response(['error' => 'No autorizado'], 401);
    }
}


// ======================================
// ROUTER PRINCIPAL
// ======================================
try {

    switch ($action) {

        // ---------------- PATINES ----------------
        case 'patines_listar':
            api_patines_listar();
            break;

        case 'patin_guardar':
            api_patin_guardar();
            break;

        case 'patin_eliminar':
            api_patin_eliminar();
            break;


        // ---------------- TELEMETRÍA ----------------
        case 'telemetria_listar':
            api_telemetria_listar();
            break;

        case 'telemetria_guardar':
            api_telemetria_guardar();
            break;


        // ---------------- EVENTOS / AUDITORÍA ----------------
        case 'eventos_listar':
            api_eventos_listar();
            break;


        // ---------------- DEFAULT ----------------
        default:
            json_response(['error' => 'acción no válida'], 400);
    }


} catch (Throwable $e) {

    // LOG DE ERRORES
    log_event('error', $e->getMessage(), [
        'accion' => $action
    ]);

    json_response([
        'error' => 'Error interno',
        'detail' => $e->getMessage()
    ], 500);
}
