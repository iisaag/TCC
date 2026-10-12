<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * O database/script.sql já cria estas tabelas; sem esta checagem,
     * "php artisan migrate" falhava depois de importar o script.
     */
    private function criarSeNaoExistir(string $tabela, \Closure $definicao): void
    {
        if (! Schema::hasTable($tabela)) {
            Schema::create($tabela, $definicao);
        }
    }
    public function up(): void
    {
        $this->criarSeNaoExistir('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->bigInteger('expiration')->index();
        });

        $this->criarSeNaoExistir('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->bigInteger('expiration')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cache');
        Schema::dropIfExists('cache_locks');
    }
};
