<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('equipes')) {
            return;
        }

        Schema::table('equipes', function (Blueprint $table): void {
            if (! Schema::hasColumn('equipes', 'id_lider')) {
                $table->integer('id_lider')->nullable()->after('tipo');
                $table->foreign('id_lider')
                    ->references('id_usuario')
                    ->on('usuarios')
                    ->onDelete('set null')
                    ->onUpdate('cascade');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('equipes') || ! Schema::hasColumn('equipes', 'id_lider')) {
            return;
        }

        Schema::table('equipes', function (Blueprint $table): void {
            $table->dropForeign(['id_lider']);
            $table->dropColumn('id_lider');
        });
    }
};
