<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('projetos') || ! Schema::hasTable('usuarios')) {
            return;
        }

        Schema::table('projetos', function (Blueprint $table) {
            if (! Schema::hasColumn('projetos', 'id_responsavel')) {
                $table->integer('id_responsavel')->nullable()->after('prioridade_proj');
                $table->foreign('id_responsavel')
                    ->references('id_usuario')
                    ->on('usuarios')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('projetos') || ! Schema::hasColumn('projetos', 'id_responsavel')) {
            return;
        }

        Schema::table('projetos', function (Blueprint $table) {
            $table->dropForeign(['id_responsavel']);
            $table->dropColumn('id_responsavel');
        });
    }
};