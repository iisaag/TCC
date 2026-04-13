<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class Senha extends Model
{
    protected $table      = 'senha';
    protected $primaryKey = 'email';
    public    $incrementing = false;
    public    $keyType = 'string';
    public    $timestamps = false;

    protected $fillable = [
        'email',
        'senha',
        'nivel_acesso',
    ];

    public function setSenhaAttribute(string $value): void
    {
        $this->attributes['senha'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'email', 'email');
    }
}
