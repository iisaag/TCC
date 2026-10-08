<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private const DEFAULT_COLUMNS = [
        ['nome' => 'A Fazer', 'status' => 'TO_DO', 'progresso' => 0, 'ordem' => 1, 'arquiva_ao_concluir' => false],
        ['nome' => 'Em andamento', 'status' => 'DOING', 'progresso' => 50, 'ordem' => 2, 'arquiva_ao_concluir' => false],
        ['nome' => 'Teste', 'status' => 'TESTE', 'progresso' => 75, 'ordem' => 3, 'arquiva_ao_concluir' => false],
        ['nome' => 'Aprovado', 'status' => 'APROVADO', 'progresso' => 100, 'ordem' => 4, 'arquiva_ao_concluir' => true],
    ];

    public function up(): void
    {
        if (!Schema::hasTable('board_colunas') || !Schema::hasTable('projetos')) {
            return;
        }

        $projetoIds = DB::table('projetos')->pluck('id_projeto');

        foreach ($projetoIds as $idProjeto) {
            $jaTemColunas = DB::table('board_colunas')->where('id_projeto', $idProjeto)->exists();

            if ($jaTemColunas) {
                continue;
            }

            foreach (self::DEFAULT_COLUMNS as $coluna) {
                $idColuna = DB::table('board_colunas')->insertGetId([
                    'id_projeto' => $idProjeto,
                    'nome' => $coluna['nome'],
                    'progresso' => $coluna['progresso'],
                    'ordem' => $coluna['ordem'],
                    'arquiva_ao_concluir' => $coluna['arquiva_ao_concluir'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ], 'id_coluna');

                if (Schema::hasTable('tarefas') && Schema::hasColumn('tarefas', 'id_coluna')) {
                    DB::table('tarefas')
                        ->where('id_projeto', $idProjeto)
                        ->where('status_task', $coluna['status'])
                        ->update(['id_coluna' => $idColuna]);
                }
            }
        }
    }

    public function down(): void
    {
        // Dados seed; sem rollback automatico para nao perder colunas criadas manualmente depois.
    }
};
