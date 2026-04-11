<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Projeto;  
use App\Models\Usuario;  
class LogProjeto extends Model
{
    protected $table      = 'log_projetos';
    protected $primaryKey = 'id_log_projeto';
    public    $timestamps = false;

    protected $fillable = [
        'id_projeto',
        'id_usuario',
        'mensagem',
        'data_hora',
    ];

    public function projeto()
    {
        return $this->belongsTo(Projeto::class, 'id_projeto', 'id_projeto');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}
