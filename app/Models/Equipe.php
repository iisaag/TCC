<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Equipe extends Model
{
    protected $table      = 'equipes';
    protected $primaryKey = 'id_equipe';
    public    $timestamps = false;

    protected $fillable = [
        'nome',
        'criado_por',
        'equipe_pai',
        'tipo',
        'id_lider',
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

    public function setTipoAttribute(string $value): void
    {
        $tipo = strtoupper(trim($value));
        if (!in_array($tipo, ['EMPRESA', 'SUBEQUIPE'], true)) {
            throw new \InvalidArgumentException("Tipo inválido: '{$tipo}'. Use 'EMPRESA' ou 'SUBEQUIPE'.");
        }
        $this->attributes['tipo'] = $tipo;
    }

    public function lider()
    {
        return $this->belongsTo(\App\Models\Usuario::class, 'id_lider', 'id_usuario');
    }

    public function criador()
    {
        return $this->belongsTo(\App\Models\Usuario::class, 'criado_por', 'id_usuario');
    }
}