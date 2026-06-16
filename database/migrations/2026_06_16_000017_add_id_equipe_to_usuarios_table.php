<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('usuarios') || ! Schema::hasTable('equipes')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            if (! Schema::hasColumn('usuarios', 'id_equipe')) {
                $table->integer('id_equipe')->nullable()->after('status_atual');
                $table->foreign('id_equipe')
                    ->references('id_equipe')
                    ->on('equipes')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('usuarios') || ! Schema::hasColumn('usuarios', 'id_equipe')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            $table->dropForeign(['id_equipe']);
            $table->dropColumn('id_equipe');
        });
    }
};