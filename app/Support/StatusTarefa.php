<?php

namespace App\Support;

/**
 * Regra única de status de tarefa, usada por controllers, dashboard e sprints.
 *
 * Quadro padrão grava códigos canônicos (TO_DO, DOING, TESTE, APROVADO).
 * Quadro personalizado grava o nome da coluna; nesse caso a conclusão vem
 * do progresso da coluna (100%) ou do arquivamento (em_historico).
 */
class StatusTarefa
{
    public const TO_DO = 'TO_DO';
    public const DOING = 'DOING';
    public const TESTE = 'TESTE';
    public const APROVADO = 'APROVADO';

    /** Status textuais que significam "concluída". */
    public const CONCLUIDOS = ['APROVADO', 'CONCLUIDA', 'CONCLUÍDA', 'DONE'];

    private const ALIASES = [
        'TO DO' => self::TO_DO,
        'TODO' => self::TO_DO,
        'TO_DO' => self::TO_DO,
        'A FAZER' => self::TO_DO,
        'DOING' => self::DOING,
        'EM ANDAMENTO' => self::DOING,
        'TESTE' => self::TESTE,
        'EM TESTE' => self::TESTE,
        'REVIEW' => self::TESTE,
        'APROVADO' => self::APROVADO,
        'DONE' => self::APROVADO,
        'CONCLUIDA' => self::APROVADO,
        'CONCLUÍDA' => self::APROVADO,
    ];

    /**
     * Converte apelidos conhecidos para o código canônico. Nomes de colunas
     * personalizadas que não são apelidos são mantidos como estão.
     */
    public static function canonico(?string $status): ?string
    {
        if ($status === null) {
            return null;
        }

        $limpo = trim(preg_replace('/\s+/', ' ', $status));

        if ($limpo === '') {
            return null;
        }

        return self::ALIASES[mb_strtoupper($limpo)] ?? $limpo;
    }

    /** Progresso de cada coluna do quadro padrão; null para colunas personalizadas. */
    public static function progressoPadrao(?string $status): ?int
    {
        return match (self::canonico($status)) {
            self::TO_DO => 0,
            self::DOING => 50,
            self::TESTE => 75,
            self::APROVADO => 100,
            default => null,
        };
    }

    public static function statusConcluido(?string $status): bool
    {
        return $status !== null && in_array(mb_strtoupper(trim($status)), self::CONCLUIDOS, true);
    }

    /**
     * Expressão SQL (sem alias de tabela) que é verdadeira quando a tarefa está concluída.
     */
    public static function sqlConcluida(string $prefixo = ''): string
    {
        $status = implode("','", self::CONCLUIDOS);

        return "(COALESCE({$prefixo}em_historico, 0) = 1"
            . " OR COALESCE({$prefixo}progresso, 0) >= 100"
            . " OR UPPER(TRIM(COALESCE({$prefixo}status_task, ''))) IN ('{$status}'))";
    }

    public static function sqlAberta(string $prefixo = ''): string
    {
        return 'NOT ' . self::sqlConcluida($prefixo);
    }
}
