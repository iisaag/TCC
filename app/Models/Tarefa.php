<?php

namespace App\Models;

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
        'id_responsavel',
        'prioridade_task',
        'tipo_task',
        'data_inicio',
        'data_prevista_termino',
        'progresso',
        'bloqueada',
        'prazo',
        'status_task',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_prevista_termino' => 'date',
        'prazo' => 'date',
        'bloqueada' => 'boolean',
        'progresso' => 'integer',
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

    public function projeto()
    {
        return $this->belongsTo(Projeto::class, 'id_projeto', 'id_projeto');
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