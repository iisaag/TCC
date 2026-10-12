<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Projeto extends Model
{
    /** Status interno de um projeto que está na lixeira (exclusão lógica). */
    public const STATUS_EXCLUIDO = '__EXCLUIDO_TEMP__';

    /** Status de projeto que não contam como ativos. */
    public const STATUS_ENCERRADOS = ['concluído', 'concluido', 'concluida', 'concluída', 'cancelado', 'cancelada'];

    protected $table      = 'projetos';
    protected $primaryKey = 'id_projeto';
    public    $timestamps = false;

    protected $fillable = [
        'nome_projeto',
        'descricao',
        'data_inicio',
        'prazo_final',
        'status_projeto',
        'prioridade_proj',
        'id_responsavel',
        'kanban_padrao',
    ];

    protected $casts = [
        'kanban_padrao' => 'boolean',
    ];

    /** Projetos fora da lixeira. Projetos sem status também entram. */
    public function scopeNaoExcluidos(Builder $query): Builder
    {
        return $query->where(function (Builder $q): void {
            $q->whereNull('status_projeto')
                ->orWhereRaw('UPPER(TRIM(status_projeto)) <> ?', [self::STATUS_EXCLUIDO]);
        });
    }

    /** Projetos fora da lixeira e que não estão concluídos nem cancelados. */
    public function scopeAtivos(Builder $query): Builder
    {
        return $query->naoExcluidos()->where(function (Builder $q): void {
            $q->whereNull('status_projeto')
                ->orWhereNotIn(DB::raw('LOWER(TRIM(status_projeto))'), self::STATUS_ENCERRADOS);
        });
    }

    public function responsavel()
    {
        return $this->belongsTo(Usuario::class, 'id_responsavel', 'id_usuario');
    }

    public function setNomeProjetoAttribute(string $value): void
    {
        $this->attributes['nome_projeto'] = mb_convert_case(
            trim(preg_replace('/\s+/', ' ', $value)),
            MB_CASE_TITLE,
            'UTF-8'
        );
    }

    public function setPrioridadeProjAttribute(?string $value): void
    {
        $this->attributes['prioridade_proj'] = $value ? strtoupper(trim($value)) : null;
    }

    public function metas()
    {
        return $this->hasMany(Meta::class, 'id_projeto', 'id_projeto');
    }

    public function sprints()
    {
        return $this->hasMany(Sprint::class, 'id_projeto', 'id_projeto');
    }

    public function colunas()
    {
        return $this->hasMany(BoardColuna::class, 'id_projeto', 'id_projeto')->orderBy('ordem');
    }
}