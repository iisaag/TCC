<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Senha extends Model
{
    protected $table      = 'senhas';
    protected $primaryKey = 'email';
    public    $incrementing = false;
    public    $keyType = 'string';
    public    $timestamps = false;

    protected $fillable = [
        'email',
        'senha',
        'nivel_acesso',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'email', 'email');
    }
}
