<?php

use App\Models\Projeto;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A tela não tinha campo de status, então projetos ficavam sem status ou com variações.
 * Padroniza para os valores aceitos; projetos na lixeira não são tocados.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('projetos')) {
            return;
        }

        DB::table('projetos')
            ->whereNull('status_projeto')
            ->orWhere('status_projeto', '')
            ->update(['status_projeto' => 'Planejamento']);

        DB::table('projetos')
            ->where('status_projeto', '!=', Projeto::STATUS_EXCLUIDO)
            ->select(['id_projeto', 'status_projeto'])
            ->orderBy('id_projeto')
            ->each(function ($projeto): void {
                $status = Projeto::normalizarStatus($projeto->status_projeto);

                if (! in_array($status, Projeto::STATUS_PERMITIDOS, true)) {
                    $status = 'Planejamento';
                }

                if ($status !== $projeto->status_projeto) {
                    DB::table('projetos')->where('id_projeto', $projeto->id_projeto)->update(['status_projeto' => $status]);
                }
            });
    }

    public function down(): void
    {
        // Os valores antigos eram inconsistentes; não há como restaurá-los.
    }
};
