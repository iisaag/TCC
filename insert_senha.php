<?php
$email = $argv[1] ?? 'ana@email.com';
$senha = $argv[2] ?? '0809';
$nivel = $argv[3] ?? 'total';
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=tcc;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->prepare('INSERT INTO senha (email, senha, nivel_acesso) VALUES (?, ?, ?)');
    $stmt->execute([$email, $senha, $nivel]);
    echo json_encode(['ok' => true, 'email' => $email, 'senha' => $senha, 'nivel' => $nivel], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
