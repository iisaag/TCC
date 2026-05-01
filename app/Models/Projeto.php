<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Projeto extends Model
{
    protected $table      = 'projetos';
    protected $primaryKey = 'id_projeto';
    public    $timestamps = false;

    protected $fillable = [
        'nome_projeto',
        'descricao',
        'data_inicio',
        'prazo_final',
        'status_projeto',
        'prioridade_proj',
        'id_responsavel',
    ];

    public function responsavel()
    {
        return $this->belongsTo(Usuario::class, 'id_responsavel', 'id_usuario');
    }

    public function setNomeProjetoAttribute(string $value): void
    {
        $this->attributes['nome_projeto'] = mb_convert_case(
            trim(preg_replace('/\s+/', ' ', $value)),
            MB_CASE_TITLE,
            'UTF-8'
        );
    }

    public function setPrioridadeProjAttribute(?string $value): void
    {
        $this->attributes['prioridade_proj'] = $value ? strtoupper(trim($value)) : null;
    }

    public function metas()
    {
        return $this->hasMany(Meta::class, 'id_projeto', 'id_projeto');
    }
}