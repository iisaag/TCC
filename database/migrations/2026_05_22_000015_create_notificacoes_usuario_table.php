<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('notificacoes_usuario') || !Schema::hasTable('usuarios')) {
            return;
        }

        Schema::create('notificacoes_usuario', function (Blueprint $table): void {
            $table->increments('id_notificacao');
            $table->integer('id_destinatario');
            $table->integer('id_autor')->nullable();
            $table->string('tipo', 80)->default('geral');
            $table->string('titulo', 180);
            $table->text('mensagem');
            $table->string('url', 255)->nullable();
            $table->dateTime('criado_em')->useCurrent();
            $table->dateTime('lida_em')->nullable();

            $table->index(['id_destinatario', 'criado_em']);
            $table->index(['id_destinatario', 'lida_em']);

            $table->foreign('id_destinatario')
                ->references('id_usuario')
                ->on('usuarios')
                ->onDelete('cascade')
                ->onUpdate('cascade');

            $table->foreign('id_autor')
                ->references('id_usuario')
                ->on('usuarios')
                ->onDelete('set null')
                ->onUpdate('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificacoes_usuario');
    }
};
