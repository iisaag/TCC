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
            if (! Schema::hasColumn('usuarios', 'perfil_tags')) {
                $table->text('perfil_tags')->nullable()->after('localizacao');
            }

            if (! Schema::hasColumn('usuarios', 'perfil_sobre')) {
                $table->text('perfil_sobre')->nullable()->after('perfil_tags');
            }

            if (! Schema::hasColumn('usuarios', 'perfil_colecao')) {
                $table->text('perfil_colecao')->nullable()->after('perfil_sobre');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('usuarios')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            $columns = [];

            if (Schema::hasColumn('usuarios', 'perfil_colecao')) {
                $columns[] = 'perfil_colecao';
            }

            if (Schema::hasColumn('usuarios', 'perfil_sobre')) {
                $columns[] = 'perfil_sobre';
            }

            if (Schema::hasColumn('usuarios', 'perfil_tags')) {
                $columns[] = 'perfil_tags';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
