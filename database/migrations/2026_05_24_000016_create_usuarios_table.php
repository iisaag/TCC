<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('usuarios')) {
            return;
        }

        Schema::create('usuarios', function (Blueprint $table): void {
            $table->increments('id_usuario');
            $table->string('nome', 100);
            $table->string('email', 150)->unique();
            $table->string('telefone', 30)->nullable();
            $table->string('localizacao', 120)->nullable();
            $table->longText('perfil_tags')->nullable();
            $table->longText('perfil_sobre')->nullable();
            $table->longText('foto_perfil')->nullable();
            $table->string('cargo', 100)->nullable();
            $table->string('nivel', 50)->nullable();
            $table->string('status_atual', 50)->nullable();
            $table->timestamp('data_criacao')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
