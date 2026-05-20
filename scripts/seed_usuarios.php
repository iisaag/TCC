<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$now = date('Y-m-d H:i:s');
$users = [
    ['nome' => 'Ana Silva', 'email' => 'ana.silva@example.com', 'telefone' => null, 'localizacao' => null, 'perfil_tags' => null, 'perfil_sobre' => null, 'foto_perfil' => null, 'cargo' => null, 'nivel' => 1, 'status_atual' => 'ativo', 'data_criacao' => $now],
    ['nome' => 'Bruno Costa', 'email' => 'bruno.costa@example.com', 'telefone' => null, 'localizacao' => null, 'perfil_tags' => null, 'perfil_sobre' => null, 'foto_perfil' => null, 'cargo' => null, 'nivel' => 2, 'status_atual' => 'ativo', 'data_criacao' => $now],
    ['nome' => 'Carla Pereira', 'email' => 'carla.pereira@example.com', 'telefone' => null, 'localizacao' => null, 'perfil_tags' => null, 'perfil_sobre' => null, 'foto_perfil' => null, 'cargo' => null, 'nivel' => 1, 'status_atual' => 'inativo', 'data_criacao' => $now],
    ['nome' => 'Daniel Souza', 'email' => 'daniel.souza@example.com', 'telefone' => null, 'localizacao' => null, 'perfil_tags' => null, 'perfil_sobre' => null, 'foto_perfil' => null, 'cargo' => null, 'nivel' => 3, 'status_atual' => 'ativo', 'data_criacao' => $now],
    ['nome' => 'Eva Martins', 'email' => 'eva.martins@example.com', 'telefone' => null, 'localizacao' => null, 'perfil_tags' => null, 'perfil_sobre' => null, 'foto_perfil' => null, 'cargo' => null, 'nivel' => 2, 'status_atual' => 'ativo', 'data_criacao' => $now],
];

try {
    foreach ($users as $u) {
        DB::table('usuarios')->insert($u);
    }
    echo "Inserted " . count($users) . " users\n";
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . PHP_EOL;
}
