<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cargo extends Model
{
    protected $table      = 'cargos';
    protected $primaryKey = 'id_cargo';
    public    $timestamps = false;

    protected $fillable = ['nome_cargo'];

    public function setNomeCargoAttribute(string $value): void
    {
        $this->attributes['nome_cargo'] = mb_convert_case(
            trim(preg_replace('/\s+/', ' ', $value)),
            MB_CASE_TITLE,
            'UTF-8'
        );
    }
}