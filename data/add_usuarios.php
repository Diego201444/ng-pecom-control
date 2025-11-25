<?php
// add_usuarios.php
$dbPath = __DIR__ . '/pecom.db';

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1) Crear tabla usuarios
    $sql = "
    CREATE TABLE IF NOT EXISTS usuarios (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        user   TEXT NOT NULL UNIQUE,
        pass   TEXT NOT NULL,   -- hash
        rol    TEXT NOT NULL,   -- 'admin', 'operador', etc.
        activo INTEGER NOT NULL DEFAULT 1
    );
    ";
    $pdo->exec($sql);

    // 2) Ver si ya hay usuarios
    $count = (int)$pdo->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();

    if ($count === 0) {
        // Crear usuario admin inicial
        $user = 'admin';
        $plainPass = 'ngsat123'; // contraseña inicial
        $hash = password_hash($plainPass, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            INSERT INTO usuarios (user, pass, rol, activo)
            VALUES (:user, :pass, :rol, 1)
        ");
        $stmt->execute([
            ':user' => $user,
            ':pass' => $hash,
            ':rol'  => 'admin'
        ]);

        echo "Tabla usuarios creada y usuario admin inicial generado (admin / ngsat123)";
    } else {
        echo "Tabla usuarios OK. Ya hay usuarios cargados (no se modificó nada).";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
