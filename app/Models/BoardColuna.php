<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BoardColuna extends Model
{
    protected $table      = 'board_colunas';
    protected $primaryKey = 'id_coluna';

    protected $fillable = [
        'id_projeto',
        'nome',
        'progresso',
        'ordem',
        'arquiva_ao_concluir',
    ];

    protected $casts = [
        'progresso' => 'integer',
        'ordem' => 'integer',
        'arquiva_ao_concluir' => 'boolean',
    ];

    public function projeto()
    {
        return $this->belongsTo(Projeto::class, 'id_projeto', 'id_projeto');
    }

    public function tarefas()
    {
        return $this->hasMany(Tarefa::class, 'id_coluna', 'id_coluna');
    }
}
