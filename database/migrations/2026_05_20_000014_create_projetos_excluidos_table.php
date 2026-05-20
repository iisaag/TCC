<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('projetos_excluidos')) {
            return;
        }

        Schema::create('projetos_excluidos', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('id_projeto_original')->nullable();
            $table->string('nome_projeto', 255);
            $table->text('descricao')->nullable();
            $table->date('data_inicio')->nullable();
            $table->date('prazo_final')->nullable();
            $table->string('status_projeto', 100)->nullable();
            $table->string('prioridade_proj', 20)->nullable();
            $table->unsignedInteger('id_responsavel')->nullable();
            $table->unsignedInteger('tarefas_afetadas')->default(0);
            $table->unsignedInteger('metas_afetadas')->default(0);
            $table->dateTime('excluido_em');
            $table->dateTime('expira_em')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projetos_excluidos');
    }
};
