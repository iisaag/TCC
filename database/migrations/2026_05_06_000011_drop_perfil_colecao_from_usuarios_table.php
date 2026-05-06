<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('usuarios') || ! Schema::hasColumn('usuarios', 'perfil_colecao')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            $table->dropColumn('perfil_colecao');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('usuarios') || Schema::hasColumn('usuarios', 'perfil_colecao')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            $table->text('perfil_colecao')->nullable()->after('perfil_sobre');
        });
    }
};
