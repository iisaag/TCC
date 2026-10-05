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
            if (!Schema::hasColumn('tarefas', 'id_coluna')) {
                $table->unsignedInteger('id_coluna')->nullable()->after('status_task');
                $table->foreign('id_coluna')
                    ->references('id_coluna')
                    ->on('board_colunas')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('tarefas')) {
            return;
        }

        Schema::table('tarefas', function (Blueprint $table): void {
            if (Schema::hasColumn('tarefas', 'id_coluna')) {
                $table->dropForeign(['id_coluna']);
                $table->dropColumn('id_coluna');
            }
        });
    }
};
