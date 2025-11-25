<?php
session_start();
require_once __DIR__ . '/api/db.php';

if (isset($_SESSION['user'])) {
    log_event('logout', 'Cierre de sesión', [
        'usuario' => $_SESSION['user']
    ]);
}

session_destroy();
header("Location: login.php");
exit;
