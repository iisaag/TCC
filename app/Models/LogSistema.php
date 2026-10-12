<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Usuario;  // ← adiciona isso

class LogSistema extends Model
{
    protected $table      = 'log_sistema';
    protected $primaryKey = 'id_log_sistema';
    public    $timestamps = false;

    protected $fillable = [
        'id_usuario',
        'acao',
        'descricao',
        'data_hora',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'id_usuario', 'id_usuario');
    }
}