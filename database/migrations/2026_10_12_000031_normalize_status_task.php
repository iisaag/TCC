<?php

use App\Support\StatusTarefa;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * O mesmo status estava gravado de vários jeitos ("To Do", "TO_DO", "Doing",
 * "Em andamento"...), e o dashboard só reconhecia parte deles.
 * Converte os apelidos conhecidos para o código canônico.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tarefas')) {
            return;
        }

        DB::table('tarefas')
            ->whereNotNull('status_task')
            ->select(['id_tarefa', 'status_task'])
            ->orderBy('id_tarefa')
            ->each(function ($tarefa): void {
                $canonico = StatusTarefa::canonico($tarefa->status_task);

                if ($canonico !== $tarefa->status_task) {
                    DB::table('tarefas')->where('id_tarefa', $tarefa->id_tarefa)->update(['status_task' => $canonico]);
                }
            });
    }

    public function down(): void
    {
        // Os valores antigos eram inconsistentes; não há como restaurá-los.
    }
};
