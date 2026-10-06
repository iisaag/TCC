<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ao renomear um cargo, o novo nome passa automaticamente para os funcionários.
     */
    public function up(): void
    {
        $this->recreateCargoForeignKey('CASCADE');
    }

    public function down(): void
    {
        $this->recreateCargoForeignKey('NO ACTION');
    }

    private function recreateCargoForeignKey(string $onUpdate): void
    {
        if (! Schema::hasTable('usuarios') || ! Schema::hasTable('cargos')) {
            return;
        }

        $constraints = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'usuarios')
            ->where('COLUMN_NAME', 'cargo')
            ->where('REFERENCED_TABLE_NAME', 'cargos')
            ->pluck('CONSTRAINT_NAME');

        foreach ($constraints as $constraint) {
            DB::statement("ALTER TABLE usuarios DROP FOREIGN KEY `{$constraint}`");
        }

        DB::statement(
            "ALTER TABLE usuarios ADD CONSTRAINT usuarios_cargo_foreign
             FOREIGN KEY (cargo) REFERENCES cargos(nome_cargo)
             ON DELETE NO ACTION ON UPDATE {$onUpdate}"
        );
    }
};
