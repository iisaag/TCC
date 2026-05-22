<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Notificacoes
{
    public static function logSistema(?int $autorId, string $acao, string $descricao): void
    {
        if ($autorId === null || $autorId <= 0 || !Schema::hasTable('log_sistema')) {
            return;
        }

        DB::table('log_sistema')->insert([
            'id_usuario' => $autorId,
            'acao' => $acao,
            'descricao' => $descricao,
            'data_hora' => now(),
        ]);
    }

    public static function logProjeto(?int $autorId, ?int $projetoId, string $mensagem): void
    {
        if (
            $autorId === null ||
            $autorId <= 0 ||
            $projetoId === null ||
            $projetoId <= 0 ||
            !Schema::hasTable('log_projeto')
        ) {
            return;
        }

        DB::table('log_projeto')->insert([
            'id_projeto' => $projetoId,
            'id_usuario' => $autorId,
            'mensagem' => $mensagem,
            'data_hora' => now(),
        ]);
    }

    public static function paraUsuarios(
        array $destinatarios,
        ?int $autorId,
        string $tipo,
        string $titulo,
        string $mensagem,
        ?string $url = null
    ): void {
        if (!Schema::hasTable('notificacoes_usuario')) {
            return;
        }

        $ids = collect($destinatarios)
            ->map(static fn ($id): int => (int) $id)
            ->filter(static function (int $id) use ($autorId): bool {
                if ($id <= 0) {
                    return false;
                }

                if ($autorId !== null && $autorId > 0 && $id === $autorId) {
                    return false;
                }

                return true;
            })
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return;
        }

        $now = now();

        $rows = $ids->map(static fn (int $destinatarioId): array => [
            'id_destinatario' => $destinatarioId,
            'id_autor' => $autorId,
            'tipo' => $tipo,
            'titulo' => $titulo,
            'mensagem' => $mensagem,
            'url' => $url,
            'criado_em' => $now,
            'lida_em' => null,
        ])->all();

        DB::table('notificacoes_usuario')->insert($rows);
    }
}
