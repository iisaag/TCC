<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('usuarios_excluidos')) {
            return;
        }

        Schema::create('usuarios_excluidos', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('id_usuario_original')->nullable();
            $table->string('nome', 100);
            $table->string('email', 150);
            $table->string('telefone', 30)->nullable();
            $table->string('localizacao', 120)->nullable();
            $table->longText('foto_perfil')->nullable();
            $table->string('cargo', 100)->nullable();
            $table->string('nivel', 50)->nullable();
            $table->string('status_atual', 40)->nullable();
            $table->string('nivel_acesso', 50)->default('usuario');
            $table->string('senha_hash', 255)->nullable();
            $table->unsignedInteger('projetos_afetados')->default(0);
            $table->unsignedInteger('equipes_afetadas')->default(0);
            $table->dateTime('excluido_em');
            $table->dateTime('expira_em')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios_excluidos');
    }
};
