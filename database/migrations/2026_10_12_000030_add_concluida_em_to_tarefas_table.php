<?php

use App\Support\StatusTarefa;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Data real de conclusão da tarefa. Antes, as métricas de "concluídas no período"
 * usavam o prazo da tarefa no lugar da data em que ela foi concluída.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tarefas') || Schema::hasColumn('tarefas', 'concluida_em')) {
            return;
        }

        Schema::table('tarefas', function (Blueprint $table): void {
            $table->dateTime('concluida_em')->nullable();
            $table->index('concluida_em');
        });

        if (! Schema::hasColumn('tarefas', 'em_historico') || ! Schema::hasColumn('tarefas', 'progresso')) {
            return;
        }

        // Tarefas já concluídas: sem a data real, usa o prazo (comportamento anterior).
        DB::table('tarefas')
            ->whereRaw(StatusTarefa::sqlConcluida())
            ->update(['concluida_em' => DB::raw('COALESCE(prazo, data_prevista_termino, CURRENT_TIMESTAMP)')]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('tarefas') || ! Schema::hasColumn('tarefas', 'concluida_em')) {
            return;
        }

        Schema::table('tarefas', function (Blueprint $table): void {
            $table->dropIndex(['concluida_em']);
            $table->dropColumn('concluida_em');
        });
    }
};
