<?php

namespace App\Models;

use App\Support\StatusTarefa;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Tarefa extends Model
{
    protected $table      = 'tarefas';
    protected $primaryKey = 'id_tarefa';
    public    $timestamps = false;

    protected $fillable = [
        'titulo',
        'descricao',
        'id_projeto',
        'id_sprint',
        'id_responsavel',
        'prioridade_task',
        'tipo_task',
        'data_inicio',
        'data_prevista_termino',
        'progresso',
        'bloqueada',
        'prazo',
        'status_task',
        'em_historico',
        'id_coluna',
        'concluida_em',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_prevista_termino' => 'date',
        'prazo' => 'date',
        'bloqueada' => 'boolean',
        'progresso' => 'integer',
        'em_historico' => 'boolean',
        'concluida_em' => 'datetime',
    ];

    public function setTituloAttribute(string $value): void
    {
        $this->attributes['titulo'] = mb_convert_case(
            trim(preg_replace('/\s+/', ' ', $value)),
            MB_CASE_TITLE,
            'UTF-8'
        );
    }

    public function setPrioridadeTaskAttribute(?string $value): void
    {
        $this->attributes['prioridade_task'] = $value ? strtoupper(trim($value)) : null;
    }

    public function setStatusTaskAttribute(?string $value): void
    {
        $this->attributes['status_task'] = StatusTarefa::canonico($value);
    }

    public function estaConcluida(): bool
    {
        return (bool) $this->em_historico
            || (int) ($this->progresso ?? 0) >= 100
            || StatusTarefa::statusConcluido($this->status_task);
    }

    protected static function booted(): void
    {
        // Registra quando a tarefa foi concluída, para métricas por período.
        static::saving(function (Tarefa $tarefa): void {
            if ($tarefa->estaConcluida()) {
                $tarefa->concluida_em ??= now();
            } else {
                $tarefa->concluida_em = null;
            }
        });
    }

    /** Ignora tarefas de projetos que estão na lixeira. */
    public function scopeDeProjetosAtivos(Builder $query): Builder
    {
        return $query->where(function (Builder $q): void {
            $q->whereNull('tarefas.id_projeto')
                ->orWhereIn('tarefas.id_projeto', Projeto::query()->naoExcluidos()->select('id_projeto'));
        });
    }

    public function scopeConcluidas(Builder $query): Builder
    {
        return $query->whereRaw(StatusTarefa::sqlConcluida('tarefas.'));
    }

    public function scopeAbertas(Builder $query): Builder
    {
        return $query->whereRaw(StatusTarefa::sqlAberta('tarefas.'));
    }

    public function projeto()
    {
        return $this->belongsTo(Projeto::class, 'id_projeto', 'id_projeto');
    }

    public function sprint()
    {
        return $this->belongsTo(Sprint::class, 'id_sprint', 'id_sprint');
    }

    public function coluna()
    {
        return $this->belongsTo(BoardColuna::class, 'id_coluna', 'id_coluna');
    }

    public function responsavel()
    {
        return $this->belongsTo(Usuario::class, 'id_responsavel', 'id_usuario');
    }

    public function relacionados()
    {
        return $this->belongsToMany(
            Usuario::class,
            'tarefa_usuarios_relacionados',
            'id_tarefa',
            'id_usuario'
        );
    }
}