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

    /**
     * Motivo que impede tirar o acesso de administrador deste e-mail, ou null se puder.
     */
    public static function bloqueioRemoverAdmin(string $email, ?string $emailDoAutor): ?string
    {
        $registro = static::find($email);

        if (! $registro || $registro->nivel_acesso !== 'adm') {
            return null;
        }

        if ($emailDoAutor !== null && strcasecmp($email, $emailDoAutor) === 0) {
            return 'Você não pode remover o seu próprio acesso de administrador.';
        }

        if (static::query()->where('nivel_acesso', 'adm')->count() <= 1) {
            return 'Não é possível remover o acesso do último administrador do sistema.';
        }

        return null;
    }

    protected static function booted(): void
    {
        // Mudança manual de nível (Gestão) vale como decisão do administrador:
        // a pessoa deixa de ser "admin por liderança" e não é rebaixada sozinha depois.
        static::saving(function (Senha $registro): void {
            if ($registro->exists && $registro->isDirty('nivel_acesso')) {
                $registro->admin_por_lideranca = false;
            }
        });
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'email', 'email');
    }
}
