<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tarefa_usuarios_relacionados', function (Blueprint $table): void {
            $table->integer('id_tarefa');
            $table->integer('id_usuario');

            $table->primary(['id_tarefa', 'id_usuario']);

            $table->foreign('id_tarefa')
                ->references('id_tarefa')
                ->on('tarefas')
                ->onDelete('cascade')
                ->onUpdate('cascade');

            $table->foreign('id_usuario')
                ->references('id_usuario')
                ->on('usuarios')
                ->onDelete('cascade')
                ->onUpdate('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tarefa_usuarios_relacionados');
    }
};
