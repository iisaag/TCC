<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Corrige administradores gravados como "admin" pela tela de Gestão:
     * o login só reconhece "adm".
     */
    public function up(): void
    {
        if (! Schema::hasTable('senha')) {
            return;
        }

        DB::table('senha')
            ->whereIn(DB::raw('LOWER(TRIM(nivel_acesso))'), ['admin', 'administrador', 'total'])
            ->update(['nivel_acesso' => 'adm']);
    }
};
