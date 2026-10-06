<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('usuarios')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            if (!Schema::hasColumn('usuarios', 'cor_banner')) {
                $table->string('cor_banner', 20)->nullable()->after('foto_perfil');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('usuarios')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            if (Schema::hasColumn('usuarios', 'cor_banner')) {
                $table->dropColumn('cor_banner');
            }
        });
    }
};
