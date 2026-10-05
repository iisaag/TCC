<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('board_colunas') || !Schema::hasTable('projetos')) {
            return;
        }

        Schema::create('board_colunas', function (Blueprint $table): void {
            $table->increments('id_coluna');
            $table->integer('id_projeto');
            $table->string('nome', 100);
            $table->unsignedTinyInteger('progresso')->default(0);
            $table->unsignedInteger('ordem')->default(0);
            $table->boolean('arquiva_ao_concluir')->default(false);
            $table->timestamps();

            $table->foreign('id_projeto')
                ->references('id_projeto')
                ->on('projetos')
                ->cascadeOnDelete();

            $table->index(['id_projeto', 'ordem']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('board_colunas');
    }
};
