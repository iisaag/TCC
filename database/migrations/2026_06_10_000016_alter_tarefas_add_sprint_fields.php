<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('tarefas')) {
            return;
        }

        Schema::table('tarefas', function (Blueprint $table): void {
            if (!Schema::hasColumn('tarefas', 'id_sprint')) {
                $table->unsignedInteger('id_sprint')->nullable()->after('id_projeto');
                $table->foreign('id_sprint')
                    ->references('id_sprint')
                    ->on('sprints')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('tarefas', 'em_historico')) {
                $table->boolean('em_historico')->default(false)->after('status_task');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('tarefas')) {
            return;
        }

        Schema::table('tarefas', function (Blueprint $table): void {
            if (Schema::hasColumn('tarefas', 'id_sprint')) {
                $table->dropForeign(['id_sprint']);
                $table->dropColumn('id_sprint');
            }

            if (Schema::hasColumn('tarefas', 'em_historico')) {
                $table->dropColumn('em_historico');
            }
        });
    }
};
