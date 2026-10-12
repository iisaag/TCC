<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O model Meta, o MetasController e as rotas /api/metas existiam sem a tabela.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('metas') || ! Schema::hasTable('projetos')) {
            return;
        }

        Schema::create('metas', function (Blueprint $table): void {
            $table->integer('id_meta', true);
            $table->integer('id_projeto');
            $table->string('titulo_meta', 255);
            $table->date('prazo_meta');
            $table->date('data_conclusao_meta')->nullable();
            $table->string('status_meta', 30)->default('Pendente');

            $table->foreign('id_projeto')->references('id_projeto')->on('projetos')->cascadeOnDelete();
            $table->index(['id_projeto', 'status_meta']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metas');
    }
};
