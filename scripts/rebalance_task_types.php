<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Tarefa;

$updated = 0;

$tasks = Tarefa::query()
    ->whereNull('tipo_task')
    ->orWhereNotIn('tipo_task', ['FRONT', 'BACK', 'FULLSTACK'])
    ->orderBy('id_tarefa')
    ->get();

foreach ($tasks as $task) {
    $resto = ((int) $task->id_tarefa) % 3;

    $tipo = $resto === 0 ? 'BACK' : ($resto === 1 ? 'FRONT' : 'FULLSTACK');

    $task->update(['tipo_task' => $tipo]);
    $updated++;
}

echo "Tarefas ajustadas: {$updated}" . PHP_EOL;
