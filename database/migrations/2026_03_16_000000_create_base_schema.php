<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Esquema base do sistema, no formato original do database/script.sql.
 *
 * Em bancos já importados pelo script.sql as tabelas existem e nada é feito.
 * Em um banco vazio (instalação nova ou testes automatizados), cria as
 * tabelas para que as migrations seguintes completem o esquema atual.
 * As chaves são INT com sinal para casar com as colunas das migrations seguintes.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cargos')) {
            Schema::create('cargos', function (Blueprint $table): void {
                $table->integer('id_cargo', true);
                $table->string('nome_cargo', 100)->unique();
            });
        }

        if (! Schema::hasTable('usuarios')) {
            Schema::create('usuarios', function (Blueprint $table): void {
                $table->integer('id_usuario', true);
                $table->string('nome', 100);
                $table->string('email', 150)->unique();
                $table->string('telefone', 30)->nullable();
                $table->string('localizacao', 120)->nullable();
                $table->text('perfil_tags')->nullable();
                $table->text('perfil_sobre')->nullable();
                $table->longText('foto_perfil')->nullable();
                $table->string('cargo', 100)->nullable();
                $table->string('nivel', 50)->nullable();
                $table->string('status_atual', 40)->nullable()->default('online');
                $table->dateTime('data_criacao')->useCurrent();

                $table->foreign('cargo')->references('nome_cargo')->on('cargos')->cascadeOnUpdate();
            });
        }

        if (! Schema::hasTable('senha')) {
            Schema::create('senha', function (Blueprint $table): void {
                $table->string('email', 150)->primary();
                $table->string('senha', 255);
                $table->string('nivel_acesso', 50);

                $table->foreign('email')->references('email')->on('usuarios')->cascadeOnUpdate()->cascadeOnDelete();
            });
        }

        if (! Schema::hasTable('equipes')) {
            Schema::create('equipes', function (Blueprint $table): void {
                $table->integer('id_equipe', true);
                $table->string('nome', 100);
                $table->integer('criado_por')->nullable();
                $table->integer('equipe_pai')->nullable();
                $table->string('tipo', 50)->nullable();
                $table->dateTime('data_criacao')->useCurrent();

                $table->foreign('criado_por')->references('id_usuario')->on('usuarios');
                $table->foreign('equipe_pai')->references('id_equipe')->on('equipes');
            });
        }

        if (! Schema::hasTable('projetos')) {
            Schema::create('projetos', function (Blueprint $table): void {
                $table->integer('id_projeto', true);
                $table->string('nome_projeto', 150);
                $table->text('descricao')->nullable();
                $table->date('data_inicio')->nullable();
                $table->date('prazo_final')->nullable();
                $table->string('status_projeto', 50)->nullable();
                $table->string('prioridade_proj', 15)->nullable();
            });
        }

        if (! Schema::hasTable('tarefas')) {
            Schema::create('tarefas', function (Blueprint $table): void {
                $table->integer('id_tarefa', true);
                $table->string('titulo', 150);
                $table->text('descricao')->nullable();
                $table->integer('id_projeto')->nullable();
                $table->integer('id_responsavel')->nullable();
                $table->string('prioridade_task', 15)->nullable();
                $table->date('prazo')->nullable();
                $table->string('status_task', 50)->nullable();

                $table->foreign('id_projeto')->references('id_projeto')->on('projetos');
                $table->foreign('id_responsavel')->references('id_usuario')->on('usuarios');
            });
        }

        if (! Schema::hasTable('historico_progresso')) {
            Schema::create('historico_progresso', function (Blueprint $table): void {
                $table->integer('id_historico', true);
                $table->integer('id_tarefa')->nullable();
                $table->integer('progresso')->nullable();
                $table->dateTime('data_atualizacao')->useCurrent();
                $table->integer('id_usuario')->nullable();

                $table->foreign('id_tarefa')->references('id_tarefa')->on('tarefas');
                $table->foreign('id_usuario')->references('id_usuario')->on('usuarios');
            });
        }

        if (! Schema::hasTable('log_projeto')) {
            Schema::create('log_projeto', function (Blueprint $table): void {
                $table->integer('id_log_projeto', true);
                $table->integer('id_projeto')->nullable();
                $table->integer('id_usuario')->nullable();
                $table->text('mensagem')->nullable();
                $table->dateTime('data_hora')->useCurrent();

                $table->foreign('id_projeto')->references('id_projeto')->on('projetos');
                $table->foreign('id_usuario')->references('id_usuario')->on('usuarios');
            });
        }

        if (! Schema::hasTable('log_sistema')) {
            Schema::create('log_sistema', function (Blueprint $table): void {
                $table->integer('id_log_sistema', true);
                $table->integer('id_usuario')->nullable();
                $table->string('acao', 200)->nullable();
                $table->text('descricao')->nullable();
                $table->dateTime('data_hora')->useCurrent();

                $table->foreign('id_usuario')->references('id_usuario')->on('usuarios');
            });
        }
    }

    public function down(): void
    {
        // As tabelas base guardam os dados do sistema; não são removidas no rollback.
    }
};
