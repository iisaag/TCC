<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('sprints') || !Schema::hasTable('projetos')) {
            return;
        }

        Schema::create('sprints', function (Blueprint $table): void {
            $table->increments('id_sprint');
            $table->integer('id_projeto');
            $table->string('nome_sprint', 120);
            $table->date('data_inicio');
            $table->date('data_fim');
            $table->string('status_sprint', 20)->default('ATIVA');
            $table->dateTime('encerrada_em')->nullable();

            $table->foreign('id_projeto')
                ->references('id_projeto')
                ->on('projetos')
                ->cascadeOnDelete();

            $table->index(['id_projeto', 'status_sprint']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sprints');
    }
};
