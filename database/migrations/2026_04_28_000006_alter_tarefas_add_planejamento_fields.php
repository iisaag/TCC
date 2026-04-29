<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tarefas', function (Blueprint $table): void {
            if (!Schema::hasColumn('tarefas', 'tipo_task')) {
                $table->string('tipo_task', 20)->nullable()->after('prioridade_task');
            }

            if (!Schema::hasColumn('tarefas', 'data_inicio')) {
                $table->date('data_inicio')->nullable()->after('tipo_task');
            }

            if (!Schema::hasColumn('tarefas', 'data_prevista_termino')) {
                $table->date('data_prevista_termino')->nullable()->after('data_inicio');
            }

            if (!Schema::hasColumn('tarefas', 'progresso')) {
                $table->unsignedTinyInteger('progresso')->default(0)->after('data_prevista_termino');
            }

            if (!Schema::hasColumn('tarefas', 'bloqueada')) {
                $table->boolean('bloqueada')->default(false)->after('progresso');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tarefas', function (Blueprint $table): void {
            $columns = [
                'tipo_task',
                'data_inicio',
                'data_prevista_termino',
                'progresso',
                'bloqueada',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('tarefas', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
