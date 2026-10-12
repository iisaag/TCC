<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índices para as consultas que rodam a todo momento (presença e notificações)
 * e para os filtros do dashboard.
 */
return new class extends Migration
{
    private const INDICES = [
        'user_presences' => [['last_seen'], ['user_id']],
        'notificacoes_usuario' => [['id_destinatario', 'criado_em']],
        'log_sistema' => [['data_hora']],
        'log_projeto' => [['id_projeto', 'data_hora']],
        'sprints' => [['id_projeto', 'status_sprint']],
    ];

    public function up(): void
    {
        foreach (self::INDICES as $tabela => $indices) {
            if (! Schema::hasTable($tabela)) {
                continue;
            }

            foreach ($indices as $colunas) {
                if (Schema::hasIndex($tabela, $colunas)) {
                    continue;
                }

                Schema::table($tabela, fn (Blueprint $table) => $table->index($colunas));
            }
        }
    }

    public function down(): void
    {
        foreach (self::INDICES as $tabela => $indices) {
            if (! Schema::hasTable($tabela)) {
                continue;
            }

            foreach ($indices as $colunas) {
                $nome = $tabela . '_' . implode('_', $colunas) . '_index';

                if (Schema::hasIndex($tabela, $nome)) {
                    Schema::table($tabela, fn (Blueprint $table) => $table->dropIndex($nome));
                }
            }
        }
    }
};
