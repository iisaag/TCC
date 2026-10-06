<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Converte as senhas gravadas em texto puro para hash bcrypt.
     * Não tem down(): um hash não pode voltar a ser a senha original.
     */
    public function up(): void
    {
        if (! Schema::hasTable('senha')) {
            return;
        }

        DB::table('senha')->get(['email', 'senha'])->each(function ($registro): void {
            $senha = (string) $registro->senha;

            if ($senha === '' || preg_match('/^\$(2y|2a|2b|argon2i|argon2id)\$/', $senha) === 1) {
                return;
            }

            DB::table('senha')
                ->where('email', $registro->email)
                ->update(['senha' => Hash::make($senha)]);
        });
    }
};
