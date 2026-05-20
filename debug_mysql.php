<?php
$email = $argv[1] ?? 'ana@email.com';
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=tcc;charset=utf8mb4', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->prepare('SELECT email, senha, nivel_acesso FROM senha WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($row ?: ['found' => false], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
