<?php
// scripts/import_sql.php
// Executa o conteúdo de database/script.sql usando a conexão do Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$sqlFile = __DIR__ . '/../database/script.sql';
if (!file_exists($sqlFile)) {
    echo "Arquivo não encontrado: $sqlFile\n";
    exit(1);
}

$sql = file_get_contents($sqlFile);
try {
    DB::unprepared($sql);
    echo "Importação concluída com sucesso.\n";
} catch (Exception $e) {
    echo "Erro na importação: " . $e->getMessage() . "\n";
    exit(1);
}
