<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sprint extends Model
{
    protected $table = 'sprints';
    protected $primaryKey = 'id_sprint';
    public $timestamps = false;

    protected $fillable = [
        'id_projeto',
        'nome_sprint',
        'data_inicio',
        'data_fim',
        'status_sprint',
        'encerrada_em',
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_fim' => 'date',
        'encerrada_em' => 'datetime',
    ];

    public function projeto()
    {
        return $this->belongsTo(Projeto::class, 'id_projeto', 'id_projeto');
    }

    public function tarefas()
    {
        return $this->hasMany(Tarefa::class, 'id_sprint', 'id_sprint');
    }
}
