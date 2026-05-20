<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Projeto;
use App\Models\Tarefa;

$titles = [
    'Definir escopo funcional',
    'Refinar regras de negocio',
    'Estruturar backlog da sprint',
    'Implementar validacoes principais',
    'Ajustar fluxo da interface',
    'Organizar integracao entre modulos',
    'Revisar performance da tela',
    'Preparar homologacao interna',
    'Consolidar ajustes finais',
    'Documentar entrega tecnica',
];

$descriptions = [
    'Detalhar requisitos e limites da entrega',
    'Alinhar comportamento esperado com o time',
    'Priorizar atividades para execucao',
    'Aplicar validacoes de dados e regras de negocio',
    'Melhorar usabilidade e navegacao do fluxo',
    'Garantir comunicacao correta entre servicos',
    'Corrigir gargalos e melhorar tempo de resposta',
    'Validar cenarios principais com equipe interna',
    'Concluir pendencias e estabilizar funcionalidade',
    'Registrar decisoes tecnicas e operacionais',
];

$projectNames = Projeto::query()->pluck('nome_projeto', 'id_projeto')->all();
$projectCounters = [];

$tasks = Tarefa::query()
    ->where('titulo', 'like', 'Task %')
    ->orWhere('descricao', 'like', 'Generated task for project %')
    ->orderBy('id_projeto')
    ->orderBy('id_tarefa')
    ->get();

$updated = 0;

foreach ($tasks as $task) {
    $projectId = (int) ($task->id_projeto ?? 0);
    $projectName = $projectNames[$projectId] ?? ('Projeto ' . $projectId);

    $projectCounters[$projectId] = ($projectCounters[$projectId] ?? 0) + 1;
    $step = $projectCounters[$projectId];
    $index = ($step - 1) % count($titles);

    $task->update([
        'titulo' => $titles[$index] . ' - ' . $projectName . ' (Etapa ' . $step . ')',
        'descricao' => $descriptions[$index] . ' no projeto ' . $projectName . '.',
    ]);

    $updated++;
}

echo "Tarefas atualizadas: {$updated}" . PHP_EOL;
