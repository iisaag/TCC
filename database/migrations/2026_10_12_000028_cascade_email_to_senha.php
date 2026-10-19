<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ao trocar o e-mail de um funcionário, o registro de acesso (senha) acompanha.
 * Antes, a chave estrangeira bloqueava a troca com erro 1451.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->recreateEmailForeignKey('CASCADE', 'CASCADE');
    }

    public function down(): void
    {
        $this->recreateEmailForeignKey('NO ACTION', 'NO ACTION');
    }

    private function recreateEmailForeignKey(string $onUpdate, string $onDelete): void
    {
        // Em outros bancos a chave já nasce com CASCADE na migration do esquema base.
        if (DB::getDriverName() !== 'mysql' || ! Schema::hasTable('senha') || ! Schema::hasTable('usuarios')) {
            return;
        }

        $constraints = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'senha')
            ->where('COLUMN_NAME', 'email')
            ->where('REFERENCED_TABLE_NAME', 'usuarios')
            ->pluck('CONSTRAINT_NAME');

        foreach ($constraints as $constraint) {
            DB::statement("ALTER TABLE senha DROP FOREIGN KEY `{$constraint}`");
        }

        DB::statement(
            "ALTER TABLE senha ADD CONSTRAINT senha_email_foreign
             FOREIGN KEY (email) REFERENCES usuarios(email)
             ON DELETE {$onDelete} ON UPDATE {$onUpdate}"
        );
    }
};
