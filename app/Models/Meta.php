<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Meta extends Model
{
    protected $table      = 'metas';
    protected $primaryKey = 'id_meta';
    public    $timestamps = false;

    protected $fillable = [
        'id_projeto',
        'titulo_meta',
        'prazo_meta',
        'data_conclusao_meta',
        'status_meta',
    ];

    protected $attributes = [
        'status_meta' => 'Pendente',
    ];

    public function setTituloMetaAttribute(string $value): void
    {
        $this->attributes['titulo_meta'] = mb_convert_case(
            trim(preg_replace('/\s+/', ' ', $value)),
            MB_CASE_TITLE,
            'UTF-8'
        );
    }

    public function projeto()
    {
        return $this->belongsTo(Projeto::class, 'id_projeto', 'id_projeto');
    }
}