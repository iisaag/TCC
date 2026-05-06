<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('usuarios')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            if (! Schema::hasColumn('usuarios', 'telefone')) {
                $table->string('telefone', 30)->nullable()->after('email');
            }

            if (! Schema::hasColumn('usuarios', 'localizacao')) {
                $table->string('localizacao', 120)->nullable()->after('telefone');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('usuarios')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            if (Schema::hasColumn('usuarios', 'localizacao')) {
                $table->dropColumn('localizacao');
            }

            if (Schema::hasColumn('usuarios', 'telefone')) {
                $table->dropColumn('telefone');
            }
        });
    }
};
