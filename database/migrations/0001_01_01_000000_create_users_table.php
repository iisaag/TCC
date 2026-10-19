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
        // O sistema usa a tabela "usuarios" e login próprio por sessão (SenhaController);
        // a tabela "users" padrão do Laravel não é criada.
        $this->criarSeNaoExistir('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        $this->criarSeNaoExistir('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
