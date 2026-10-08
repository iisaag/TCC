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

    protected $hidden = [
        'senha',
    ];

    public function setSenhaAttribute(string $value): void
    {
        $this->attributes['senha'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
    }

    /**
     * O login reconhece apenas "adm"; a tela de Gestão envia "admin".
     */
    public function setNivelAcessoAttribute(?string $value): void
    {
        $nivel = strtolower(trim((string) $value));

        $this->attributes['nivel_acesso'] = in_array($nivel, ['adm', 'admin', 'administrador', 'total'], true)
            ? 'adm'
            : 'usuario';
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'email', 'email');
    }
}
