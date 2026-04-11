<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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

    public function cargo()
    {
         return $this->belongsTo('App\Models\Cargo', 'cargo', 'nome_cargo');
    }
}