<?php

namespace App\Support;

use App\Models\Projeto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Projetos excluídos ficam 7 dias na lixeira (status interno + cópia em projetos_excluidos).
 * Passado o prazo, o projeto e tudo o que depende dele são apagados de vez.
 * Antes, só a cópia era apagada e o projeto ficava no banco para sempre.
 */
class LixeiraProjetos
{
    public static function purgarExpirados(): int
    {
        if (! Schema::hasTable('projetos_excluidos')) {
            return 0;
        }

        $expirados = DB::table('projetos_excluidos')
            ->where('expira_em', '<=', now())
            ->get(['id', 'id_projeto_original']);

        foreach ($expirados as $registro) {
            DB::transaction(function () use ($registro): void {
                $projeto = Projeto::find((int) $registro->id_projeto_original);

                if ($projeto && mb_strtoupper(trim((string) $projeto->status_projeto)) === Projeto::STATUS_EXCLUIDO) {
                    self::apagarDefinitivamente($projeto);
                }

                DB::table('projetos_excluidos')->where('id', $registro->id)->delete();
            });
        }

        return $expirados->count();
    }

    private static function apagarDefinitivamente(Projeto $projeto): void
    {
        $idProjeto = (int) $projeto->id_projeto;
        $idsTarefas = DB::table('tarefas')->where('id_projeto', $idProjeto)->pluck('id_tarefa');

        if ($idsTarefas->isNotEmpty()) {
            DB::table('historico_progresso')->whereIn('id_tarefa', $idsTarefas)->delete();

            if (Schema::hasTable('tarefa_usuarios_relacionados')) {
                DB::table('tarefa_usuarios_relacionados')->whereIn('id_tarefa', $idsTarefas)->delete();
            }

            DB::table('tarefas')->whereIn('id_tarefa', $idsTarefas)->delete();
        }

        foreach (['sprints', 'board_colunas', 'metas', 'log_projeto'] as $tabela) {
            if (Schema::hasTable($tabela)) {
                DB::table($tabela)->where('id_projeto', $idProjeto)->delete();
            }
        }

        $projeto->delete();
    }
}
