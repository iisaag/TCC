<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * O script.sql gravava "Alta"/"Média"; a API grava BAIXA, MEDIA ou ALTA.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('projetos')) {
            return;
        }

        DB::table('projetos')
            ->whereNotNull('prioridade_proj')
            ->select(['id_projeto', 'prioridade_proj'])
            ->orderBy('id_projeto')
            ->each(function ($projeto): void {
                $chave = mb_strtoupper(Str::ascii((string) $projeto->prioridade_proj));

                $prioridade = match (true) {
                    str_contains($chave, 'ALTA') => 'ALTA',
                    str_contains($chave, 'BAIXA') => 'BAIXA',
                    str_contains($chave, 'MEDI') => 'MEDIA',
                    default => null,
                };

                if ($prioridade !== $projeto->prioridade_proj) {
                    DB::table('projetos')->where('id_projeto', $projeto->id_projeto)->update(['prioridade_proj' => $prioridade]);
                }
            });
    }

    public function down(): void
    {
        // Os valores antigos eram inconsistentes; não há como restaurá-los.
    }
};
