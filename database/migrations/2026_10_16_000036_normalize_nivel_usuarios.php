<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * O nível era digitado à mão e gerava variações como "Junior" e "Júnior".
 * A API agora só aceita Júnior, Pleno ou Sênior.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('usuarios') || ! Schema::hasColumn('usuarios', 'nivel')) {
            return;
        }

        DB::table('usuarios')
            ->whereNotNull('nivel')
            ->select(['id_usuario', 'nivel'])
            ->orderBy('id_usuario')
            ->each(function ($usuario): void {
                $chave = mb_strtolower(trim(Str::ascii((string) $usuario->nivel)));

                $nivel = match (true) {
                    str_contains($chave, 'junior') => 'Júnior',
                    str_contains($chave, 'pleno') => 'Pleno',
                    str_contains($chave, 'senior') => 'Sênior',
                    default => null,
                };

                if ($nivel !== $usuario->nivel) {
                    DB::table('usuarios')->where('id_usuario', $usuario->id_usuario)->update(['nivel' => $nivel]);
                }
            });
    }

    public function down(): void
    {
        // Os valores antigos eram inconsistentes; não há como restaurá-los.
    }
};
