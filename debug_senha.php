<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Senha;

$registro = Senha::find('ana@email.com');
if ($registro === null) {
    echo json_encode(['found' => false]);
    exit(0);
}

// Convert model to array safely
$data = $registro->toArray();
echo json_encode(['found' => true, 'registro' => $data], JSON_PRETTY_PRINT);
