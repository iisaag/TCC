<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistoricoProgresso extends Model
{
    protected $table      = 'historico_progresso';
    protected $primaryKey = 'id_historico';
    public    $timestamps = false;

    protected $fillable = [
        'id_tarefa',
        'id_usuario',
        'progresso',
        'data_atualizacao',
    ];

    public function tarefa()
    {
        return $this->belongsTo(Tarefa::class, 'id_tarefa', 'id_tarefa');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}
