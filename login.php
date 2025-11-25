<?php
session_start();
require_once __DIR__ . '/api/db.php';

$dbPath = __DIR__ . '/data/pecom.db';

// SI YA ESTÁS LOGUEADO → IR A LA APP DIRECTO
if (isset($_SESSION['user'])) {
    header("Location: index.php");
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['user'] ?? '');
    $pass = $_POST['pass'] ?? '';

    if ($user === '' || $pass === '') {
        $error = "Usuario y contraseña son obligatorios.";
    } else {
        try {
            // Abrir DB
            $pdo = new PDO("sqlite:" . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Buscar usuario
            $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE user = :user AND activo = 1");
            $stmt->execute([':user' => $user]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            // Validar contraseña
            if ($row && password_verify($pass, $row['pass'])) {

                // LOGIN OK → crear sesión
                $_SESSION['user'] = $row['user'];
                $_SESSION['rol']  = $row['rol'];

                // Registrar evento
                log_event('login', 'Inicio de sesión correcto', [
                    'usuario' => $row['user']
                ]);

                header("Location: index.php");
                exit;

            } else {
                $error = "Usuario o contraseña incorrectos.";

                // Registrar intento fallido
                log_event('login_fail', 'Intento fallido para usuario: ' . $user, [
                    'usuario' => $user
                ]);
            }

        } catch (Exception $e) {
            $error = "Error de conexión: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Login NG Control</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display:flex;
            height:100vh;
            justify-content:center;
            align-items:center;
            background:#0f172a;
            margin:0;
        }
        .login {
            background:#fff;
            border-radius:12px;
            padding:32px 28px;
            width:320px;
            box-shadow:0 10px 30px rgba(15,23,42,.4);
        }
        h3 {
            margin-top:0;
            margin-bottom:16px;
            color:#0f172a;
            font-size:20px;
            font-weight:700;
        }
        label {
            display:block;
            font-size:12px;
            color:#475569;
            margin-top:8px;
        }
        input {
            width:100%;
            margin-top:4px;
            padding:9px 10px;
            border-radius:8px;
            border:1px solid #cbd5e1;
            font-size:14px;
            outline:none;
        }
        input:focus {
            border-color:#0284c7;
        }
        button {
            width:100%;
            margin-top:18px;
            padding:10px;
            border-radius:8px;
            border:none;
            background:#0ea5e9;
            color:#fff;
            font-weight:600;
            cursor:pointer;
            font-size:14px;
        }
        button:hover {
            background:#0284c7;
        }
        .error {
            color:#b91c1c;
            font-size:12px;
            margin-bottom:8px;
            background:#fee2e2;
            padding:6px;
            border-radius:6px;
            border:1px solid #fecaca;
        }
        .hint {
            font-size:11px;
            color:#94a3b8;
            margin-top:10px;
            text-align:center;
        }
    </style>
</head>
<body>
<div class="login">
    <h3>Ingreso al Panel</h3>

    <?php if ($error): ?>
        <div class="error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="post">
        <label for="user">Usuario</label>
        <input type="text" name="user" id="user" autocomplete="username">

        <label for="pass">Contraseña</label>
        <input type="password" name="pass" id="pass" autocomplete="current-password">

        <button type="submit">Ingresar</button>

        <div class="hint">
            Usuario inicial: <b>admin</b><br>
            Contraseña inicial: <b>ngsat123</b>
        </div>
    </form>
</div>
</body>
</html>
