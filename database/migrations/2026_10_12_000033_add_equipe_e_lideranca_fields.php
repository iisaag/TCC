<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * - usuarios_excluidos.id_equipe: funcionário restaurado volta para a mesma equipe.
 * - senha.admin_por_lideranca: marca quem virou administrador só por ser líder de equipe,
 *   para devolver o nível "usuario" quando deixar de liderar (sem afetar quem já era admin).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('usuarios_excluidos') && ! Schema::hasColumn('usuarios_excluidos', 'id_equipe')) {
            Schema::table('usuarios_excluidos', function (Blueprint $table): void {
                $table->integer('id_equipe')->nullable()->after('status_atual');
            });
        }

        if (Schema::hasTable('senha') && ! Schema::hasColumn('senha', 'admin_por_lideranca')) {
            Schema::table('senha', function (Blueprint $table): void {
                $table->boolean('admin_por_lideranca')->default(false);
            });

            // Hoje não há como saber quem virou admin só pela liderança; ninguém é marcado,
            // assim nenhum administrador atual perde o acesso.
            DB::table('senha')->update(['admin_por_lideranca' => false]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('usuarios_excluidos', 'id_equipe')) {
            Schema::table('usuarios_excluidos', fn (Blueprint $table) => $table->dropColumn('id_equipe'));
        }

        if (Schema::hasColumn('senha', 'admin_por_lideranca')) {
            Schema::table('senha', fn (Blueprint $table) => $table->dropColumn('admin_por_lideranca'));
        }
    }
};
