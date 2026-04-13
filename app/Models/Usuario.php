<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Usuario extends Model
{
    protected $table      = 'usuarios';
    protected $primaryKey = 'id_usuario';
    public    $timestamps = false;

    protected $fillable = [
        'nome',
        'email',
        'foto_perfil',
        'cargo',
        'nivel',
        'status_atual',
        'data_criacao',
    ];

    public function setNomeAttribute(string $value): void
    {
        $this->attributes['nome'] = mb_convert_case(
            trim(preg_replace('/\s+/', ' ', $value)),
            MB_CASE_TITLE,
            'UTF-8'
        );
    }

    public function setEmailAttribute(string $value): void
    {
        $this->attributes['email'] = strtolower(trim($value));
    }

    public function setFotoPerfilAttribute(?string $value): void
    {
        $this->attributes['foto_perfil'] = $value === null || $value === ''
            ? null
            : Crypt::encryptString($value);
    }

    public function getFotoPerfilAttribute(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    public function cargo()
    {
         return $this->belongsTo('App\Models\Cargo', 'cargo', 'nome_cargo');
    }
}